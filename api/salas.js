// Recebe a situação de cada sala (POST) e entrega a lista para o painel (GET).
// Os dados ficam no Upstash Redis conectado ao projeto na Vercel, numa chave
// por dia que expira sozinha depois de 2 dias.

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const OPCOES = ['opcao1', 'opcao2', 'sem-saida'];
const DOIS_DIAS = 2 * 24 * 60 * 60;

async function redis(comando) {
  const resposta = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: JSON.stringify(comando)
  });
  const dados = await resposta.json();
  if (dados.error) throw new Error(dados.error);
  return dados.result;
}

function chaveDoDia() {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  return `edag:salas:${dia}`;
}

function lerStatus(corpo) {
  if (!corpo || typeof corpo !== 'object') return null;
  const { id, sala, inicio, opcao } = corpo;
  if (typeof id !== 'string' || !/^[a-z0-9]{4,40}$/i.test(id)) return null;
  if (typeof sala !== 'string' || !sala.trim() || sala.length > 20) return null;
  if (inicio !== null && !Number.isFinite(inicio)) return null;
  if (opcao !== null && !OPCOES.includes(opcao)) return null;
  return { id, sala: sala.trim(), inicio, opcao };
}

// /api/salas?diagnostico=1 mostra se o banco está configurado e respondendo,
// sem revelar credenciais nem dados das salas
async function diagnosticar() {
  const resultado = {
    banco: REDIS_URL && REDIS_TOKEN ? 'configurado' : 'faltando variáveis KV_REST_API_URL / KV_REST_API_TOKEN',
    dia: chaveDoDia().split(':').pop()
  };
  if (REDIS_URL && REDIS_TOKEN) {
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
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ erro: 'Banco de dados não configurado.' });
  }

  try {
    if (req.method === 'POST') {
      let corpo = req.body;
      if (typeof corpo === 'string') {
        try {
          corpo = JSON.parse(corpo);
        } catch (e) {
          corpo = null;
        }
      }
      const status = lerStatus(corpo);
      if (!status) return res.status(400).json({ erro: 'Dados inválidos.' });
      const chave = chaveDoDia();
      const { id, ...dados } = status;
      await redis(['HSET', chave, id, JSON.stringify({ ...dados, visto: Date.now() })]);
      await redis(['EXPIRE', chave, DOIS_DIAS]);
      return res.status(204).end();
    }

    if (req.method === 'GET') {
      // Com a variável PAINEL_CODIGO definida na Vercel, o painel pede esse código
      const codigo = process.env.PAINEL_CODIGO;
      if (codigo && req.query.codigo !== codigo) {
        return res.status(401).json({ erro: 'Código de acesso inválido.' });
      }
      const campos = (await redis(['HGETALL', chaveDoDia()])) || [];
      const salas = [];
      for (let i = 0; i < campos.length; i += 2) {
        try {
          salas.push({ id: campos[i], ...JSON.parse(campos[i + 1]) });
        } catch (e) {}
      }
      return res.status(200).json({ agora: Date.now(), salas });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ erro: 'Método não permitido.' });
  } catch (e) {
    return res.status(502).json({ erro: `Falha ao acessar o banco de dados: ${e.message}` });
  }
};
