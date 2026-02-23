# Firebase – CLI e regras

## Firebase CLI

O projeto usa o **Firebase CLI** (`firebase-tools`) para publicar regras (e, no futuro, Hosting/Functions) no projeto **maria-44e49**.

### Instalação

```bash
npm install
```

(O pacote `firebase-tools` está em `devDependencies`.)

### Login (uma vez)

Use a conta **borderlesspc15@gmail.com** para ter permissão no projeto:

```bash
npx firebase login
```

Quando o navegador abrir, entre com **borderlesspc15@gmail.com**. Essa conta precisa ter permissão (ex.: Editor ou Proprietário) no projeto **maria-44e49** no [Google Cloud IAM](https://console.developers.google.com/iam-admin/iam?project=maria-44e49) para o deploy das regras funcionar.

### Publicar regras

- **Regras do Firestore (banco de dados) – uso normal:**  
  `npm run firebase:deploy:rules`  
  ou  
  `npm run firebase:deploy:firestore`

- **Regras do Storage (arquivos):**  
  `npm run firebase:deploy:storage`  
  Só use depois de ativar o Firebase Storage no projeto: [Console → Storage → Get Started](https://console.firebase.google.com/project/maria-44e49/storage).

- **Tudo configurado em firebase.json (regras, hosting, etc.):**  
  `npm run firebase:deploy`

### Arquivos

| Arquivo           | Uso                                      |
|------------------|------------------------------------------|
| `firebase.json`  | Configuração do projeto (regras, etc.)   |
| `.firebaserc`    | Projeto padrão (`maria-44e49`)           |
| `firestore.rules`| Regras do Firestore                      |
| `storage.rules`  | Regras do Storage                        |

---

## Chave do Firebase Admin SDK (arquivo `.json`)

O arquivo `*firebase*adminsdk*.json` (service account key) **não deve** ser commitado e está no `.gitignore`.

- **Uso correto:** em ambiente **backend** (Node.js), por exemplo:
  - Cloud Functions
  - Servidor próprio (API, jobs, etc.)
- **Nunca:** no frontend (React/Vite), nem em repositório público.

Para Cloud Functions ou um backend Node.js, use a chave apenas no servidor (variável de ambiente ou arquivo fora do repositório) e a biblioteca `firebase-admin` nesse backend, não neste app React.
