# Zumbi Bot no iPhone e na App Store

O app de iPhone é o mesmo jogo do site, empacotado com o [Capacitor](https://capacitorjs.com/) (como o app Android).
Ele abre em tela cheia e deitado, esconde a barra de status e o indicador da Tela de Início, e pede o **microfone**
só quando o jogador liga o microfone no chat de voz online. O jogo inteiro vem dentro do app: funciona sem
internet (só o jogo online usa a rede).

Tudo é gerado no GitHub Actions (workflow **iOS**, num Mac do GitHub), então **não precisa de Mac**. Para instalar
num iPhone de verdade e publicar, precisa de uma conta de desenvolvedor Apple.

> Sem iPhone? Dá para jogar no iPhone pelo navegador (Safari): https://marcelojaloto.github.io/Zumbi-Bot/ — e, pela
> opção **Compartilhar → Adicionar à Tela de Início**, ele abre em tela cheia como um app.

## 1. O que o workflow iOS gera (sem conta Apple)

A cada PR e a cada atualização da `main`, o workflow **iOS**:

1. Compila o app para o simulador de iPhone (prova que o projeto compila).
2. Abre o app num iPhone simulado e tira uma foto da tela (artefato **zumbi-bot-ios-simulador**, com a foto
   `simulador.png` e o app `zumbi-bot-simulador.zip`, que roda no Simulador do Xcode num Mac).
3. Gera um `.ipa` **sem assinatura** (artefato **zumbi-bot-ios-sem-assinatura**). Ele não instala sozinho num
   iPhone: o iOS só aceita apps assinados por uma conta Apple.

## 2. Conta de desenvolvedor Apple

1. Acesse https://developer.apple.com/programs/ e entre no **Apple Developer Program** (US$ 99 por ano quando este
   guia foi escrito) — como **pessoa física** ou **organização** (organização pede um número D-U-N-S).
2. Anote o **Team ID** (10 letras e números): https://developer.apple.com/account → **Membership details**.

## 3. Identificador do app (App ID)

Em https://developer.apple.com/account/resources/identifiers → **+** → **App IDs** → **App**:

- Descrição: `Zumbi Bot`
- Bundle ID (explícito): `io.github.marcelojaloto.zumbibot` (o mesmo do app Android)
- Não precisa marcar nenhum recurso extra.

## 4. Certificado de distribuição (sem Mac)

No terminal (Linux, macOS ou o Git Bash do Windows), crie a chave e o pedido de certificado:

```bash
openssl genrsa -out zumbibot.key 2048
openssl req -new -key zumbibot.key -out zumbibot.csr -subj "/emailAddress=SEU_EMAIL/CN=SEU NOME/C=BR"
```

Em https://developer.apple.com/account/resources/certificates → **+** → **Apple Distribution** → envie o
`zumbibot.csr` e baixe o certificado (`distribution.cer`). Junte certificado e chave num `.p12` (escolha uma senha e
anote):

```bash
openssl x509 -inform DER -in distribution.cer -out distribution.pem
openssl pkcs12 -export -legacy -inkey zumbibot.key -in distribution.pem -out zumbibot.p12
```

Guarde `zumbibot.key`, `zumbibot.p12` e a senha **em lugar seguro, fora do repositório**.

## 5. Perfil de distribuição

Em https://developer.apple.com/account/resources/profiles → **+** → **App Store Connect** → escolha o App ID do
passo 3 e o certificado do passo 4 → nome `Zumbi Bot App Store` → baixe o arquivo `.mobileprovision`.

## 6. App no App Store Connect e chave da API

1. https://appstoreconnect.apple.com → **Apps → + → Novo app**: plataforma iOS, nome `Zumbi Bot` (se já existir,
   por exemplo `Zumbi Bot: Robôs x Zumbis`), idioma principal Português (Brasil), Bundle ID do passo 3, SKU
   `zumbibot`.
2. **Usuários e acesso → Integrações → API do App Store Connect → Chaves da equipe → +**: nome `GitHub`, acesso
   **App Manager**. Baixe o arquivo `AuthKey_XXXX.p8` (só dá para baixar uma vez) e anote o **Key ID** e o
   **Issuer ID** (aparece no topo da página).

## 7. Segredos no GitHub

Transforme os arquivos em texto (Base64):

- **macOS:** `base64 -i ARQUIVO | pbcopy` (já copia)
- **Linux:** `base64 -w0 ARQUIVO`
- **Windows (PowerShell):** `[Convert]::ToBase64String([IO.File]::ReadAllBytes("ARQUIVO")) | Set-Clipboard`

No repositório: **Settings → Secrets and variables → Actions → New repository secret**:

