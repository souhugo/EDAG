// Lista de salas do exame, editável pelo painel.
// GET devolve a lista salva (ou null, e as páginas usam a lista padrão do comum.js).
// POST grava uma nova lista e exige o código do painel (variável PAINEL_CODIGO).

const { redis, configurado, lerCorpo } = require('./_redis');

const CHAVE = 'edag:config:salas';
const MAXIMO_SALAS = 200;

function lerLista(salas) {
  if (!Array.isArray(salas) || salas.length > MAXIMO_SALAS) return null;
  const vistas = new Set();
  const lista = [];
  for (const item of salas) {
    if (typeof item !== 'string') return null;
    const nome = item.trim();
    if (!nome || nome.length > 20 || !/^[\p{L}\p{N} ._-]+$/u.test(nome)) return null;
    const chave = nome.toLowerCase();
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    lista.push(nome);
  }
  return lista;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!configurado) {
    return res.status(500).json({ erro: 'Banco de dados não configurado.' });
  }

  try {
    if (req.method === 'GET') {
      const salvo = await redis(['GET', CHAVE]);
      return res.status(200).json({ salas: salvo ? JSON.parse(salvo) : null });
    }

    if (req.method === 'POST') {
      const codigo = process.env.PAINEL_CODIGO;
      if (!codigo) {
        return res.status(403).json({ erro: 'Para editar a lista, defina a variável PAINEL_CODIGO na Vercel.' });
      }
      const corpo = lerCorpo(req) || {};
      if (corpo.codigo !== codigo) {
        return res.status(401).json({ erro: 'Código de acesso inválido.' });
      }
      const lista = lerLista(corpo.salas);
      if (!lista) {
        return res.status(400).json({ erro: 'Lista inválida: use até 20 caracteres por sala (letras, números, espaço, ponto, hífen).' });
      }
      await redis(['SET', CHAVE, JSON.stringify(lista)]);
      return res.status(200).json({ salas: lista });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ erro: 'Método não permitido.' });
  } catch (e) {
    return res.status(502).json({ erro: `Falha ao acessar o banco de dados: ${e.message}` });
  }
};
