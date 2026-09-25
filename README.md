# Acompanhamento da Prova – EDAG & SENAI CIMATEC

Página estática com o relógio no horário de Brasília e o cronograma de provas do EDAG (início às 14h).

## Como usar

Abra o `index.html` no navegador. Não precisa de build: Tailwind, Font Awesome e Google Fonts vêm por CDN.

## Logos

Os logos ficam na pasta `images/`:

- `images/edag_logo_original.png`
- `images/senai_cimatec_logo.png`

## Início da prova em cada sala

Antes de iniciar, informe a **sala** (por exemplo, `12`). Ela aparece no balão abaixo do título ("Sala 12 · Prova iniciada às 14h") e pode ser corrigida em **Ajustar sala e horário**.

Antes do início, a tabela mostra os horários previstos para começar às 14h e o título mostra quanto falta para as 14h (depois disso, "Aguardando o início da prova"). Quando a prova começar na sala, clique em **Iniciar prova**: os horários de conclusão passam a ser calculados a partir desse minuto e cada linha mostra quanto tempo falta.

- A próxima prova a encerrar fica realçada. Nos últimos 15 minutos o tempo restante fica laranja e, ao terminar, a linha fica cinza com "encerrada".
- **Ajustar sala e horário** corrige a sala e o início, caso o botão tenha sido clicado atrasado.
- **Reiniciar** apaga o início da sala.

Ao clicar em **Iniciar prova**, a página entra em tela cheia com tudo ajustado ao tamanho da tela, sem cortes nem rolagem. Os botões de ajuste ficam ocultos na tela cheia: aperte **Esc** para sair e **Tela cheia** para voltar.

O horário fica salvo no navegador de cada computador, então cada sala funciona de forma independente e o início não se perde se a página for recarregada.

## Hora oficial

O relógio não depende da hora do computador: ao abrir a página, ela consulta a hora do servidor do site (que é sincronizado com a hora oficial) e corrige a diferença. A sincronização se repete a cada 10 minutos. Abaixo do relógio aparece se o computador está adiantado ou atrasado. Sem internet, a página usa o relógio do computador e avisa.

## Saídas para o banheiro

Antes de iniciar, escolha no quadro do relógio a opção de janelas da sala. As janelas aparecem num quadro próprio, abaixo do relógio. O botão **Iniciar prova** só é liberado depois da escolha.

- **Opção 1:** Janela 1 das 15h30 às 16h e Janela 2 das 16h30 às 17h.
- **Opção 2:** Janela 1 das 16h às 16h30 e Janela 2 das 17h às 17h30.
- **Sem saída:** para salas só com provas do Tipo I. Não são permitidas saídas antes da conclusão do exame.

Os horários são fixos, não mudam se a prova começar atrasada. O quadro mostra quanto falta para cada janela; a janela liberada fica verde e as encerradas ficam cinza. Para trocar a opção depois de iniciar, saia da tela cheia (Esc) e use **Trocar janelas**. Os horários ficam na constante `OPCOES_JANELAS` do `index.html`.
