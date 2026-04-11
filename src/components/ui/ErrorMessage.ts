interface FirebaseError {
  code?: string;
  message?: string;
}

export default function getFirebaseErrorMessage(
  error: string | FirebaseError
): string {
  if (typeof error === "string") {
    return error;
  }

  const errorCode = error?.code || "";

  switch (errorCode) {
    case "auth/user-not-found":
      return "Usuário não encontrado. Verifique seu email.";

    case "auth/wrong-password":
      return "Senha incorreta. Tente novamente.";

    case "auth/invalid-credential":
      return "Credenciais inválidas. Verifique a senha atual e tente novamente.";

    case "auth/invalid-email":
      return "Email inválido. Verifique o formato.";

    case "auth/too-many-requests":
      return "Muitas tentativas. Tente novamente em alguns minutos.";

    case "auth/user-disabled":
      return "Conta desabilitada. Entre em contato com o suporte.";

    case "auth/network-request-failed":
      return "Erro de conexão. Verifique sua internet.";

    case "auth/invalid-api-key":
      return "Erro de configuração. Entre em contato com o suporte.";

    case "auth/operation-not-allowed":
      return "Recuperação por e-mail não está habilitada. Entre em contato com o suporte.";

    case "auth/requires-recent-login":
      return "Por segurança, faça login novamente e tente alterar a senha.";

    case "auth/weak-password":
      return "A nova senha é fraca. Use ao menos 6 caracteres.";

    case "auth/invalid-action-code":
      return "Link expirado ou inválido. Solicite um novo link de recuperação.";

    default:
      return "Erro inesperado. Tente novamente.";
  }
}
