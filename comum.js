// Regras e funções usadas pela página da sala (index.html) e pelo painel (painel.html)

const TIMEZONE = 'America/Sao_Paulo';
// Início usado antes de clicar em "Iniciar prova"
const INICIO_PREVISTO = { hora: 14, minuto: 0 };
// Minutos finais em que o tempo restante fica em destaque
const MINUTOS_AVISO = 15;

// Duração de cada tipo de prova, em minutos
const PROVAS = [
  { tipo: 'Tipo I', duracao: 90 },
  { tipo: 'Tipo II', duracao: 120 },
  { tipo: 'Tipo III', duracao: 150 },
  { tipo: 'Tipo IV', duracao: 180 },
  { tipo: 'Tipo V', duracao: 210 },
  { tipo: 'Tipo VI', duracao: 240 },
  { tipo: 'Tipo VII', duracao: 240 }
];

// Janelas de saída para o banheiro (horários fixos)
const OPCOES_JANELAS = {
  opcao1: [
    { nome: 'Janela 1', inicio: '15:30', fim: '16:00' },
    { nome: 'Janela 2', inicio: '16:30', fim: '17:00' }
  ],
  opcao2: [
    { nome: 'Janela 1', inicio: '16:00', fim: '16:30' },
    { nome: 'Janela 2', inicio: '17:00', fim: '17:30' }
  ],
  'sem-saida': []
};

// Salas do exame. Com a lista preenchida, o campo "Sala" vira uma lista
// suspensa e o painel mostra também as salas que ainda não se conectaram.
// Na lista suspensa, as salas são agrupadas pelo prédio (texto antes do primeiro "-").
const SALAS = [
  'CIM4-1-01', 'CIM4-1-02', 'CIM4-1-03', 'CIM4-1-04', 'CIM4-1-05', 'CIM4-1-06', 'CIM4-1-07', 'CIM4-1-08',
  'CIM2-3-01', 'CIM2-3-03', 'CIM2-3-05', 'CIM2-3-06', 'CIM2-3-09',
  'CIM2-2-01', 'CIM2-2-02', 'CIM2-2-03', 'CIM2-2-04', 'CIM2-2-05', 'CIM2-2-06', 'CIM2-2-08', 'CIM2-2-09', 'CIM2-2-10',
  'CIM5-4-01', 'CIM5-4-02', 'CIM5-4-04', 'CIM5-4-06', 'CIM5-4-07', 'CIM5-4-08', 'CIM5-4-09', 'CIM5-4-10', 'CIM5-4-11', 'CIM5-4-12', 'CIM5-4-14', 'CIM5-4-15',
  'SESI-101', 'SESI-102', 'SESI-103', 'SESI-104', 'SESI-105', 'SESI-106', 'SESI-107', 'SESI-108', 'SESI-109', 'SESI-110', 'SESI-111', 'SESI-112'
];

// Lista padrão, usada enquanto ninguém editar a lista pelo painel
const SALAS_PADRAO = SALAS.slice();
const STORAGE_LISTA_SALAS = 'edag-lista-salas';

// Troca o conteúdo de SALAS e diz se mudou
function aplicarListaSalas(lista) {
  const antes = JSON.stringify(SALAS);
  SALAS.splice(0, SALAS.length, ...lista);
  return antes !== JSON.stringify(SALAS);
}

// Última lista recebida do servidor, para abrir certo mesmo sem internet
try {
  const guardada = JSON.parse(localStorage.getItem(STORAGE_LISTA_SALAS));
  if (Array.isArray(guardada)) aplicarListaSalas(guardada);
} catch (e) {}

// Busca a lista editada pelo painel. Retorna true se a lista mudou.
async function carregarListaSalas() {
  try {
    const resposta = await fetch('/api/lista-salas', { cache: 'no-store' });
    if (!resposta.ok) return false;
    const dados = await resposta.json();
    try {
      if (Array.isArray(dados.salas)) {
        localStorage.setItem(STORAGE_LISTA_SALAS, JSON.stringify(dados.salas));
      } else {
        localStorage.removeItem(STORAGE_LISTA_SALAS);
      }
    } catch (e) {}
    return aplicarListaSalas(Array.isArray(dados.salas) ? dados.salas : SALAS_PADRAO);
  } catch (e) {
    return false;
  }
}

