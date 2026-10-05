# Zumbi Bot - A revolução dos robôs no apocalipse zumbi

Beat 'em up 2.5D para navegador, no estilo _Streets of Rage_ / _Captain Commando_: você é um robô que avança
pelas fases da esquerda para a direita (e em profundidade) enfrentando hordas de zumbis e máquinas com socos,
chutes, armas brancas, armas de fogo e cajados elementais.

Feito com **Three.js** (iluminação dinâmica, sombras, névoa e pós-processamento), **TypeScript** e **Vite**.
Todo o visual e o áudio são gerados por código: não há arquivos de arte ou som externos: os modelos são
montados com primitivas, as texturas são pintadas em canvas e os efeitos e a música são sintetizados com
Web Audio.

## O jogo

- **10 mapas**, cada um com trechos travados, ondas de inimigos, perigos próprios e um **chefe gigante** no fim:

  | #   | Mapa               | Chefe                                  | Recompensa                            |
  | --- | ------------------ | -------------------------------------- | ------------------------------------- |
  | 1   | Vila Assombrada    | Coveiro Colossal                       | Cajado da Terra                       |
  | 2   | Interior da Torre  | Sentinela dos Ventos                   | Cajado do Vento                       |
  | 3   | Banco              | Guardião do Cofre                      | Cajado Elétrico                       |
  | 4   | Castelo Assustador | Conde Necrótico                        | Cajado Necromante                     |
  | 5   | Zona Tóxica        | Abominação Tóxica                      | Cajado Tóxico                         |
  | 6   | Floresta           | Colosso do Pântano                     | Cajado da Água                        |
  | 7   | Centro da Cidade   | Mecha Dominador                        | Cajado Cibernético                    |
  | 8   | Área em Chamas     | Colosso Incandescente                  | Cajado do Fogo                        |
  | 9   | Campo de Guerra    | General Criotanque                     | Cajado do Gelo                        |
  | 10  | Arena Final        | **OMEGA-Z**, ciborgue zumbi de 4 fases | Coroa do Ômega, créditos e Novo Jogo+ |

- **5 personagens** (e um **secreto**), escolhidos antes de cada partida, cada um com atributos, armas e especial
  próprios:

  | Personagem | Ponto forte                                             | Usa                              | Especial                                                |
  | ---------- | ------------------------------------------------------- | -------------------------------- | ------------------------------------------------------- |
  | Zumbi Bot  | equilibrado                                             | armas de fogo e cajados          | **Giro Turbo**: gira acertando todos em volta           |
  | Maga       | magias muito mais fortes e mana de sobra; aguenta pouco | cajados (fraca c/ brancas)       | **Nova Arcana**: explosão em volta + bola de fogo roxa  |
  | Militar    | muita vida, socos fortes, quase não é empurrado; lento  | armas de fogo                    | **Chuva de Granadas**: granadas explodem em volta       |
  | Ciborgue   | tiros mais fortes e recarga rápida                      | armas de fogo                    | **Raio Laser**: atravessa todos os inimigos à frente    |
  | Mutante    | rápido, pula alto e se regenera; ruim de mira           | armas de fogo                    | **Fúria Mutante**: rugido + 6 s de fúria que rouba vida |
  | Prodígio   | secreto: caratê arcano, rápido e ótimo de briga; frágil | cajados (muito fraco c/ brancas) | **Tornado Arcano**: chutes girando + ciclones em volta  |

  Todos usam socos, chutes e armas brancas. Quem não conjura (Militar, Ciborgue, Mutante) guarda os cajados ganhos
  para quando jogar com a Maga, o Zumbi Bot ou o Prodígio e, no lugar do cajado, tem **caixas de cura guardadas**:
  começa cada mapa com 4, usa uma no botão do cajado (tecla 2, D-pad ↑ ou o botão ✚ no toque) e, pegando uma caixa
  de cura com a vida cheia, ela fica guardada (até 4). Cada um tem nome e sobrenome, uma história e o seu
  próprio final feliz: veja tudo no menu **Personagens** (rostos e ficha completa; no celular é um carrossel com
  ◀ ▶) e, depois de vencer o OMEGA-Z, no **final lendário**, com um capítulo por personagem, cada um num mini cenário
  animado (dá para rever pelos Créditos).

  **Item de reviver:** cada personagem tem o seu, ligado à história dele (a Bateria de Reserva do Zumbi Bot, a Pena
  de Fênix da Maga, a Plaqueta do Batalhão do Militar, o Chip de Backup do Ciborgue, o Soro do Lago do Mutante e a
  Faixa do Mestre do Prodígio), e carrega no máximo um. Se ele cai com o item, levanta ali mesmo com metade da
  vida, sem gastar vida, e o item se gasta. Compra-se na Loja ou sai no baú do fim de fase; a história de cada um
  está na ficha do personagem.

  **Personagem secreto:** terminando o jogo pela primeira vez, o último capítulo do final lendário revela o
  **Prodígio** (Jacobb Amici), um adolescente loiro de olhos azuis que luta caratê com magia arcana. O disfarce dele vai para o guarda-roupa e veste quem quiser:
  **peruca castanho-escura** (o mesmo penteado dele, com sobrancelhas pretas para os fios loiros não entregarem o
  disfarce) e **lentes verdes ou castanhas**.