| Nome                                | Valor                                     |
| ----------------------------------- | ----------------------------------------- |
| `APPLE_TEAM_ID`                     | o Team ID do passo 2                      |
| `APPLE_CERTIFICATE_P12_BASE64`      | o `zumbibot.p12` em Base64                |
| `APPLE_CERTIFICATE_PASSWORD`        | a senha do `.p12`                         |
| `APPLE_PROVISIONING_PROFILE_BASE64` | o `.mobileprovision` do passo 5 em Base64 |
| `APPSTORE_API_KEY_ID`               | o Key ID do passo 6                       |
| `APPSTORE_API_ISSUER_ID`            | o Issuer ID do passo 6                    |
| `APPSTORE_API_KEY_P8_BASE64`        | o `AuthKey_XXXX.p8` em Base64             |

## 8. TestFlight (instalar no iPhone)

1. No GitHub: **Actions → iOS → Run workflow** (branch `main`). Com os segredos, o workflow assina o app e envia para
   o App Store Connect (versão `1.2.<número da execução>`).
2. Depois de uns 15–30 minutos o build aparece em **App Store Connect → TestFlight**. Responda à pergunta de
   criptografia se aparecer (o app já declara que só usa a criptografia padrão).
3. **Teste interno:** adicione você (e quem mais tiver acesso à conta) como testador. Instale o app **TestFlight** no
   iPhone e aceite o convite.
4. **Teste externo** (amigos, até 10 mil pessoas por link público): crie um grupo, adicione o build e envie para a
   revisão beta da Apple (costuma levar um dia).

Primeiros testes recomendados: permissão do microfone (o iPhone pergunta ao tocar em "Ligar microfone"), chat de voz
com um Android ou computador na mesma sala, som com a chave de silencioso, tela deitada e o entalhe (notch).

## 9. Publicar na App Store

Em **App Store Connect → o app → versão iOS**:

- **Capturas de tela:** [`store/ios/screenshots/`](../store/ios/screenshots/) — `iphone/` (6,9", 2868×1320) e
  `ipad/` (13", 2752×2064), em português e inglês. Para gerar de novo: `npm run store:shots:ios`.
- **Textos:** use os de [`store/android/listing.md`](../store/android/listing.md) (descrição completa) e:
  - Subtítulo (30): `Robôs contra o apocalipse zumbi` / `Robots vs. the zombie apocalypse`
  - Palavras-chave (100): `zumbi,robô,beat em up,ação,arcade,multijogador,online,chefe,luta,magia` /
    `zombie,robot,beat em up,action,arcade,multiplayer,online,boss,fighting,magic`
  - URL de suporte: `https://github.com/marcelojaloto/Zumbi-Bot` · Política de privacidade:
    `https://marcelojaloto.github.io/Zumbi-Bot/privacy/`
- **Privacidade do app:** o jogo não coleta dados (o progresso fica no aparelho; no jogo online, nome, comandos e voz
  vão direto para os outros jogadores da sala, criptografados, e nada é guardado). Dá para declarar **"Dados não
  coletados"**. Se preferir declarar de forma conservadora: **Áudio (voz)** — não vinculado à identidade, sem
  rastreamento, para funcionalidade do app.
- **Classificação etária:** violência de desenho/fantasia **frequente** (lutas contra zumbis e robôs, sem sangue
  realista); **comunicação entre usuários: sim** (chat de voz opcional numa sala com código); sem compras, sem
  navegação livre na internet. A Apple calcula a idade a partir das respostas.
- **Notas para a revisão:** "O jogo funciona offline (um jogador). O jogo online precisa de dois aparelhos: em um,
  Jogar online → Criar sala; no outro, Entrar numa sala com o código de 4 letras. O chat de voz é opcional e pede o
  microfone só ao tocar em Ligar microfone."

Envie para a revisão. A primeira costuma levar de um a três dias.

## 10. Atualizações

Cada atualização da `main` gera um build novo no TestFlight (com os segredos). No App Store Connect, crie a nova
versão, escolha o build e envie para a revisão.

## Detalhes técnicos

- Identificador do app: `io.github.marcelojaloto.zumbibot` (não pode mudar depois de publicado).
- Projeto Xcode em `ios/` (Swift Package Manager, iOS 15 ou mais novo). Copiar o jogo para ele: `npm run ios:sync`.
  Num Mac: `npx cap open ios` abre o projeto no Xcode.
- Ícone e tela de abertura: `npm run ios:assets` (desenha o robô do ícone; o ícone sai sem transparência, como a App
  Store exige).
- Texto do pedido de microfone: `NSMicrophoneUsageDescription` em `ios/App/App/Info.plist` (inglês) e
  `ios/App/App/pt-BR.lproj/InfoPlist.strings` (português).
- `GameViewController` (em `SceneDelegate.swift`) esconde o indicador da Tela de Início e segura os gestos do sistema
  nas bordas da tela durante o jogo.
- O código exclusivo dos apps fica atrás da constante `__NATIVE__`; o texto de ajuda do microfone muda no app de
  iPhone (Ajustes do iPhone → Apps → Zumbi Bot → Microfone).
