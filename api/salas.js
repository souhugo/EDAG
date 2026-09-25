// Recebe a situação de cada sala (POST) e entrega a lista para o painel (GET).
// Os dados ficam no Upstash Redis conectado ao projeto na Vercel, numa chave
// por dia que expira sozinha depois de 2 dias.

const { redis, configurado, lerCorpo } = require('./_redis');

const OPCOES = ['opcao1', 'opcao2', 'sem-saida'];
const DOIS_DIAS = 2 * 24 * 60 * 60;

function diaAtual() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function chaveDoDia() {
  return `edag:salas:${diaAtual()}`;
}

// Opções de banheiro definidas pela coordenação no painel, por sala
function chaveAjustes() {
  return `edag:ajustes:${diaAtual()}`;
}

function lerMapa(campos) {
  const mapa = {};
  for (let i = 0; i < (campos || []).length; i += 2) {
    try {
      mapa[campos[i]] = JSON.parse(campos[i + 1]);
    } catch (e) {}
  }
  return mapa;
}

function lerStatus(corpo) {
  if (!corpo || typeof corpo !== 'object') return null;
  const { id, sala, inicio, opcao } = corpo;
  // Momento em que a sala escolheu a opção atual (para saber se a do painel é mais nova)
  const opcaoEm = Number.isFinite(corpo.opcaoEm) ? corpo.opcaoEm : 0;
  if (typeof id !== 'string' || !/^[a-z0-9]{4,40}$/i.test(id)) return null;
  if (typeof sala !== 'string' || !sala.trim() || sala.length > 20) return null;
  if (inicio !== null && !Number.isFinite(inicio)) return null;
  if (opcao !== null && !OPCOES.includes(opcao)) return null;
  return { id, sala: sala.trim(), inicio, opcao, opcaoEm };
}

// A coordenação troca a opção de banheiro de uma sala (exige PAINEL_CODIGO)
async function ajustarOpcao(corpo, res) {
  const codigo = process.env.PAINEL_CODIGO;
  if (!codigo) {
    return res.status(403).json({ erro: 'Para alterar pelo painel, defina a variável PAINEL_CODIGO na Vercel.' });
  }
  if (corpo.codigo !== codigo) {
    return res.status(401).json({ erro: 'Código de acesso inválido.' });
  }
  const { sala, opcao } = corpo;
  if (typeof sala !== 'string' || !sala.trim() || sala.length > 20 || !OPCOES.includes(opcao)) {
    return res.status(400).json({ erro: 'Dados inválidos.' });
  }
  const nomeSala = sala.trim().toLowerCase();
  const ajuste = { opcao, em: Date.now() };
  await redis(['HSET', chaveAjustes(), nomeSala, JSON.stringify(ajuste)]);
  await redis(['EXPIRE', chaveAjustes(), DOIS_DIAS]);

  // Atualiza já a situação guardada, para o painel mostrar a nova opção sem esperar a sala
  const registros = lerMapa(await redis(['HGETALL', chaveDoDia()]));
  for (const [id, registro] of Object.entries(registros)) {
    if (registro.sala && registro.sala.toLowerCase() === nomeSala) {
      await redis(['HSET', chaveDoDia(), id, JSON.stringify({ ...registro, opcao })]);
    }
  }
  return res.status(200).json({ ajuste });
}

// /api/salas?diagnostico=1 mostra se o banco está configurado e respondendo,
// sem revelar credenciais nem dados das salas
async function diagnosticar() {
  const resultado = {
    banco: configurado ? 'configurado' : 'faltando variáveis KV_REST_API_URL / KV_REST_API_TOKEN',
    dia: chaveDoDia().split(':').pop()
  };
  if (configurado) {
    try {
      resultado.conexao = (await redis(['PING'])) === 'PONG' ? 'ok' : 'resposta inesperada';
      resultado.salasHoje = await redis(['HLEN', chaveDoDia()]);
    } catch (e) {
      resultado.conexao = `erro: ${e.message}`;
    }
  }
  return resultado;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET' && req.query && req.query.diagnostico) {
    return res.status(200).json(await diagnosticar());
  }
  if (!configurado) {
    return res.status(500).json({ erro: 'Banco de dados não configurado.' });
  }

  try {
    if (req.method === 'POST') {
      const corpo = lerCorpo(req);
      if (corpo && corpo.acao === 'ajustar-opcao') return ajustarOpcao(corpo, res);

      const status = lerStatus(corpo);
      if (!status) return res.status(400).json({ erro: 'Dados inválidos.' });
      const chave = chaveDoDia();
      const { id, opcaoEm, ...dados } = status;
      await redis(['HSET', chave, id, JSON.stringify({ ...dados, visto: Date.now() })]);
      await redis(['EXPIRE', chave, DOIS_DIAS]);

      // Se a coordenação trocou a opção depois da última escolha da sala, avisa a sala
      const salvo = await redis(['HGET', chaveAjustes(), dados.sala.toLowerCase()]);
      if (salvo) {
        const ajuste = JSON.parse(salvo);
        if (ajuste.em > opcaoEm && ajuste.opcao !== dados.opcao) {
          return res.status(200).json({ ajuste });
        }
      }
      return res.status(204).end();
    }

    if (req.method === 'GET') {
      // Com a variável PAINEL_CODIGO definida na Vercel, o painel pede esse código
      const codigo = process.env.PAINEL_CODIGO;
      if (codigo && req.query.codigo !== codigo) {
        return res.status(401).json({ erro: 'Código de acesso inválido.' });
      }
      const registros = lerMapa(await redis(['HGETALL', chaveDoDia()]));
      const salas = Object.entries(registros).map(([id, registro]) => ({ id, ...registro }));
      const ajustes = lerMapa(await redis(['HGETALL', chaveAjustes()]));
      return res.status(200).json({ agora: Date.now(), salas, ajustes });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ erro: 'Método não permitido.' });
  } catch (e) {
    return res.status(502).json({ erro: `Falha ao acessar o banco de dados: ${e.message}` });
  }
};
