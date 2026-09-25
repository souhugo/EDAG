// Acesso ao Upstash Redis conectado ao projeto na Vercel.
// Arquivos da pasta api que começam com "_" não viram endereços do site.

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const configurado = Boolean(REDIS_URL && REDIS_TOKEN);

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

// O corpo do POST pode chegar já interpretado ou como texto JSON
function lerCorpo(req) {
  if (typeof req.body !== 'string') return req.body;
  try {
    return JSON.parse(req.body);
  } catch (e) {
    return null;
  }
}

module.exports = { redis, configurado, lerCorpo };
