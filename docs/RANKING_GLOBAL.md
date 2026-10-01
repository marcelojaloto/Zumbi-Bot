# Ranking Global (Firebase)

O **Ranking Pessoal** fica no aparelho e funciona sempre. O **Ranking Global** junta o melhor resultado de cada
jogador (cada aparelho) numa lista só, e precisa de um lugar na internet para guardar os resultados. Esse lugar é um
projeto **gratuito** no [Firebase](https://firebase.google.com/) (Google), na sua conta.

Enquanto o Firebase não estiver configurado (ou se ele estiver fora do ar, ou o aparelho estiver sem internet), o
jogo **não mostra** o botão do Ranking Global e tudo continua igual. Os resultados feitos sem internet ficam
guardados e são enviados depois.

## Como funciona

- Cada aparelho entra com uma **conta anônima** do Firebase (sem e-mail, sem dados; só um código aleatório).
- Quando o jogador termina uma jornada (perdeu todas as vidas ou terminou o jogo) e ela vira o **1º lugar do
  Ranking Pessoal**, o jogo manda esse resultado para `ranking/<código do aparelho>` no banco. Trocar o nome depois
  também atualiza o registro.
- As [regras do banco](../firebase/database.rules.json) deixam qualquer um **ler** o ranking, mas cada aparelho só
  **escreve o próprio** registro, e só com os campos e tamanhos esperados (nome até 16 letras, pontuação, mapas,
  personagens, nível e data).
- A tela mostra os 100 melhores.

## Passo a passo (uns 10 minutos)

### 1. Criar o projeto

1. Entre em https://console.firebase.google.com com a sua conta Google.
2. **Criar um projeto** (ou "Adicionar projeto") > nome, por exemplo, `zumbi-bot` > pode **desativar o Google
   Analytics** (não é usado) > **Criar projeto**.

### 2. Ligar o login anônimo

1. No menu à esquerda: **Criação > Authentication** > **Vamos começar**.
2. Aba **Método de login** > **Anônimo** > ative > **Salvar**.

### 3. Criar o banco (Realtime Database)

1. No menu: **Criação > Realtime Database** > **Criar banco de dados**.
2. Escolha o local (por exemplo **Estados Unidos (us-central1)**) > **Iniciar no modo bloqueado** > **Ativar**.
3. Aba **Regras**: apague o que estiver lá, cole todo o conteúdo do arquivo
   [`firebase/database.rules.json`](../firebase/database.rules.json) e toque em **Publicar**.
4. Aba **Dados**: copie o endereço que aparece no alto, parecido com
   `https://zumbi-bot-default-rtdb.firebaseio.com`: é a **URL do banco**.

### 4. Pegar a chave da API

1. Engrenagem ao lado de "Visão geral do projeto" > **Configurações do projeto** > aba **Geral**.
2. Copie a **Chave de API da Web** (começa com `AIza...`).

   > Essa chave não é secreta: ela vai dentro do jogo, como em qualquer site com Firebase. Quem protege os dados são
   > as regras do passo 3.

### 5. Colocar os dois valores no GitHub

1. No GitHub, abra o repositório > **Settings** > **Secrets and variables** > **Actions** > aba **Variables** >
   **New repository variable**.
2. Crie duas variáveis:
   - `FIREBASE_API_KEY` = a chave do passo 4
   - `FIREBASE_DB_URL` = a URL do banco do passo 3
3. Publique de novo: aba **Actions** > **Deploy GitHub Pages** > **Run workflow** (e o mesmo em **Android** para o
   APK, e em **iOS** para o app do iPhone). A próxima atualização da `main` também já usa os valores.

Pronto: no jogo, **Ranking > 🌎 Ranking Global**.

> Se preferir, mande os dois valores numa conversa e eles podem ser escritos direto em
> [`src/net/firebaseConfig.ts`](../src/net/firebaseConfig.ts); o efeito é o mesmo.

## Moderação e custos

- **Apagar um registro** (nome ofensivo, pontuação impossível): **Realtime Database > Dados > ranking** > passe o
  mouse no registro > **✕**. Se aquele aparelho fizer um resultado melhor depois, ele volta.
- O plano gratuito (**Spark**) aguenta com folga: cada registro tem poucas centenas de bytes e a lista dos 100
  melhores é baixada só quando alguém abre o Ranking Global (no máximo uma vez por minuto por aparelho).
- A política de privacidade ([`public/privacy/index.html`](../public/privacy/index.html)) já descreve o ranking
  global. Nas lojas, atualize a declaração de dados como está em [PLAY_STORE.md](PLAY_STORE.md) e
  [APP_STORE.md](APP_STORE.md).
