# Notificações por e-mail (plano Spark – sem Cloud Functions)

O envio de e-mails usa **EmailJS** no frontend, sem precisar de Cloud Functions nem do plano Blaze do Firebase.

---

## 1. Criar conta no EmailJS

1. Acesse **https://www.emailjs.com** e crie uma conta (grátis).
2. No painel, anote:
   - **Public Key** (em Account → API Keys).

---

## 2. Configurar um serviço de e-mail

1. No EmailJS: **Email Services** → **Add New Service**.
2. Escolha seu provedor (Gmail, Outlook, ou **EmailJS** para testes).
3. Para **EmailJS** (teste): use o serviço padrão; não precisa configurar SMTP.
4. Para **Gmail/Outlook**: siga as instruções do EmailJS para conectar (acesso de app, etc.).
5. Crie o serviço e anote o **Service ID** (ex.: `service_xxxxx`).

---

## 3. Criar um template

1. **Email Templates** → **Create New Template**.
2. Em **Content**, use as variáveis que o app envia:

   - `{{to_email}}` – destinatário  
   - `{{subject}}` – assunto  
   - `{{message}}` – corpo da mensagem (texto)  
   - `{{app_name}}` – nome do sistema  
   - `{{link}}` – link opcional (pode estar vazio)

   Exemplo de corpo:

   ```
   Assunto: {{subject}}
   
   {{message}}
   
   {% if link %}Acesse: {{link}}{% endif %}
   ```

3. Em **Settings**:
   - **To Email**: use `{{to_email}}`.
   - **Subject**: use `{{subject}}`.
   - **Reply To** (opcional): seu e-mail.

4. Salve e anote o **Template ID** (ex.: `template_xxxxx`).

---

## 4. Variáveis no projeto

No arquivo **`.env`** na raiz do projeto (junto do `package.json`), adicione:

```env
# EmailJS (notificações por e-mail – plano Spark)
VITE_EMAILJS_SERVICE_ID=service_xxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxx
VITE_EMAILJS_PUBLIC_KEY=sua_public_key
```

Substitua pelos valores do seu serviço e template no EmailJS.

Opcional, para links “Ver no sistema” nos e-mails:

```env
VITE_APP_URL=https://maria-44e49.web.app
```

Reinicie o servidor de desenvolvimento (`npm run dev`) após alterar o `.env`.

---

## 5. Como funciona

- Ao **criar uma notificação** no app, o frontend verifica as configurações do usuário (Receber por e-mail, tipos ativos, etc.).
- Se estiver habilitado, o app envia o e-mail via EmailJS e marca a notificação com **E-mail enviado**.
- O **e-mail do destinatário** é obtido das configurações de notificações. Cada usuário deve abrir **Notificações → Configurações** e clicar em **Salvar** pelo menos uma vez; assim o e-mail da conta é gravado e as notificações por e-mail passam a funcionar para ele.
- **E-mail de teste**: na página Notificações → Configurações, o botão “Enviar e-mail de teste” envia um e-mail para o e-mail da sua conta.

---

## 6. Limites (plano grátis EmailJS)

- Cerca de **200 e-mails/mês** no plano gratuito.
- Útil para testes e baixo volume; para mais volume, use um plano pago do EmailJS ou, no futuro, Cloud Functions (plano Blaze) com Resend.

---

## 7. Resumo

| Onde        | O quê |
|------------|--------|
| EmailJS    | Conta, Service ID, Template ID, Public Key |
| `.env`     | `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, `VITE_EMAILJS_PUBLIC_KEY` (e opcionalmente `VITE_APP_URL`) |
| Template   | Variáveis: `to_email`, `subject`, `message`, `app_name`, `link` |

Depois de configurar, salve as configurações em Notificações e use “Enviar e-mail de teste” para validar.