- **7 armas de fogo** (pistola, escopeta, submetralhadora, fuzil de assalto, rifle de precisão, metralhadora e
  lança-granadas), com dano, cadência, recuo, munição e recarga próprios. As armas novas aparecem em caixas
  pelos mapas: é só **passar por cima** para pegar (armas de fogo e armas brancas). Também dá para comprar na
  **Loja**: as armas de fogo ficam no arsenal para sempre, e a arma branca escolhida já começa cada fase na mão.
- **10 cajados elementais** (cura, fogo, água, gelo, eletricidade, tóxico, cibernético, vento, terra e
  necromancia) com efeitos de status que interagem entre si: molhado + elétrico atordoa, congelado quebra com
  golpes fortes, fogo inflama nuvens tóxicas, o cibernético hackeia robôs e o necromante controla zumbis.
- **Itens e power-ups**: kits médicos (o pequeno cura 40% da vida máxima e o grande 80%, nunca menos que 40 e
  80), escudo, mana, munição, dano dobrado, turbo e invulnerabilidade.
- **Loot cosmético**: cerca de 55 peças dos conjuntos mago e zumbi (chapéus, elmos, óculos, máscaras, roupas,
  armaduras, capas com física, asas e mochila a jato), inventário no **Guarda-roupa** com prévia 3D e uma
  **Loja** em três abas: Visual (ofertas do dia; escolher um item veste o boneco para ver antes), Armas (de fogo e
  brancas) e Itens especiais (o item de reviver de cada personagem). A compra só acontece ao confirmar.
- **Oficina**: escolha o personagem e veja a árvore de melhorias dele, em quatro ramos. **Atributos** (vigor,
  força, agilidade, energia, pontaria ou magia) sobem em três níveis, ponderados pelos limites de cada um: a Maga
  ganha pouca vida e muita magia, o Militar muita vida e pouca agilidade. **Combos** novos saem do fim da sequência
  de socos (J depois do uppercut) ou do chute (K, K). **Especiais** novos, dois por personagem, trocam o especial:
  só um fica em uso, escolhido ali. **Defesas**: esquiva (toque duplo para cima ou para baixo), guarda (bloqueia
  golpes de frente), couraça, escudo de energia que recarrega e contra-golpe. Cada melhoria libera com XP (a soma
  de tudo o que já ganhou) e se compra com sucata.
- **Baú da fase**: vencendo um mapa, aparece um baú balançando; três bolinhas mostram que ele abre com três toques.
  Aberto, os prêmios saem voando para os lados, cada um com o objeto e o nome: o que a fase deu e um bônus de
  sucata, às vezes com uma peça nova, o item de reviver, uma arma branca ou uma arma de fogo.
- **Progressão**: XP e níveis, pontuação com combos, estrelas por nível, recordes e **Novo Jogo+** depois de
  derrotar o OMEGA-Z. Terminando o jogo, o "Continuar" do menu vira **Novo jogo**: a segunda jornada começa de novo
  na Vila Assombrada com todas as armas, cajados, melhorias e itens conquistados, e o último capítulo do final
  lendário conta o que vem por aí. O progresso fica salvo no navegador (`localStorage`).
