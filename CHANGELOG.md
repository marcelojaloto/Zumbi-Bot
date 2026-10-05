# Histórico de versões

O que mudou em cada versão do Zumbi Bot, da mais nova para a mais antiga. No app Android, o último número da
versão é o da build (por exemplo, 1.6.39), então uma mesma versão pode ter várias builds.

## 1.6, atualização de 04/10/2026

### Ranking global e privacidade

- O **Ranking Global** passa a ser opcional e começa desligado: o jogador entra tocando em **Participar** e sai
  quando quiser em **Sair do ranking global**, que apaga o registro e a conta anônima do aparelho.
- O nome escrito no ranking não sai mais do aparelho. No Ranking Global, os outros jogadores aparecem pelos
  apelidos dos personagens, e só a sua própria linha mostra o seu nome.
- As regras do banco não aceitam mais nenhum texto livre: só números, datas e os códigos de mapas e personagens.
- Nova política de privacidade, com a Jaloto Software como responsável, o e-mail de contato, os dados guardados
  fora do Brasil e os direitos de quem joga.

### Jogo online com 3 ou mais

- O estado completo do jogo, que com 3 jogadores e uma onda de inimigos passava de 16 KB, era recusado em silêncio
  pelo PeerJS, e a conexão morria sem aviso. Agora ele vai em pedaços e é montado de novo do outro lado, e o
  estado igual para todos vira texto uma vez só.
- Um erro na conexão fecha a conexão de verdade, e o outro lado fica sabendo na hora, em vez de esperar 8 s de
  silêncio.
- Quando a rede de um aparelho oscila, ele tenta antes voltar no mesmo anfitrião, que guarda o lugar dele por
  30 s. Só se o anfitrião não responder é que o jogador de menor número assume. Isso acaba com os dois anfitriões
  ao mesmo tempo quando o anfitrião caía numa sala de 3.
- Sair do jogo por um instante (mandar o convite, outro app) avisa os outros, que esperam até um minuto. Um
  aparelho que travou alguns segundos (fase carregando) não derruba mais ninguém.
- Online, quem troca de personagem na sala leva a Oficina e o item de reviver do personagem novo.

### Chefes

- **Coveiro Colossal** e **OMEGA-Z** deixam espaço para fugir: os golpes de perto pegam só a faixa de
  profundidade do chefe, o alcance para a frente diminuiu e os círculos dos saltos ficaram menores que a rua.
- O Coveiro ergue a pá um pouco antes de bater e, na fase 2, anda no máximo como o jogador andando.
- Na fase 3 do OMEGA-Z a arena encolhe menos, a pancada no chão alcança menos, a varredura de plasma passa rente
  ao chão (dá para pular) e é mais lenta, e a aura da fase 4 é menor.

### Torre e Área em Chamas

- Os destroços agora caem do teto de verdade: as pedras aparecem lá no alto durante o aviso e chegam ao chão bem
  quando ele acaba, com o teto estalando antes, estrondo, tremor e cascalho voando no impacto.

### Dificuldade

- As dificuldades passam a ser **Fácil**, **Normal** (padrão), **Difícil** e **Insano**. O antigo Muito fácil
  virou o Fácil e ficou ainda mais fácil; o antigo Fácil virou o Normal; o antigo Normal virou o Difícil; o
  antigo Difícil virou o Insano.
- Quem já jogava vai para o novo Normal (quem estava no Muito fácil, para o Fácil).

### Oficina

- Nova tela **Oficina** no menu: escolha o personagem e veja a árvore de melhorias dele, em quatro ramos. Cada
  melhoria libera com XP (a soma de tudo o que o jogador já ganhou) e se compra com sucata; algumas pedem a
  anterior do mesmo ramo.
- **Atributos** em três níveis (vigor, força, agilidade, energia e pontaria ou magia), ponderados pelos limites de
  cada personagem.
- **Combos** novos, dois por personagem: J depois do uppercut (ou do terceiro golpe do cajado) e K, K.
- **Especiais** novos, dois por personagem; só um fica em uso, escolhido na Oficina. Entre eles, Pulso EMP,
  Chuva de Meteoros, Ataque Aéreo, Canhão de Plasma, Salto Sísmico e Palma do Dragão.
