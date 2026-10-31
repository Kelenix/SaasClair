// Traduit les erreurs Supabase Auth en messages clairs et bienveillants (jamais de détail technique).

const MESSAGES: Record<string, string> = {
  invalid_credentials: "Email ou mot de passe incorrect. Vérifiez-les et réessayez.",
  user_already_exists: "Un compte existe déjà avec cet email. Connectez-vous plutôt.",
  email_exists: "Un compte existe déjà avec cet email. Connectez-vous plutôt.",
  weak_password: "Ce mot de passe est trop facile à deviner. Ajoutez des chiffres ou des symboles.",
  email_not_confirmed:
    "Confirmez d'abord votre email : le lien vous attend dans votre boîte de réception.",
  over_email_send_rate_limit: "Trop d'emails envoyés en peu de temps. Réessayez dans une minute.",
  over_request_rate_limit: "Trop de tentatives. Patientez une minute avant de réessayer.",
  same_password: "Choisissez un mot de passe différent de l'ancien.",
  signup_disabled: "Les inscriptions sont momentanément fermées.",
  session_not_found: "Ce lien a expiré. Demandez-en un nouveau, il arrive en quelques secondes.",
  session_expired: "Ce lien a expiré. Demandez-en un nouveau, il arrive en quelques secondes.",
};

export const GENERIC_ERROR = "Une erreur est survenue de notre côté. Réessayez dans un instant.";

export function authErrorMessage(code: string | undefined) {
  return (code && MESSAGES[code]) || GENERIC_ERROR;
}
