# Sistema de Gestão RH — 342 Maria

Aplicação web (React + TypeScript + Vite) com backend Firebase para gestão de RH: colaboradores, caderno virtual, prêmios, boletins, documentações e financeiro.

## Requisitos

- Node.js 20+
- Conta Firebase (projeto configurado)

## Instalação

```bash
npm install
cd functions && npm install && cd ..
cp .env.example .env
# Preencha as variáveis VITE_FIREBASE_* e VITE_SUPPORT_WHATSAPP no .env
```

## WhatsApp (suporte)

Configure no `.env`:

```env
VITE_SUPPORT_WHATSAPP=5511999999999
VITE_SUPPORT_WHATSAPP_LABEL=Suporte RH
```

O app exibe botão flutuante, links no footer, login, alertas de documentos e contato direto com colaboradores (quando telefone cadastrado).

## Desenvolvimento

```bash
npm run dev
```

Acesse http://localhost:5173

## Build de produção

```bash
npm run build
npm run preview
```

## Deploy Firebase

```bash
npm run firebase:deploy:hosting   # frontend (https://maria-44e49.web.app)
npm run firebase:deploy:rules     # regras Firestore
npm run firebase:deploy:storage   # regras Storage
npm run firebase:deploy:functions   # Cloud Functions (plano Blaze)
npm run firebase:deploy           # deploy completo
```

## Deploy Netlify

O repositório já inclui `netlify.toml` (build, SPA redirects, Node 20).

### 1. Conectar o repositório

1. Acesse [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Conecte o GitHub: `borderlesspc05/342-Maria`
3. Branch: `main`
4. Netlify detecta automaticamente:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`

### 2. Variáveis de ambiente (Site settings → Environment variables)

| Variável | Obrigatório | Exemplo |
|----------|:-----------:|---------|
| `VITE_FIREBASE_API_KEY` | ✓ | (Firebase Console → Project settings) |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✓ | `maria-44e49.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ✓ | `maria-44e49` |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✓ | `maria-44e49.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✓ | `744713430025` |
| `VITE_FIREBASE_APP_ID` | ✓ | `1:744713430025:web:...` |
| `VITE_APP_URL` | ✓ | `https://seu-site.netlify.app` |
| `VITE_ALLOW_SETUP` | ✓ | `false` |
| `VITE_SUPPORT_WHATSAPP` | | `5511999999999` |
| `VITE_SUPPORT_WHATSAPP_LABEL` | | `Suporte RH` |
| `VITE_EMAILJS_*` | | (opcional) |

> Sem as variáveis `VITE_*`, o build usa fallbacks do código — funciona, mas não é ideal para produção.

### 3. Firebase Auth — domínio autorizado

No [Firebase Console](https://console.firebase.google.com/project/maria-44e49/authentication/settings):

**Authentication → Settings → Authorized domains** → adicione:

- `seu-site.netlify.app`
- domínio customizado (se houver)

Sem isso, login e recuperação de senha falham no Netlify.

### 4. Deploy

- **Automático:** cada push em `main` dispara build + deploy
- **Manual (CLI):** `npx netlify-cli deploy --prod` (após `netlify link`)

### 5. Backend (Firestore / Functions)

O Netlify hospeda só o **frontend**. Firestore, Auth e Storage continuam no Firebase (`maria-44e49`). Deploy das regras:

```bash
npm run firebase:deploy:rules
```


## Papéis de acesso (MVP)

| Tela | Admin | Gestor | Colaborador |
|------|:-----:|:------:|:-----------:|
| Dashboard, Notificações, Caderno Virtual, Perfil | ✓ | ✓ | ✓ |
| Colaboradores, Prêmios, Boletins, Documentações, Relatórios, Docs. Financeiros | ✓ | ✓ | |
| Administração, Financeiro, Backup, Configurações | ✓ | | |

## Contas de teste (ambiente dev)

Crie com `node scripts/create-test-users.mjs` (requer service account ou login Firebase CLI).

| Papel | E-mail | Senha |
|-------|--------|-------|
| Admin | admin@gmail.com | 123456 |
| Gestor | gestor.maria@borderless.dev | Gestor@2026 |
| Colaborador | colaborador.maria@borderless.dev | Colab@2026 |

## Setup inicial

- Em **dev**, acesse `/setup-admin` para criar o primeiro admin.
- Em **produção**, defina `VITE_ALLOW_SETUP=false` (padrão) para bloquear essa rota.

## Scripts úteis

```bash
npm run lint
npm test
node scripts/create-test-users.mjs
```