- **Defesas**: esquiva (toque duplo para cima ou para baixo), guarda (bloqueia golpes e tiros de frente), couraça,
  escudo de energia que recarrega e contra-golpe.

### Item de reviver, loja e baú

- Cada personagem tem o seu item de reviver, com uma história ligada a ele (está na ficha do personagem), e
  carrega no máximo um. Caindo com ele, levanta ali mesmo com metade da vida, sem gastar vida.
- A **Loja** ganhou abas: Visual, Armas (armas de fogo para o arsenal e armas brancas, que começam cada fase na
  mão) e Itens especiais (o item de reviver de cada personagem).
- Vencendo um mapa, aparece o **baú da fase**: três bolinhas mostram que ele abre com três toques, e os prêmios
  saem voando para os lados, cada um com o objeto em 3D e o nome. Ele mostra o que a fase deu e um bônus de sucata,
  às vezes com uma peça nova, o item de reviver, uma arma branca ou uma arma de fogo.

### Novo jogo e continuação

- Terminando o jogo, o "Continuar" do menu vira **Novo jogo**: a segunda jornada recomeça na Vila Assombrada com
  todas as armas, cajados, melhorias e itens conquistados.
- O final lendário ganhou um último capítulo: o núcleo do OMEGA-Z volta a pulsar e dispara um sinal para o fundo
  do mar, a história que abre a continuação. Os créditos finais também falam dela.

## 1.6, atualização de 01/10/2026

- No celular deitado, a dica "Chefe à frente!" não fica mais embaixo do nome do chefe: a dica sobe e o nome
  desce um pouco.
- Em inglês, a aba das costas no guarda-roupa passa a se chamar "Back gear", para não se confundir com o botão
  "Back".

## 1.6, atualização de 30/09/2026

### Prodígio (personagem secreto)

- Léo Aurora passa a se chamar **Jacobb Amici** em todos os lugares: ficha, cartão do menu Personagens,
  história, final lendário, traduções e README.
- As munhequeiras ficaram pretas, iguais à faixa, e a bolinha azul do peito saiu. A bandana azul continua.
- **Tornado Arcano** com ciclones: além dos chutes girando, ele solta 8 ciclones arcanos em todas as direções.
  Cada ciclone acerta uma vez quem encontrar, derruba e quica nas bordas da rua em vez de sair do cenário.
- A peruca do disfarce tem agora o mesmo penteado espetado dele, em castanho-escuro, um pouco maior para cobrir o
  loiro. Ela passa a se chamar "Peruca Castanho-Escura" ("Dark Brown Wig"), e quem já tinha não perde a peça.
- No final lendário, o capítulo dele mostra só "Prodígio", com "Jacobb Amici, personagem secreto liberado!"
  embaixo.

### Caixas de cura para quem não usa cajado

- Militar, Ciborgue e Mutante começam cada mapa com 4 caixas de cura guardadas, que curam 25 cada.
- A caixa é usada no botão do cajado: tecla 2 (ou a de alternar), D-pad para cima no controle e, no toque, o
  botão de alternar, que mostra quantas caixas sobram.
- Pegar uma caixa de cura com a vida cheia guarda a caixa, até 4. A caixa grande guardada cura 60 e é a próxima
  a ser usada.
- Com a vida cheia o botão não gasta caixa e avisa "Vida cheia"; sem caixas, avisa "Sem caixas de cura".
- O HUD mostra 4 cruzes, as cheias em verde. No jogo online, cada um vê as próprias caixas.
- Zumbi Bot, Maga e Prodígio continuam como antes: com a vida cheia, a caixa fica no chão.

### Textos e toque

- Os textos do jogo, em português e inglês, ficaram sem travessão e sem caracteres incomuns (reticências de um
  caractere, separadores com bolinha, setas nos caminhos de menu). Tecla sem configuração aparece como "?" e
  célula vazia do ranking como "-". README, manual, política de privacidade e textos da loja seguem a mesma regra.
- O botão de trocar arma ou cajado no toque volta a ficar sempre na tela: apagado quando há um só para escolher,
  aceso ao pegar outro.

## 1.6 (28/09/2026)

### Ranking por jornada

- Os pontos de cada mapa se somam numa jornada, que só vai para o ranking quando o jogador perde todas as vidas
  ou termina o jogo. Vencer um mapa no meio do caminho não pede nome.
