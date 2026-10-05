# Ranking Global (Firebase)

O **Ranking Pessoal** fica no aparelho e funciona sempre. O **Ranking Global** junta o melhor resultado de cada
jogador (cada aparelho) que escolheu participar, numa lista só, e precisa de um lugar na internet para guardar os
resultados. Esse lugar é um projeto **gratuito** no [Firebase](https://firebase.google.com/) (Google), na conta
`jaloto.software@gmail.com`, a mesma das lojas.

Enquanto o Firebase não estiver configurado (ou se ele estiver fora do ar, ou o aparelho estiver sem internet), o
jogo **não mostra** o botão do Ranking Global e tudo continua igual. Os resultados feitos sem internet ficam
guardados e são enviados depois.

## Como funciona

- O ranking global começa **desligado**. O jogador entra tocando em **Participar**, na tela do Ranking Global, e
  sai quando quiser em **Sair do ranking global**. É a configuração mais protetiva por padrão, como pede o ECA
  Digital (Lei 15.211/2025, art. 7º).
- Ao participar, o aparelho entra com uma **conta anônima** do Firebase (sem e-mail, sem dados; só um código
  aleatório). Sempre que uma jornada termina e vira o **1º lugar do Ranking Pessoal**, o jogo manda esse resultado
  para `ranking/<código do aparelho>` no banco.
- O registro **não tem nome**: só pontuação, mapas vencidos, onde a jornada parou, personagens, nível e data. Os
  outros jogadores veem os apelidos dos personagens; o nome escrito no ranking pessoal fica no aparelho, e só a
  linha do próprio jogador mostra esse nome, na tela dele.
- As [regras do banco](../firebase/database.rules.json) deixam qualquer um **ler** o ranking, mas cada aparelho só
  **escreve o próprio** registro, e só com números, datas e códigos de mapa e de personagem (letras minúsculas).
  Não há onde gravar texto livre, então não há conteúdo de usuário para moderar. Ao ler, o jogo ainda descarta o
  que não for um mapa ou personagem do jogo.
- **Sair** apaga o registro e a conta anônima. Sem internet, o jogo termina a exclusão na próxima abertura.
- A tela mostra os 100 melhores.

## Passo a passo (uns 10 minutos)

Os nomes dos menus do console mudam de vez em quando. Se algum não bater, procure direto por **Authentication** e
**Realtime Database**.

### 1. Criar o projeto

1. Entre em https://console.firebase.google.com com a conta `jaloto.software@gmail.com`.
2. **Criar um projeto** (ou "Adicionar projeto") > nome, por exemplo, `zumbi-bot` > pode **desativar o Google
   Analytics** (não é usado) > **Criar projeto**.
3. Em **Configurações do projeto > Usuários e permissões**, adicione `marcelojaloto@gmail.com` como
   **Proprietário**, para não perder o acesso se uma das contas tiver problema.

### 2. Ligar o login anônimo

1. No menu à esquerda: **Authentication** > **Vamos começar**.
2. Aba **Método de login** > **Anônimo** > ative > **Salvar**.

### 3. Criar o banco (Realtime Database)

1. No menu: **Realtime Database** > **Criar banco de dados**.
2. Escolha o local **Estados Unidos (us-central1)** (o Realtime Database não tem região no Brasil; a política de
   privacidade já informa que os dados ficam nos EUA) > **Iniciar no modo bloqueado** > **Ativar**.
3. Aba **Regras**: apague o que estiver lá, cole todo o conteúdo do arquivo
   [`firebase/database.rules.json`](../firebase/database.rules.json) e toque em **Publicar**.
4. Aba **Dados**: copie o endereço que aparece no alto, parecido com
   `https://zumbi-bot-default-rtdb.firebaseio.com`: é a **URL do banco**.

### 4. Pegar a chave da API

1. Engrenagem ao lado de "Visão geral do projeto" > **Configurações do projeto** > aba **Geral**.
2. Copie a **Chave de API da Web** (começa com `AIza...`). Se ela não aparecer, registre um app Web no projeto
   (ícone `</>`, sem Hosting) e copie o `apiKey` do trecho de configuração.

   > Essa chave não é secreta: ela vai dentro do jogo, como em qualquer site com Firebase. Quem protege os dados são
   > as regras do passo 3. Não restrinja a chave por domínio (HTTP referrer) no Google Cloud: os apps Android e iOS
   > chamam o Firebase a partir de `https://localhost` e `capacitor://localhost`, e o ranking sumiria neles.

### 5. Colocar os dois valores no GitHub

1. No GitHub, abra o repositório > **Settings** > **Secrets and variables** > **Actions** > aba **Variables** >
   **New repository variable**.
2. Crie duas variáveis:
   - `FIREBASE_API_KEY` = a chave do passo 4
   - `FIREBASE_DB_URL` = a URL do banco do passo 3
3. Publique de novo: aba **Actions** > **Deploy GitHub Pages** > **Run workflow** (e o mesmo em **Android** para o
   APK, e em **iOS** para o app do iPhone). A próxima atualização da `main` também já usa os valores.

Pronto: no jogo, **Ranking > 🌎 Ranking Global > Participar**.

## Moderação e pedidos

- **Resultado impossível** (trapaça): **Realtime Database > Dados > ranking** > passe o mouse no registro > **✕**.
  Para aquele aparelho não voltar, copie o código do registro, abra **Authentication > Usuários**, procure o
  código e **desative a conta**: o aparelho para de conseguir gravar (em até uma hora, quando o acesso dele vence).
- **Pedido de exclusão por e-mail** (de quem não tem mais o jogo): o jogo não sabe quem é quem, então peça a
  pontuação, a data e os personagens do resultado, ache o registro em **Dados > ranking** e apague. Apague também a
  conta em **Authentication > Usuários**. Responda em até 15 dias.

## Custos

O plano gratuito (**Spark**) aguenta com folga: cada registro tem poucas centenas de bytes e a lista dos 100
melhores é baixada só quando alguém abre o Ranking Global (no máximo uma vez por minuto por aparelho).
