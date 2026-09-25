# Zumbi Bot no Android e na Play Store

O app Android é o mesmo jogo do site, empacotado com o [Capacitor](https://capacitorjs.com/). O site no GitHub Pages
continua igual; o app tem só alguns ajustes de aparelho: abre em tela cheia e deitado, a tela não apaga, o botão
Voltar do Android pausa o jogo e o som para quando o app vai para segundo plano.

Tudo é gerado no GitHub Actions (workflow **Android**), então não precisa instalar o Android Studio.

## 1. APK para instalar agora (sem Play Store)

A cada atualização da `main`, o workflow publica o APK na release **Android**:

- Link fixo: https://github.com/marcelojaloto/Zumbi-Bot/releases/latest/download/zumbi-bot.apk
- No celular: abra o link, baixe e toque no arquivo. O Android vai pedir para **permitir a instalação de apps desta
  fonte** (o navegador ou o gerenciador de arquivos) — permita e instale.
- Atualizar: baixe o APK novo e instale por cima. O progresso é mantido.

Enquanto a chave de upload (passo 3) não estiver configurada, esse APK é de teste (assinado com uma chave de teste
fixa). Depois que os segredos existirem, o APK passa a ser assinado com a chave de upload. Como a assinatura muda,
na primeira troca é preciso **desinstalar o APK de teste antes** de instalar o novo, e o progresso salvo é perdido.

## 2. Conta de desenvolvedor no Google Play

1. Acesse https://play.google.com/console e crie uma conta de desenvolvedor (**pessoal** ou **organização**).
2. Pague a taxa única de registro (US$ 25 quando este guia foi escrito) e conclua a verificação de identidade.
3. Contas **pessoais** criadas a partir de novembro de 2023 precisam fazer um **teste fechado com pelo menos 12
   testadores durante 14 dias seguidos** antes de publicar em produção (passo 7). Contas de organização não têm
   essa exigência. Confira as regras atuais no Play Console, porque o Google muda esses números de tempos em tempos.

## 3. Criar a chave de upload (uma vez só)

A Play Store exige que o arquivo enviado (AAB) seja assinado com a sua **chave de upload**. O Google guarda a chave
final do app (Assinatura de apps do Google Play); a sua chave só prova que o envio veio de você.

Precisa do Java (vem com o [Android Studio](https://developer.android.com/studio) ou com o
[Temurin](https://adoptium.net/)). No terminal:

```bash
keytool -genkeypair -v -keystore zumbi-bot-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Ele pede uma senha (anote) e alguns dados (nome, cidade, país — pode preencher com os seus). Guarde o arquivo
`zumbi-bot-upload.jks` e a senha **em lugar seguro, fora do repositório**. Se perder, dá para pedir a troca da chave
de upload no Play Console, mas dá trabalho.

Transforme o arquivo em texto (Base64) para colocar no GitHub:

- **Windows (PowerShell):**
  `[Convert]::ToBase64String([IO.File]::ReadAllBytes("zumbi-bot-upload.jks")) | Set-Clipboard` (já copia)
- **macOS:** `base64 -i zumbi-bot-upload.jks | pbcopy` (já copia)
- **Linux:** `base64 -w0 zumbi-bot-upload.jks`

## 4. Segredos no GitHub

No repositório: **Settings → Secrets and variables → Actions → New repository secret**. Crie quatro segredos:

| Nome                        | Valor                                         |
| --------------------------- | --------------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | o texto Base64 do passo 3                     |
| `ANDROID_KEYSTORE_PASSWORD` | a senha do arquivo `.jks`                     |
| `ANDROID_KEY_ALIAS`         | `upload`                                      |
| `ANDROID_KEY_PASSWORD`      | a senha da chave (a mesma, se você não mudou) |

## 5. Gerar o AAB para a Play Store

1. No GitHub: **Actions → Android → Run workflow** (branch `main`).
2. Quando terminar (uns 3 minutos), abra a execução e baixe o artefato **zumbi-bot-aab-play-store**. Dentro dele está
   o `zumbi-bot.aab`.
3. Cada execução aumenta sozinha o número da versão (`versionCode`), como a Play Store exige.

## 6. Criar o app no Play Console

1. **Criar app**: nome `Zumbi Bot`, idioma padrão Português (Brasil), tipo **Jogo**, **Gratuito**. Aceite as
   declarações.
2. **Painel → Configurar o app** — preencha cada item:
   - **Política de privacidade:** `https://marcelojaloto.github.io/Zumbi-Bot/privacy/`
   - **Acesso ao app:** todas as funcionalidades disponíveis sem acesso especial.
   - **Anúncios:** o app não contém anúncios.
   - **Classificação do conteúdo:** responda o questionário (categoria Jogo). O jogo tem violência de fantasia/desenho
     contra zumbis e robôs, sem sangue realista, sem conteúdo sexual, sem apostas, sem interação entre usuários.
   - **Público-alvo:** escolha faixas de **13 anos ou mais** (marcar menores de 13 exige cumprir a política de
     Famílias).
   - **Segurança dos dados:** o app **não coleta nem compartilha dados** (tudo fica salvo só no aparelho).
   - **Apps governamentais, recursos financeiros, saúde:** não.
3. **Presença na loja → Página principal da loja**: use os textos e imagens de [`store/android/`](../store/android/)
   ([`listing.md`](../store/android/listing.md), ícone 512×512, recurso gráfico 1024×500 e capturas de tela).
   Adicione a tradução em inglês (en-US) com os textos em inglês do mesmo arquivo.

## 7. Teste fechado (contas pessoais)

1. **Testes → Teste fechado → Criar faixa** (ou use a faixa "Alpha").
2. **Testadores:** crie uma lista com os e-mails (contas Google) de pelo menos 12 pessoas.
3. **Criar versão:** envie o `zumbi-bot.aab` do passo 5, escreva as notas da versão e envie para revisão.
4. Depois de aprovado, mande o **link de participação** para os testadores. Cada um precisa aceitar o convite e
   instalar pela Play Store. Eles devem continuar inscritos por 14 dias.
5. Passados os 14 dias, o Painel libera **Solicitar acesso à produção**. Responda às perguntas sobre o teste.

## 8. Produção

Com o acesso liberado: **Produção → Criar versão**, envie o AAB mais recente, escolha os países e envie para revisão.
A primeira revisão costuma levar alguns dias.

## 9. Atualizações

1. Mudanças no jogo entram na `main` normalmente: o site é atualizado e o workflow Android gera APK e AAB novos.
2. Baixe o artefato **zumbi-bot-aab-play-store** da execução mais recente do workflow Android na `main`.
3. No Play Console, crie uma nova versão (na faixa de teste ou de produção) com esse AAB.

## Detalhes técnicos

- Identificador do app (não pode mudar depois de publicado): `io.github.marcelojaloto.zumbibot`.
- Build do jogo para o app: `npm run build:app` (gera `dist-app/`, servido na raiz do WebView). Copiar para o projeto
  Android: `npm run android:sync`. Com o Android Studio instalado, `npx cap open android` abre o projeto.
- O código exclusivo do app fica atrás da constante `__NATIVE__`, que é `false` no build do site e some dele.
- Android mínimo: 7.0 (API 24). Alvo: API 36.
- Um aparelho com o APK do GitHub (assinado pela sua chave de upload) e outro com a versão da Play Store (assinada
  pelo Google) têm assinaturas diferentes: para trocar de um para o outro, desinstale antes.