- A jornada fica salva no aparelho: fechar o jogo no meio não perde os pontos.
- No fim da jornada o registro já fica salvo com o nome sugerido: o último nome usado ou, se não houver, o
  apelido do personagem ("Equipe de N" numa equipe local). O botão "Salvar no ranking" saiu.
- O teclado só aparece ao tocar no nome, e a caixa sobe para o alto da tela. Enter, OK ou tocar fora confirmam;
  Esc desiste.
- O Ranking abre no Ranking Pessoal, com as colunas Mapas e "Onde parou" e a linha "Jornada em andamento". Os
  registros antigos continuam lá.

### Ranking Global

- Novo botão **Ranking Global** / **Ranking Pessoal**. O Global lista os 100 melhores, um por jogador ou
  aparelho, com o seu resultado destacado.
- Cada aparelho entra com uma conta anônima do Firebase, sem dados pessoais, e só escreve o próprio registro. As
  regras do banco validam campos e tamanhos, e tudo vai pela API REST, sem biblioteca nova.
- Sem internet, com o Firebase fora do ar ou sem configuração, o botão nem aparece. Um resultado feito sem
  internet é enviado depois.
- Configuração em [docs/RANKING_GLOBAL.md](docs/RANKING_GLOBAL.md). Política de privacidade e guias das lojas
  atualizados com o que o ranking envia.

### Armas e cajado

- Pegar arma é passar por cima, sem apertar nada. Arma de fogo repetida vira munição; com a munição cheia, ela
  fica no chão. Arma branca nova troca pela da mão, e a antiga só volta para quem a soltou depois de se
  afastar.
- Só a Maga, o Zumbi Bot e o Prodígio usam cajado. Militar, Ciborgue e Mutante ganham e guardam os cajados para
  quando jogar com quem usa ("Guardado para quem usa cajado").
- A Maga não usa armas de fogo e é fraca com arma branca. As armas brancas ganharam um multiplicador próprio,
  separado do soco.
- A ficha mostra "não usa" em Armas ou Magia.
- No toque, o botão de trocar cajado ganhou ícone novo e fica à direita do Arma ⇄ Cajado, que só aparece para
  quem usa os dois.

### Telas

- Sala online: "Fase" centralizado acima do nome da fase, com as setas do anfitrião alinhadas às do Personagem.
- Escolha de personagem sem a seleção repetida embaixo do boneco e com o título centralizado.
- **Instalar o jogo** saiu do menu principal e foi para Configurações.
- Quando a tela encolhe sozinha (barra do navegador, gesto de sair do app, janela de instalação), o jogo espera
  3 s antes de se rearrumar. Crescer, girar o aparelho, digitar e o computador reajustam na hora.

### Personagem secreto: Prodígio (Léo Aurora)

- Adolescente baixinho, loiro de olhos azuis, com quimono de caratê, faixa preta, bandana azul e punhos com
  energia arcana. É rápido e ótimo de briga, usa cajado, não usa armas de fogo e é muito fraco com armas brancas.
- Especial **Tornado Arcano**: avança girando em chutes e acerta várias vezes quem está no caminho.
- É liberado ao terminar o jogo pela primeira vez, no último capítulo do final lendário. Quem já tinha terminado
  ganha o personagem ao abrir a versão nova.
- O disfarce (peruca preta, lentes verdes e lentes castanhas) vai para o guarda-roupa como itens extras, que não
  caem de inimigos nem são vendidos.
- Antes de liberado, ele aparece como um cartão trancado "???" no menu Personagens.

### Menu Personagens em carrossel

- No computador e no tablet, os cartões passam para a linha de baixo quando não cabem, e a lista rola.
- No celular, os cartões ficam num carrossel de uma linha, que anda com o dedo ou com os botões ◀ ▶ na altura do
  Voltar.
- Capturas das lojas refeitas.

## 1.5 (28/09/2026)

### Militar

- Óculos escuros de verdade e um bigode grosso no lugar da faixa preta sobre os olhos.
- Novo especial **Chuva de Granadas**, no lugar do Soco Sísmico: 8 granadas em volta, que quicam e explodem uma
  depois da outra, sem ferir o militar nem os colegas.

### Maga

