# Zumbi Bot — A revolução dos robôs no apocalipse zumbi

Beat 'em up 2.5D para navegador, no estilo _Streets of Rage_ / _Captain Commando_: você é um robô que avança
pelas fases da esquerda para a direita (e em profundidade) enfrentando hordas de zumbis e máquinas com socos,
chutes, armas brancas, armas de fogo e cajados elementais.

Feito com **Three.js** (iluminação dinâmica, sombras, névoa e pós-processamento), **TypeScript** e **Vite**.
Todo o visual e o áudio são gerados por código — não há arquivos de arte ou som externos: os modelos são
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

- **5 personagens**, escolhidos antes de cada partida, cada um com atributos e especial próprios:

  | Personagem | Ponto forte                                             | Especial                                                |
  | ---------- | ------------------------------------------------------- | ------------------------------------------------------- |
  | Zumbi Bot  | equilibrado                                             | **Giro Turbo**: gira acertando todos em volta           |
  | Maga       | magias muito mais fortes e mana de sobra; aguenta pouco | **Nova Arcana**: explosão em volta que derruba          |
  | Militar    | muita vida, socos fortes, quase não é empurrado; lento  | **Soco Sísmico**: onda de choque no chão                |
  | Ciborgue   | tiros mais fortes e recarga rápida                      | **Raio Laser**: atravessa todos os inimigos à frente    |
  | Mutante    | rápido, pula alto e se regenera; ruim de mira           | **Fúria Mutante**: rugido + 6 s de fúria que rouba vida |

- **7 armas de fogo** (pistola, escopeta, submetralhadora, fuzil de assalto, rifle de precisão, metralhadora e
  lança-granadas), com dano, cadência, recuo, munição e recarga próprios. As armas novas aparecem em caixas
  pelos mapas.
- **10 cajados elementais** (cura, fogo, água, gelo, eletricidade, tóxico, cibernético, vento, terra e
  necromancia) com efeitos de status que interagem entre si: molhado + elétrico atordoa, congelado quebra com
  golpes fortes, fogo inflama nuvens tóxicas, o cibernético hackeia robôs e o necromante controla zumbis.
- **Itens e power-ups**: kits médicos, escudo, mana, munição, dano dobrado, turbo e invulnerabilidade.
- **Loot cosmético**: cerca de 40 peças dos conjuntos mago e zumbi (chapéus, óculos, máscaras, roupas e capas
  com física), inventário no **Guarda-roupa** com prévia 3D e uma **Loja** com ofertas do dia.
- **Progressão**: XP e níveis, pontuação com combos, estrelas por nível, recordes, **ranking local** e
  **Novo Jogo+** depois de derrotar o OMEGA-Z. O progresso fica salvo no navegador (`localStorage`).
- **Música procedural** por mapa, que ganha camadas durante as lutas e acelera contra os chefes.

## Controles

| Ação                              | Teclado / mouse                        | Gamepad            |
| --------------------------------- | -------------------------------------- | ------------------ |
| Mover (lados e profundidade)      | W A S D / setas                        | analógico esquerdo |
| Correr                            | Shift, toque duplo ou rodinha do mouse | L3                 |
| Pular / pulo duplo                | Espaço                                 | A                  |
| Soco / arma branca / pegar item   | J                                      | X                  |
| Chute (correndo: voadora)         | K                                      | Y                  |
| Especial do personagem            | botão direito do mouse, U ou J+K       | B                  |
| Atirar / conjurar                 | botão esquerdo do mouse ou L           | RT                 |
| Mirar (precisão e crítico)        | I                                      | LT                 |
| Recarregar                        | R                                      | D-pad ↓            |
| Arma ou cajado anterior / próximo | Q / E                                  | LB / RB            |
| Modo arma de fogo / cajado        | 1 / 2                                  | D-pad ↑            |
| Mapa ampliado                     | M                                      | Back               |
| Microfone (chat de voz online)    | V                                      | —                  |
| Pausa                             | Esc ou P                               | Start              |

**Teclas do seu jeito:** em **Controles → Trocar teclas** (ou Configurações → Controles) cada ação pode ter duas
teclas; clique numa tecla e aperte a nova (Esc cancela, Delete apaga, "Restaurar padrão" volta tudo). As dicas do
jogo passam a mostrar as suas teclas. No mouse, girar a rodinha liga a corrida até você parar de andar (apertar a
rodinha também corre).

Andar para cima e para baixo (mudar de plano) tem na tela a mesma velocidade de andar para os lados.

Combos: J, J, J, J termina em uppercut • J, J, K faz o chute giratório • correndo + K é a voadora • no ar,
J e K atacam.

Os tiros sempre saem para a frente, na faixa de profundidade do robô (o mouse escolhe o lado): alinhe-se com o
inimigo usando W/S e a mira ajusta sozinha para acertar quem estiver à frente, na mesma faixa.

**Multijogador local (até 5 jogadores na mesma tela):** na tela "Escolha seu personagem", cada controle entra
apertando **A** (ou Start) e uma segunda pessoa no teclado entra com **J** — o teclado se divide em dois:

| Lado     | Andar | Soco | Chute | Pular  | Atirar | Especial | Mirar | Recarregar | Correr     | Trocar arma |
| -------- | ----- | ---- | ----- | ------ | ------ | -------- | ----- | ---------- | ---------- | ----------- |
| Esquerda | WASD  | F    | G     | Espaço | R      | T        | V     | C          | Shift esq. | Q / E       |
| Direita  | setas | J    | K     | L      | O      | I        | ;     | U          | Shift dir. | , / .       |

