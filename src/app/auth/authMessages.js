const NETWORK_ERROR_PATTERN = /failed to fetch|fetch failed|network|networkerror|load failed/i;

export function authErrorMessage(error, fallback = "Não foi possível concluir a operação. Tente novamente.") {
  const message = String(error?.message || "");
  const code = String(error?.code || "");

  if (NETWORK_ERROR_PATTERN.test(message)) return "Falha de conexão. Verifique sua internet e tente novamente.";
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha inválidos.";
  if (/email not confirmed/i.test(message)) return "Confirme seu e-mail antes de entrar.";
  if (/user already registered/i.test(message)) return "Este e-mail já está cadastrado. Faça login para continuar.";
  if (/password should be at least|weak_password/i.test(`${message} ${code}`)) return "A senha deve ter pelo menos 6 caracteres.";
  if (/rate limit|too many requests|over_email_send_rate_limit/i.test(`${message} ${code}`)) return "Muitas tentativas em pouco tempo. Aguarde e tente novamente.";
  if (/expired|otp_expired/i.test(`${message} ${code}`)) return "Este link expirou. Solicite uma nova recuperação de senha.";
  if (/access_denied|invalid.*token|invalid.*code/i.test(`${message} ${code}`)) return "Este link é inválido ou já foi utilizado.";
  return fallback;
}