- **Ranking por jornada**: os pontos de cada mapa se somam até você **perder todas as vidas** ou **terminar o
  jogo**; só aí o jogo mostra a posição e o nome, já salvo com o último nome usado (ou o apelido do personagem).
  Tocar no nome abre o teclado, com a caixa no alto da tela. O **Ranking Pessoal** fica no aparelho, com o nome; o
  botão **Ranking Global** mostra o melhor de cada jogador que tocou em **Participar**, pelos apelidos dos
  personagens (o nome não sai do aparelho; Firebase, veja [docs/RANKING_GLOBAL.md](docs/RANKING_GLOBAL.md)), e só
  aparece quando o ranking global está no ar.
- **Música procedural** por mapa, que ganha camadas durante as lutas e acelera contra os chefes.

## Controles

| Ação                                | Teclado / mouse                        | Gamepad            |
| ----------------------------------- | -------------------------------------- | ------------------ |
| Mover (lados e profundidade)        | W A S D / setas                        | analógico esquerdo |
| Correr                              | Shift, toque duplo ou rodinha do mouse | L3                 |
| Pular / pulo duplo                  | Espaço                                 | A                  |
| Soco / arma branca / cajado / item  | J                                      | X                  |
| Chute (correndo: voadora)           | K                                      | Y                  |
| Especial do personagem              | botão direito do mouse, U ou J+K       | B                  |
| Atirar / conjurar                   | botão esquerdo do mouse ou L           | RT                 |
| Mirar (precisão e crítico)          | I                                      | LT                 |
| Recarregar                          | R                                      | D-pad ↓            |
| Arma ou cajado anterior / próximo   | Q / E                                  | LB / RB            |
| Modo arma de fogo / cajado          | 1 / 2                                  | D-pad ↑            |
| Caixa de cura (quem não usa cajado) | 2                                      | D-pad ↑            |
| Esquiva (defesa da Oficina)         | toque duplo em W ou S (↑ ou ↓)         | toque duplo ↑ ou ↓ |
| Mapa ampliado                       | M                                      | Back               |
| Microfone (chat de voz online)      | V                                      | -                  |
| Pausa                               | Esc ou P                               | Start              |

**Teclas do seu jeito:** em **Controles > Trocar teclas** (ou Configurações > Controles) cada ação pode ter duas
teclas; clique numa tecla e aperte a nova (Esc cancela, Delete apaga, "Restaurar padrão" volta tudo). As dicas do
jogo passam a mostrar as suas teclas. No mouse, girar a rodinha liga a corrida até você parar de andar (apertar a
rodinha também corre).

Andar para cima e para baixo (mudar de plano) tem na tela a mesma velocidade de andar para os lados.

Combos: J, J, J, J termina em uppercut; J, J, K faz o chute giratório; correndo + K é a voadora; no ar,
J e K atacam. Com os combos da Oficina, J depois do uppercut (ou do terceiro golpe do cajado) e K, K saem golpes
próprios de cada personagem.

Os tiros sempre saem para a frente, na faixa de profundidade do robô (o mouse escolhe o lado): alinhe-se com o
inimigo usando W/S e a mira ajusta sozinha para acertar quem estiver à frente, na mesma faixa. Andar tem a mesma
velocidade na tela em qualquer direção, inclusive nas diagonais (duas teclas juntas ou o direcional inclinado). No
modo cajado, o soco vira uma pancada com o cajado, segurado pela ponta e brandido como um bastão; e quando a munição de uma arma pega no chão acaba, o robô volta
sozinho para a pistola. Armas no chão são pegas passando por cima (uma arma branca nova troca pela que estava na
mão, que fica no chão).

**Na tela:** as barras de energia de cada jogador ficam no alto, no centro (sem caixa, do mesmo jeito com 1 ou 5
jogadores); a pontuação e as mensagens (que somem em 3 segundos) à direita; o nome do mapa e o progresso embaixo, no
centro. No computador, o microfone (ícone e tecla) e o FPS ficam no canto superior esquerdo e o mapa grande abre na
tecla M; no celular, o minimapa começa oculto e aparece no botão 🗺.