- Chapéu de aprendiz roxo, que some quando ela equipa um chapéu do guarda-roupa.
- A **Nova Arcana** mantém o anel em volta e agora lança também uma bola de fogo roxa para a frente, que explode
  em fogo arcano.

### Combate

- Com o mouse, o Raio Laser e a bola de fogo viram o personagem para o lado da mira antes de disparar.
- Recarga da pistola por personagem: Militar 1,6 s, Zumbi Bot 1,9 s, Maga 2,3 s e Mutante 2,5 s. O Ciborgue
  continua o mais rápido, com cerca de 0,8 s. Antes era 1,1 s para todos.

### Manual e tela cheia

- O Manual saiu do menu principal e fica em Configurações > Manual. Ele abre dentro do jogo, no idioma do jogo,
  sem sair da tela cheia.
- No celular e no tablet, se o navegador sair da tela cheia, o próximo toque volta para ela.
- Novo botão **Instalar o jogo** no menu, quando o navegador oferece: instalado, o jogo abre em tela cheia,
  deitado e sem o aviso do navegador.

### Personagens

- Novo menu **Personagens**, com rosto, apelido, nome e sobrenome e título de cada um, e a Ficha de Personagem
  com Voltar, Mapas e Começar.
- Cada personagem ganhou nome, sobrenome e história: Zeca Engrenagem (Zumbi Bot), Lívia Vesper (Maga), Bruno
  Trovão (Militar), Ícaro Neon (Ciborgue) e Tobias Brejo (Mutante).
- A escolha de personagem troca os cartões por ◀ nome ▶ embaixo do boneco. A ficha mostra descrição, atributos,
  especial e história, e rola quando não cabe na tela.
- Na loja e no guarda-roupa dá para girar o boneco (arrastar, Q/E ou analógico direito).
- Na sala online, botão **Personagem** ao lado de Pronto, e tocar no nome abre a escolha.

### Final lendário

- Depois de vencer o OMEGA-Z pela primeira vez, um capítulo por personagem conta o seu final feliz, cada um num
  mini cenário animado de um mapa do jogo, e um epílogo reúne todos. Dá para rever pelos Créditos.

## 1.4 (27/09/2026)

### Online mais leve com a voz ligada

- A voz ficou mais leve: Opus mono, sem envio no silêncio, com correção de perdas e até 24 kbit/s. Com o
  microfone desligado, nenhum áudio é enviado.
- Quem entrou na sala mostra os estados do anfitrião no ritmo dele, com um pequeno atraso que se ajusta à rede
  (de 67 a 300 ms). A tela não para mais nem dá saltos quando a rede atrasa.
- Os jogadores remotos toleram 500 ms sem notícias antes de o boneco parar.

### Troca de anfitrião

- Quando o anfitrião sai (menu, aba fechada ou queda), o jogador de menor número assume a sala com o mesmo
  código, e a partida continua para quem ficou. Os outros se reconectam sozinhos, no mesmo número de jogador.
- No meio da fase, o jogo de quem assumiu vira o jogo de verdade: fase, vidas, armas e progresso continuam.
- Os lugares de quem está se reconectando ficam guardados por 20 s.
- Todos são avisados, a coroa mostra o anfitrião atual e "Fechar sala" virou "Sair da sala". O protocolo online
  passou para a versão 2.

### Saídas

- Todos veem quem saiu da partida ou da sala. O boneco de quem saiu some do jogo, e os inimigos procuram outro
  alvo. Fechar a aba avisa na hora.

### Escolha de personagem

- Jogando sozinho, a tela fica como a loja: o personagem em 3D e, ao lado, a lista e os detalhes. Dá para girar o
  boneco (arrastar, ←/→ ou controle) e trocar de personagem com ↑/↓.
- Com vários jogadores locais, continuam os cartões, um por jogador. Na sala online, a mesma tela abre pelo botão
  Ver os personagens.

### Cajado como bastão

- Com o cajado ativo, o soco vira uma pancada de bastão, com o cajado seguro pela ponta.

## 1.3 (26/09/2026)

### Raio Laser do Ciborgue

- O raio não aparecia: os traços de tiros e raios eram desenhados de costas para a câmera e o navegador os
  descartava. O mesmo acontecia com o rastro do rifle de precisão, a mira laser e o raio elétrico em cadeia.
- Efeito novo, com carga vermelha na mão, raio em três camadas, luz, faíscas e tremor de tela.