// Prédio de uma sala: "CIM4-1-01" fica em "CIM4"
function predioDaSala(nome) {
  return nome.split('-')[0];
}

function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const NOMES_OPCOES = {
  opcao1: 'Opção 1',
  opcao2: 'Opção 2',
  'sem-saida': 'Sem saída'
};

// Diferença (ms) entre a hora oficial e o relógio deste computador
let ajusteRelogio = 0;

function agora() {
  return new Date(Date.now() + ajusteRelogio);
}

// Lê a hora do servidor (cabeçalho Date da resposta), que é sincronizado
// com a hora oficial. Faz 3 medições e usa a de resposta mais rápida.
// Retorna a diferença em ms, ou null sem conexão.
async function medirAjusteRelogio() {
  let melhor = null;
  for (let i = 0; i < 3; i++) {
    try {
      const envio = Date.now();
      const resposta = await fetch(`${location.pathname}?sync=${envio}`, { method: 'HEAD', cache: 'no-store' });
      const chegada = Date.now();
      const dataServidor = Date.parse(resposta.headers.get('Date'));
      if (Number.isNaN(dataServidor)) continue;
      const ida = (chegada - envio) / 2;
      // O cabeçalho tem precisão de segundos: soma meio segundo em média
      const ajuste = dataServidor + 500 - (envio + ida);
      if (!melhor || chegada - envio < melhor.duracao) {
        melhor = { ajuste, duracao: chegada - envio };
      }
    } catch (e) {}
  }
  return melhor ? melhor.ajuste : null;
}

// Retorna ano, mês, dia, hora e minuto de uma data no horário de Brasília
function partesBrasilia(date) {
  const partes = {};
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).forEach(p => { partes[p.type] = p.value; });
  return partes;
}

// Cria uma data a partir de um horário (hh:mm) de hoje em Brasília (UTC-3)
function dataHojeBrasilia(hora, minuto) {
  const p = partesBrasilia(agora());
  const hh = String(hora).padStart(2, '0');
  const mm = String(minuto).padStart(2, '0');
  return new Date(`${p.year}-${p.month}-${p.day}T${hh}:${mm}:00-03:00`);
}

function horaParaData(hhmm) {
  const [hora, minuto] = hhmm.split(':').map(Number);
  return dataHojeBrasilia(hora, minuto);
}

// Formata no padrão 15h30 / 16h
function formatarHora(date) {
  const p = partesBrasilia(date);
  const hora = String(Number(p.hour));
  return p.minute === '00' ? `${hora}h` : `${hora}h${p.minute}`;
}

function formatarDuracao(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

function textoTempo(minutos) {
  return minutos < 60 ? `${minutos} min` : formatarDuracao(minutos);
}

// "falta 1 min", "falta 1h", "falta 1h29" (concorda com "uma hora"), "faltam 45 min", "faltam 2h"
function textoFalta(minutos) {
  const singular = minutos === 1 || (minutos >= 60 && minutos < 120);
  return `${singular ? 'falta' : 'faltam'} ${textoTempo(minutos)}`;
}

// "12" vira "Sala 12"; "Sala 12" ou "Lab 3" ficam como estão
function rotuloSala(nome) {
  if (!nome) return '';
  return /^\d/.test(nome) ? `Sala ${nome}` : nome;
}

// Situação de cada janela de banheiro num instante: 'aguardando', 'aberta' ou 'encerrada'
function situacaoJanelas(opcao, agoraMs) {
  return (OPCOES_JANELAS[opcao] || []).map(janela => {
    const ini = horaParaData(janela.inicio);
    const fim = horaParaData(janela.fim);
    let estado = 'aguardando';
    if (agoraMs >= fim.getTime()) estado = 'encerrada';
    else if (agoraMs >= ini.getTime()) estado = 'aberta';
    return { ...janela, ini, fim, estado };
  });
}
