# Notificações por e-mail

As notificações por e-mail são enviadas automaticamente quando uma notificação é criada no Firestore, desde que o usuário tenha ativado o envio por e-mail nas configurações da página **Notificações**.

## Como funciona

1. **Trigger** `onNotificacaoCriada`: ao criar um documento na coleção `notificacoes`, a Cloud Function:
   - Lê as configurações do usuário em `configuracoes_notificacoes/{userId}`;
   - Verifica se o tipo da notificação está habilitado para e-mail;
   - Obtém o e-mail do usuário via Firebase Auth;
   - Envia o e-mail via [Resend](https://resend.com) e atualiza o documento com `emailEnviado: true`.

2. **Callable** `sendTestEmail`: permite que o usuário logado envie um e-mail de teste a partir da página de Notificações (botão "Enviar e-mail de teste").

## Variáveis de ambiente (Cloud Functions)

Configure no **Firebase Console** → **Project settings** → **Service accounts** / **Functions** → **Environment variables**, ou no deploy:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `RESEND_API_KEY` | Sim | Chave de API do Resend. Crie em [resend.com/api-keys](https://resend.com/api-keys). |
| `EMAIL_FROM` | Não | Remetente no formato `"Nome <email@dominio.com>"`. Se não definido, usa `onboarding@resend.dev` (apenas para testes no Resend). |
| `APP_URL` | Não | URL base do app (ex.: `https://seu-app.web.app`) para links "Ver no sistema" nos e-mails. |

### Definir no deploy (Firebase CLI)

```bash
firebase functions:config:set resend.api_key="re_xxxx"
# Ou use Secret Manager (recomendado para produção):
# firebase functions:secrets:set RESEND_API_KEY
```

Para usar variáveis de ambiente no código, no Firebase Functions (2nd gen) use **Environment configuration** no console ou defina no `firebase.json` / em tempo de deploy. Para Node 20 e `process.env`, defina no **Google Cloud Console** → **Cloud Functions** → sua função → **Edit** → **Runtime, build, connections and security** → **Environment variables**.

## Resend

- Cadastre-se em [resend.com](https://resend.com).
- Em produção, use um **domínio verificado** no Resend e defina `EMAIL_FROM` com esse domínio (ex.: `Sistema RH <notificacoes@seudominio.com>`).
- O endereço `onboarding@resend.dev` serve apenas para testes e tem limite de envio.

## Tipos de notificação que disparam e-mail

O envio depende dos checkboxes em **Configurações de Notificações**:

- Documentos vencendo  
- Documentos vencidos  
- Prêmios lançados  
- Boletins pendentes  

Os tipos "sistema" e "outro" são enviados se "Receber notificações por e-mail" estiver ativo.

## Build e deploy

```bash
cd functions
npm run build
firebase deploy --only functions
```

As funções exportadas são: `onNotificacaoCriada` (trigger) e `sendTestEmail` (callable).