**Escolha do personagem:** a tela é como a loja: o personagem aparece em 3D no espaço livre e a ficha ao lado
(**◀ nome ▶**, nome e sobrenome, atributos, especial e história; a ficha rola quando não cabe na tela). Para **girar** o personagem, arraste-o para os lados com o dedo (ou o mouse), ou segure **←/→**
no teclado ou o direcional do controle para os lados; para **trocar**, use as setas ◀ ▶ ou **↑/↓**. Na loja e no
guarda-roupa o boneco também gira (arrastar, **Q/E** ou o analógico direito). Na sala online, o botão
**👤 Personagem** (ou tocar no nome) abre a mesma tela.

**Especiais à distância com o mouse:** o Raio Laser do Ciborgue e a bola de fogo da Maga saem para o lado da mira, e
o personagem vira na hora. A pistola nunca acaba, mas cada personagem recarrega no seu ritmo: o Militar é o mais
rápido dos humanos, o Mutante o mais lento, e o Ciborgue continua o mais rápido de todos.

**Multijogador local (até 5 jogadores na mesma tela):** na tela "Escolha seu personagem", cada controle entra
apertando **A** (ou Start) e uma segunda pessoa no teclado entra com **J**, e o teclado se divide em dois:

| Lado     | Andar | Soco | Chute | Pular  | Atirar | Especial | Mirar | Recarregar | Correr     | Trocar arma |
| -------- | ----- | ---- | ----- | ------ | ------ | -------- | ----- | ---------- | ---------- | ----------- |
| Esquerda | WASD  | F    | G     | Espaço | R      | T        | V     | C          | Shift esq. | Q / E       |
| Direita  | setas | J    | K     | L      | O      | I        | ;     | U          | Shift dir. | , / .       |

Com mais de um jogador, a tela mostra um cartão por jogador: cada um escolhe o personagem (←/→) e confirma; com
todos prontos, a partida começa. Os inimigos e chefes ficam
mais fortes conforme o número de jogadores, cada um tem suas vidas e quem ficar sem vidas aperta **Pular** para
pegar uma emprestada de um colega. No fim, o resultado mostra a equipe e cada jogador.

**Multijogador online (até 5 jogadores, cada um no seu aparelho):** no menu, **Jogar online**.

1. Uma pessoa toca em **Criar sala**, escolhe a **dificuldade** da partida e se o **chat de voz** é permitido, e
   recebe um **código de 4 letras** (e um link/QR para mandar aos amigos).
2. Os outros tocam em **Entrar numa sala** e digitam o código (ou abrem o link).
3. Cada um escolhe o personagem e toca em **Pronto**; quem criou a sala escolhe a fase (e pode mudar a
   dificuldade e o chat de voz) e toca em **Começar**.

**Chat de voz:** numa sala com voz, todos falam com todos e todos ouvem todos: computador, Android (navegador ou
app) e iPhone juntos. Cada um liga ou desliga o próprio microfone no botão **🎤 Ligar microfone** (na sala), no
botão do microfone na partida ou com a tecla **V**; o microfone começa desligado e o aparelho pede permissão na
primeira vez (se estiver bloqueado, o jogo explica onde liberar). A lista da sala e os painéis da partida mostram
🎤/🔇 de cada um e acendem em quem está falando, e a música abaixa enquanto alguém fala. O volume das vozes fica em
Configurações > Áudio. A voz vai direto entre os aparelhos (criptografada) e não é gravada.

Cada um guarda o próprio progresso (nível, armas, itens) no seu aparelho, e navegador e app jogam juntos. Quem
criou a sala é o anfitrião (👑): o aparelho dele roda a partida e manda o estado para os outros ~20 vezes por
segundo; o estado completo, que com 3 ou mais jogadores e muitos inimigos passa do tamanho que o PeerJS aceita
numa mensagem, vai em pedaços. No fim da fase o anfitrião escolhe a próxima (ou volta todos para a sala). **Se o
anfitrião sair** (ou o aparelho dele cair), o jogador de menor número assume: a sala, o código e a partida
continuam para quem ficou, todos são avisados e o boneco de quem saiu some. Quando só a rede de um aparelho
oscila, ele tenta antes voltar no mesmo anfitrião, que guarda o lugar dele por 30 segundos; assim ninguém vira um
segundo anfitrião por engano. Sair do jogo por um instante (mandar o convite pelo WhatsApp, por exemplo) avisa os
outros, que esperam até um minuto. Quando um jogador sai de vez, todos veem o aviso ("P3 saiu da partida") e o
boneco dele sai do jogo. A tela de quem entrou mostra o jogo um pouquinho
atrasado (~0,1 s) para andar liso mesmo com a rede oscilando, e com o chat de voz ligado o áudio usa pouca banda e
não envia nada com o microfone desligado. A conexão usa WebRTC com o serviço gratuito do
PeerJS para achar a sala pelo código, sem cadastro e sem servidor próprio. Algumas redes (de empresas e escolas)
bloqueiam a conexão direta; nesse caso, tente outra rede, como os dados do celular.

