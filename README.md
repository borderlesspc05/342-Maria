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
npm run firebase:deploy:rules    # regras Firestore (obrigatório para gestor criar colaborador)
npm run firebase:deploy:storage  # regras Storage
npm run firebase:deploy:functions # Cloud Functions (opcional; há fallback REST)
npm run firebase:deploy          # deploy completo
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