Cada um escolhe o personagem (←/→) e confirma; com todos prontos, a partida começa. Os inimigos e chefes ficam
mais fortes conforme o número de jogadores, cada um tem suas vidas e quem ficar sem vidas aperta **Pular** para
pegar uma emprestada de um colega. No fim, o resultado mostra a equipe e cada jogador.

**Multijogador online (até 5 jogadores, cada um no seu aparelho):** no menu, **Jogar online**.

1. Uma pessoa toca em **Criar sala**, escolhe a **dificuldade** da partida e se o **chat de voz** é permitido, e
   recebe um **código de 4 letras** (e um link/QR para mandar aos amigos).
2. Os outros tocam em **Entrar numa sala** e digitam o código (ou abrem o link).
3. Cada um escolhe o personagem e toca em **Pronto**; quem criou a sala escolhe a fase (e pode mudar a
   dificuldade e o chat de voz) e toca em **Começar**.

**Chat de voz:** numa sala com voz, todos falam com todos e todos ouvem todos — computador, Android (navegador ou
app) e iPhone juntos. Cada um liga ou desliga o próprio microfone no botão **🎤 Ligar microfone** (na sala), no
botão do microfone na partida ou com a tecla **V**; o microfone começa desligado e o aparelho pede permissão na
primeira vez (se estiver bloqueado, o jogo explica onde liberar). A lista da sala e os painéis da partida mostram
🎤/🔇 de cada um e acendem em quem está falando, e a música abaixa enquanto alguém fala. O volume das vozes fica em
Configurações → Áudio. A voz vai direto entre os aparelhos (criptografada) e não é gravada.

Cada um guarda o próprio progresso (nível, armas, itens) no seu aparelho, e navegador e app jogam juntos. Quem
criou a sala é o anfitrião: o aparelho dele roda a partida e manda o estado para os outros ~20 vezes por segundo,
então ele deve manter o jogo aberto na tela. No fim da fase o anfitrião escolhe a próxima (ou volta todos para a
sala); quem cair ou sair no meio fica fora e os outros continuam. A conexão usa WebRTC com o serviço gratuito do
PeerJS para achar a sala pelo código — sem cadastro e sem servidor próprio. Algumas redes (de empresas e escolas)
bloqueiam a conexão direta; nesse caso, tente outra rede, como os dados do celular.

No celular e no tablet: direcional à esquerda (empurrar até a borda corre) e botões Soco, Pular, Chute,
Atirar/Conjurar (mira sozinho), Especial, Recarregar, Próxima arma e Arma ⇄ Cajado à direita; pausa, tela cheia e
(no jogo online com voz) microfone no topo. Tamanho, opacidade e vibração dos controles ficam em Configurações → Controles.

## Jogar

- **No navegador:** https://marcelojaloto.github.io/Zumbi-Bot/ — computador, celular ou tablet (Android e iPhone).
- **No celular e no tablet:** deite o aparelho; os controles de toque aparecem sozinhos (direcional com setas à
  esquerda, botões de ação à direita). Em "Adicionar à tela inicial", o jogo abre em tela cheia e deitado.
- **No iPhone (Safari):** a página não consegue entrar em tela cheia sozinha — toque em **Compartilhar → Adicionar
  à Tela de Início** e abra o Zumbi Bot por lá. O jogo online e o chat de voz funcionam no Safari (iOS 16.4 ou
  mais novo recomendado); se as vozes não tocarem, toque em **🔈 Toque para ouvir a conversa**.
- **App para Android:** baixe o [zumbi-bot.apk](https://github.com/marcelojaloto/Zumbi-Bot/releases/latest/download/zumbi-bot.apk)
  no celular e instale (o Android pede para permitir apps dessa fonte). Como publicar na Play Store:
  [docs/PLAY_STORE.md](docs/PLAY_STORE.md).
- **App para iPhone:** o projeto está pronto e é compilado no GitHub (workflow iOS). Para instalar pelo TestFlight e
  publicar na App Store é preciso uma conta de desenvolvedor Apple — passo a passo em
  [docs/APP_STORE.md](docs/APP_STORE.md). Até lá, jogue no Safari (acima).
- **Idiomas:** português e inglês, escolhidos pelo idioma do navegador e trocáveis em Configurações → Jogo.
- **Dificuldade:** Muito fácil, Fácil, Normal (padrão) e Difícil — escolha na tela de mapas ou em Configurações →
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

- `src/sim` — simulação determinística (passo fixo de 60 Hz, sem Three.js nem DOM): combate, IA, chefes,
  níveis e progressão. Um teste garante essa separação (o anfitrião do jogo online roda essa simulação).
- `src/data` — tudo o que é conteúdo: armas, cajados, inimigos, chefes (uma pequena linguagem de passos),
  mapas, itens, cosméticos e músicas.
- `src/render` — cena Three.js, personagens montados com juntas, cenários procedurais, luzes, partículas e
  pós-processamento.
- `src/audio`, `src/ui`, `src/input`, `src/save` — som, telas em HTML/CSS, controles e salvamento.
- `src/net` — entrada dos jogadores locais (até 5) e o multijogador online: salas com código (`room.ts`),
  transporte WebRTC/PeerJS (`peerTransport.ts`) ou entre abas para testes (`localTransport.ts`, `?net=local`),
  mensagens (`protocol.ts`), o estado do mundo enviado só com o que mudou (`delta.ts`) e o chat de voz
  (`voice.ts`: uma chamada de áudio direta entre cada par de aparelhos da sala, microfone e quem está falando).

## Publicação (GitHub Pages)

O workflow `.github/workflows/deploy.yml` publica o jogo a cada push na `main`.
Para ativar: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
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

## Licença

CC0 1.0 — domínio público.
