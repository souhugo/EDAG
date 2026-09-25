# Horário das Provas – EDAG & SENAI CIMATEC

Página estática com o relógio no horário de Brasília e o cronograma de provas do EDAG (início às 14h).

## Como usar

Abra o `index.html` no navegador. Não precisa de build: Tailwind, Font Awesome e Google Fonts vêm por CDN.

## Logos

Os logos ficam na pasta `images/`:

- `images/edag_logo_original.png`
- `images/senai_cimatec_logo.png`

## Início da prova em cada sala

Antes do início, a tabela mostra os horários previstos para começar às 14h. Quando a prova começar na sala, clique em **Iniciar prova**: os horários de conclusão passam a ser calculados a partir desse minuto e cada linha mostra quanto tempo falta.

- **Ajustar horário** corrige o início, caso o botão tenha sido clicado atrasado.
- **Reiniciar** apaga o início da sala.

O horário fica salvo no navegador de cada computador, então cada sala funciona de forma independente e o início não se perde se a página for recarregada.
