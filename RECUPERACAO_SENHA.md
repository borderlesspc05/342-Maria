# Recuperação de senha

O link de recuperação de senha usa **Firebase Authentication**: o e-mail é enviado pelo próprio Firebase (não por EmailJS nem por Cloud Functions).

## Para funcionar corretamente

1. **Firebase Console → Authentication → Sign-in method**  
   - Certifique-se de que **E-mail/Senha** está **ativado**.

2. **Firebase Console → Authentication → Settings → Authorized domains**  
   - Adicione o domínio do seu app, por exemplo:
     - `localhost` (para desenvolvimento)
     - `maria-44e49.web.app` (se usar Firebase Hosting)
     - Seu domínio customizado, se houver  
   - O link que o usuário clica no e-mail redireciona para um domínio que **precisa** estar nessa lista.

3. **(Opcional) Personalizar o e-mail**  
   - Em **Authentication → Templates** escolha **Redefinir senha** e edite o texto do e-mail, se quiser.

## Fluxo

1. Usuário informa o e-mail em **Esqueci minha senha**.
2. O app chama `sendPasswordResetEmail` do Firebase.
3. O Firebase envia o e-mail (somente se existir conta com esse e-mail).
4. O usuário clica no link do e-mail, redefine a senha na página do Firebase e é redirecionado para a URL configurada (por padrão `/login` do app).

## Variável de ambiente (opcional)

No `.env` você pode definir a URL base do app para o link de “continuar” após redefinir a senha:

```env
VITE_APP_URL=https://maria-44e49.web.app
```

Se não for definida, será usada `https://maria-44e49.web.app`.