### Diagonais

- A velocidade na tela agora é a mesma em qualquer ângulo e em qualquer profundidade. Antes, no fundo da faixa,
  subir e descer ficava até 23% mais lento e as diagonais ficavam achatadas.
- Encostado na borda, o movimento na diagonal desliza na velocidade cheia.

### Loja

- Escolher um item veste o boneco e abre a confirmação (Comprar, Cancelar, Faltam ou Equipar). Nada é comprado
  sem confirmar.
- O boneco fica no espaço livre ao lado do painel, de corpo inteiro, e vira de costas para mostrar capas e asas.

### HUD reorganizado

- Avisos e dicas sem caixa, só texto, somem em 3 s.
- Barras de energia no alto, centralizadas, com um painel por jogador de largura fixa para caberem 5.
- Nome do mapa e progresso embaixo, no centro, com a barra do chefe logo acima. Pontuação e combo no canto
  superior direito.
- No computador, o microfone fica no canto superior esquerdo só com ícone e atalho, e o minimapa pequeno saiu (o
  mapa grande abre no M).
- No celular e no tablet, pausa, microfone, tela cheia e minimapa ficam no canto superior esquerdo, e o minimapa
  começa oculto. O botão de recarregar saiu, porque a arma já recarrega sozinha.

### Cajado e pistola

- No modo cajado, J bate com o cajado, num combo de 3 golpes.
- Quando acaba a munição de uma arma pega no chão, o robô volta sozinho para a pistola.
- O comando do combo apertado no instante do impacto não se perde mais.

## 1.2 (26/09/2026)

### App de iPhone

- O mesmo jogo empacotado com o Capacitor, como o app Android: iOS 15 ou mais novo, só paisagem, tela cheia, sem
  barra de status e com o pedido do microfone em português e inglês.
- Os gestos do sistema nas bordas ficam com o jogo, e o indicador da Tela de Início some.
- Ícone sem transparência e tela de abertura feitos a partir do robô.
- Workflow no Mac do GitHub: compila para o simulador, abre o app num iPhone simulado, gera um .ipa sem
  assinatura e, com os segredos da conta Apple, assina e envia para o TestFlight.
- Passo a passo em [docs/APP_STORE.md](docs/APP_STORE.md) e capturas da App Store para iPhone e iPad.

### Chat de voz

- No jogo online, cada par de aparelhos tem uma chamada direta, e todos ouvem todos. Funciona entre computador,
  Android e iPhone.
- O microfone começa desligado e liga pela sala, pelo botão na partida ou pela tecla V, que dá para trocar.
- A sala e os painéis mostram quem está com o microfone ligado e quem está falando. A música abaixa enquanto
  alguém fala, e há um Volume das vozes em Configurações > Áudio.
- O jogo confere a permissão do microfone antes de pedir e explica onde liberar em cada plataforma. Também avisa
  quando não há microfone, quando ele está em uso por outro app e quando a página não está em https.

### Opções da sala e correções

- Criar sala pergunta a dificuldade e se o chat de voz fica permitido. O anfitrião pode mudar as duas na sala.
- Às vezes o mesmo convidado entrava duas vezes e virava dois jogadores. Agora cada conexão vira um só jogador.
- Política de privacidade, guia da Play Store, ficha da loja, README e manual atualizados com a voz.

### iPhone pelo navegador

- Altura real da tela, sem zoom por pinça nem menu de toque longo, e som liberado no primeiro toque.
- Como o Safari do iPhone não tem tela cheia, o botão de tela cheia explica como adicionar o jogo à Tela de
  Início.

## 1.1 (26/09/2026)

- Andar para cima e para baixo tem a mesma velocidade na tela que andar para os lados. Antes era 3 vezes mais
  lento.
- Tela **Teclas do teclado**, em Controles > Trocar teclas: duas teclas por ação, aviso quando uma tecla sai de
  outra ação e Restaurar padrão. As teclas valem no jogo solo, no online e para quem está com o teclado inteiro
  no multijogador local, e aparecem nas telas e dicas com o caractere do teclado do jogador (Ç no ABNT2).
- Mouse: o botão esquerdo atira, o direito solta o especial e a rodinha liga a corrida. Mirar fica na tecla I, e
  trocar de arma em Q/E.