No celular e no tablet: direcional à esquerda (empurrar até a borda corre) e botões Soco, Pular, Chute,
Atirar/Conjurar (mira sozinho), Especial, Arma ⇄ Cajado (só para quem usa os dois; para Militar, Ciborgue e Mutante
é o ✚ da caixa de cura, com quantas sobram) e, à direita dele, o botão de trocar de cajado ou de arma (a arma recarrega sozinha quando o pente acaba); pausa, microfone (no jogo online com voz), tela cheia e minimapa ficam no canto superior esquerdo, um
abaixo do outro. Tamanho, opacidade e vibração dos controles ficam em Configurações > Controles.

## Jogar

- **No navegador:** https://marcelojaloto.github.io/Zumbi-Bot/ (computador, celular ou tablet, Android e iPhone).
- **No celular e no tablet:** deite o aparelho; os controles de toque aparecem sozinhos (direcional com setas à
  esquerda, botões de ação à direita). O jogo entra em tela cheia ao tocar em Jogar; se sair dela (outra aba ou outro
  app), o próximo toque volta; e quando a tela encolhe sozinha (a barra do navegador aparece, gesto de sair), o
  jogo espera 3 segundos antes de se rearrumar, porque quase sempre ela volta logo. O aviso "arraste para sair da
  tela cheia" é do próprio navegador e nenhum site consegue escondê-lo: para jogar sem ele, instale o jogo
  (Configurações > **📲 Instalar o jogo**, que só aparece quando o navegador oferece, ou "Adicionar à tela
  inicial") ou use o app para Android: instalado, o jogo abre em tela cheia, deitado e sem a barra do navegador. O
  manual abre dentro do jogo, em Configurações > **📖 Manual**.
- **No iPhone (Safari):** a página não consegue entrar em tela cheia sozinha: toque em **Compartilhar > Adicionar
  à Tela de Início** e abra o Zumbi Bot por lá. O jogo online e o chat de voz funcionam no Safari (iOS 16.4 ou
  mais novo recomendado); se as vozes não tocarem, toque em **🔈 Toque para ouvir a conversa**.
- **App para Android:** baixe o [zumbi-bot.apk](https://github.com/marcelojaloto/Zumbi-Bot/releases/latest/download/zumbi-bot.apk)
  no celular e instale (o Android pede para permitir apps dessa fonte). Como publicar na Play Store:
  [docs/PLAY_STORE.md](docs/PLAY_STORE.md).
- **App para iPhone:** o projeto está pronto e é compilado no GitHub (workflow iOS). Para instalar pelo TestFlight e
  publicar na App Store é preciso uma conta de desenvolvedor Apple (passo a passo em
  [docs/APP_STORE.md](docs/APP_STORE.md)). Até lá, jogue no Safari (acima).
- **Idiomas:** português e inglês, escolhidos pelo idioma do navegador e trocáveis em Configurações > Jogo.
- **Dificuldade:** Fácil, Normal (padrão), Difícil e Insano; escolha na tela de mapas ou em Configurações >
  Jogo. Nas mais fáceis os chefes têm menos vida e atacam com mais pausa; ao perder, o jogo oferece tentar de
  novo numa dificuldade menor.

## Instalação local

Passo a passo completo, com solução de problemas:
[manual no site](https://marcelojaloto.github.io/Zumbi-Bot/manual/) ·
[docs/INSTALACAO.md](docs/INSTALACAO.md) · [docs/INSTALL.md (English)](docs/INSTALL.md).

Resumo (precisa de Node.js 22 LTS e Git):

```bash
git clone https://github.com/marcelojaloto/Zumbi-Bot.git
cd Zumbi-Bot
npm install
npm run dev        # abra http://localhost:5173/Zumbi-Bot/ e deixe o terminal aberto
```

## Comandos de desenvolvimento

```bash
npm install
npm run dev        # servidor de desenvolvimento (http://localhost:5173/Zumbi-Bot/)
npm run build      # build de produção em dist/
npm run preview    # serve o build em http://localhost:4173/Zumbi-Bot/
npm test           # testes unitários (Vitest), incluindo a campanha inteira com piloto automático
npm run store:shots  # capturas de tela da Play Store (pt e en) em store/android/screenshots/
npm run e2e        # testes ponta a ponta (Playwright + Chromium)
npm run check      # typecheck + testes + build
npm run build:app  # build do jogo para o app Android em dist-app/
npm run android:sync # build do app + cópia para o projeto android/ (Capacitor)
```

Parâmetros de URL úteis para testar: `?debug=1` (expõe `window.__game`), `map=<id>` e `level=<n>` (abre direto
um mapa), `quality=low|medium|high`, `seed=<n>`, `god=1`, `autopilot=1`, `mute=1`, `fps=1` e
`nopointerlock=1`. Com `?debug=1`, as teclas F1–F8 criam inimigos na hora.

## Qualidade gráfica

Em **Configurações** há os presets Baixa, Média, Alta e Automática (começa na Média e cai um nível se o jogo
ficar lento). A Alta liga oclusão de ambiente (SSAO), sombras suaves e aberração cromática; a Baixa desliga o
pós-processamento e as sombras dinâmicas. A escala de resolução, o tremor de tela, os números de dano e o
contador de FPS também são configuráveis.

## Estrutura

- `src/sim`: simulação determinística (passo fixo de 60 Hz, sem Three.js nem DOM): combate, IA, chefes,
  níveis e progressão. Um teste garante essa separação (o anfitrião do jogo online roda essa simulação).
- `src/data`: tudo o que é conteúdo: armas, cajados, inimigos, chefes (uma pequena linguagem de passos),
  mapas, itens, cosméticos e músicas.
- `src/render`: cena Three.js, personagens montados com juntas, cenários procedurais, luzes, partículas e
  pós-processamento.
- `src/audio`, `src/ui`, `src/input`, `src/save`: som, telas em HTML/CSS, controles e salvamento.
- `src/net`: entrada dos jogadores locais (até 5) e o multijogador online: salas com código (`room.ts`),
  transporte WebRTC/PeerJS (`peerTransport.ts`) ou entre abas para testes (`localTransport.ts`, `?net=local`),
  mensagens (`protocol.ts`), o estado do mundo enviado só com o que mudou (`delta.ts`), a troca de anfitrião
  (`room.ts` + `src/sim/takeover.ts`, que prepara o mundo de quem assume) e o chat de voz (`voice.ts`: uma chamada
  de áudio direta entre cada par de aparelhos da sala, microfone e quem está falando).

## Publicação (GitHub Pages)

O workflow `.github/workflows/deploy.yml` publica o jogo a cada push na `main`.
Para ativar: **Settings > Pages > Build and deployment > Source: GitHub Actions**.
O jogo fica em `https://<usuario>.github.io/Zumbi-Bot/`.

## App Android

O workflow `.github/workflows/android.yml` gera o app com o mesmo jogo (projeto em `android/`, Capacitor): APK de
teste em todo PR e, na `main`, a release "Android" com o `zumbi-bot.apk`. Com os segredos da chave de upload, gera
também o AAB assinado para a Play Store. O passo a passo da publicação está em [docs/PLAY_STORE.md](docs/PLAY_STORE.md)
e os textos e imagens da loja em [store/android/](store/android/).

## App de iPhone

O workflow `.github/workflows/ios.yml` gera o app de iPhone num Mac do GitHub (projeto em `ios/`, Capacitor): compila
para o simulador, abre o app num iPhone simulado e fotografa a tela, e gera um `.ipa` sem assinatura. Com os segredos
da conta Apple, assina e envia para o TestFlight. O passo a passo (conta, certificado, TestFlight e App Store) está em
[docs/APP_STORE.md](docs/APP_STORE.md) e as capturas da App Store em [store/ios/](store/ios/)
(`npm run store:shots:ios`).

## Histórico de versões

O que mudou em cada versão está em [CHANGELOG.md](CHANGELOG.md).

## Licença

CC0 1.0, domínio público.