- Telas mais altas que a janela começam do topo, e o menu principal ficou em duas colunas para caber em 720p e
  no celular deitado.
- Capturas da loja geradas por script (`npm run store:shots`), 7 por idioma.

## 1.0 (25/09/2026)

### Multijogador online

- Botão **Jogar online**: uma pessoa cria a sala e recebe um código de 4 letras, com Copiar link, Enviar convite
  e QR code. Os outros entram pelo código ou pelo link.
- Cada um escolhe o personagem e fica pronto; o anfitrião escolhe a fase e começa a partida.
- A conexão é por WebRTC, com o serviço gratuito do PeerJS para achar a sala. O aparelho de quem criou a sala
  roda o jogo, e os outros recebem só o que mudou, cerca de 20 vezes por segundo.
- Cada um guarda o próprio progresso, e navegador e app Android jogam juntos.
- Quem sai ou cai no meio da fase fica de fora, e os outros continuam. Cada erro tem a sua mensagem: sala não
  encontrada, sala cheia, partida já começou, versões diferentes, sem internet.
- Política de privacidade atualizada.

### Multijogador local

- Até 5 jogadores na mesma tela. Os outros entram com A/Start num controle, e uma segunda pessoa no teclado
  entra com J, dividindo o teclado em esquerda e direita.
- HUD com um painel por jogador, etiqueta P1 a P5 e um anel colorido sob cada um.
- Inimigos e chefes ficam mais fortes conforme o número de jogadores, e os pontos e a sucata do chefe são
  divididos.
- Quem fica sem vidas pega uma emprestada de quem tem mais. A partida pausa se um controle desconectar.
- O resultado mostra os totais da equipe e uma linha por jogador.

### Personagens

- Quatro personagens novos além do Zumbi Bot, cada um com modelo, retrato, som e especial próprios: Maga (Nova
  Arcana), Militar (Soco Sísmico), Ciborgue (Raio Laser) e Mutante (Fúria Mutante).
- Tela **Escolha seu personagem** antes da partida, com o personagem em 3D fazendo o golpe. A escolha fica salva.

### App Android

- App com o Capacitor, em tela cheia, sempre deitado e com a tela acesa. O botão Voltar pausa a partida ou volta
  de tela.
- Workflow que gera o APK e publica a release "android", com link fixo para o download. Com a chave de upload,
  gera também o APK e o AAB assinados.
- Guia da Play Store, política de privacidade em `/privacy/` e ficha da loja em português e inglês.

### Dificuldade e tiros

- Nova dificuldade **Muito fácil**, e o Fácil ficou mais gentil com os chefes. Ao perder, o jogo oferece Tentar
  no Fácil.
- A dificuldade é escolhida na tela de mapas.
- Arma de fogo e cajado disparam sempre na faixa de profundidade do robô; o mouse escolhe só o lado.

### Inglês, celular e manual

- O jogo inteiro em português e inglês. O idioma segue o do navegador e pode ser trocado em Configurações >
  Jogo.
- Controles de toque para celular e tablet: direcional flutuante à esquerda e botões em arco à direita, com
  tamanho, opacidade e vibração ajustáveis.
- Em retrato aparece "Gire o aparelho", e o jogo pode ser adicionado à tela inicial.
- Manual de instalação local em `/manual/`, [docs/INSTALACAO.md](docs/INSTALACAO.md) e
  [docs/INSTALL.md](docs/INSTALL.md).
- Créditos com Ideia e direção de Marcelo Jaloto, Nathan Jaloto, Pedro Henrique dos Passos Gomes e Leo Becker.
- A opção Mostrar dicas passou a funcionar.

### Primeira versão

- Beat 'em up 2.5D no navegador, feito com Three.js, TypeScript e Vite, com visual e áudio gerados por código.
- 10 mapas com chefes, a Arena Final com o OMEGA-Z em 4 fases, 7 armas de fogo, armas brancas e 10 cajados
  elementais com efeitos que interagem entre si.
- Itens e power-ups, loot cosmético com guarda-roupa e loja, XP, níveis, ranking local, créditos e Novo Jogo+.
- Música procedural por mapa e efeitos sonoros sintetizados.
- CI com typecheck, testes, build e testes e2e, e deploy no GitHub Pages a cada push na `main`.
