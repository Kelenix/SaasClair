# 12 — Catalogue des menaces & parades (SaaS)

> ⭐ Référence de sécurité applicative partagée (web + mobile + desktop). Chargé par les rôles
> `security-engineer` comme **check-list de revue**. Complète `[[04-security-fundamentals]]`.
> Stack de référence : Next.js (App Router) · Supabase (Postgres/Auth/Storage/RLS) · VPS (Docker/Nginx).

## Comment l'utiliser
Pour **chaque incrément** touchant une surface à risque (auth, données, fichiers, API, réseau,
paiement, infra), passer les catégories concernées : chaque menace doit avoir sa **parade en place
et testée**, ou être marquée **N/A justifié** dans `docs/security.md`. Priorité aux menaces à fort
impact (contrôle d'accès, injection, secrets, authz). Légende portée : 🌐 web · 📱 mobile · 🖥️ desktop · ☁️ infra.

---

## A. Injection & exécution de code
- **SQLi** (SQL injection) 🌐📱🖥️ → **jamais** de SQL concaténé : API Supabase / requêtes
  paramétrées / RPC typées ; validation Zod ; RLS comme dernière ligne. Pas de `execute_sql` avec entrée brute.
- **Command Injection** 🌐🖥️☁️ → ne pas construire de commande shell à partir d'entrées ; API natives
  plutôt que shell ; si inévitable, liste blanche d'arguments (pas de `shell:true`, pas de `Process.Start` concaténé).
- **RCE** (exécution de code arbitraire) 🌐🖥️☁️ → pas d'`eval`/`Function`/désérialisation exécutable ;
  dépendances à jour ; conteneur non-root en lecture seule si possible ; entrées jamais interprétées comme code.
- **XSS** (stored/reflected/DOM) 🌐 → échappement par défaut de React ; **jamais** de
  `dangerouslySetInnerHTML` sans assainissement (DOMPurify) ; **CSP stricte** ; pas d'injection dans `href`/`src`.
- **Insecure Deserialization** 🌐🖥️ → ne pas désérialiser de données non fiables ; formats sûrs (JSON
  validé Zod) ; en .NET éviter `BinaryFormatter`/`JsonTypeInfo` permissif.
- **Prototype Pollution** 🌐 (Node/JS) → ne pas fusionner d'objets utilisateur sans contrôle ; rejeter
  `__proto__`/`constructor`/`prototype` ; libs de merge sûres ; `Object.create(null)` pour les maps.
- **Path Traversal** (`../`) 🌐🖥️☁️ → normaliser et valider les chemins ; interdire `..` ; servir depuis
  un répertoire racine fixe ; ne jamais concaténer une entrée dans un chemin de fichier.
- **File Inclusion (LFI/RFI)** 🌐 → pas d'include dynamique piloté par l'entrée ; liste blanche de
  ressources ; pas de chemins/URLs contrôlés par l'utilisateur pour charger du code.

## B. Contrôle d'accès & logique métier
- **Broken Access Control / IDOR** 🌐📱🖥️ → autorisation **côté serveur** sur chaque ressource ;
  **RLS Supabase** (`auth.uid() = owner`) sur toutes les tables ; ne jamais se fier à un ID fourni
  par le client ; tester l'accès d'un autre utilisateur (doit être refusé).
- **Privilege Escalation** 🌐📱🖥️ → rôles vérifiés côté serveur (claim/table `profiles.role`) ; pas
  d'élévation via champ client ; fonctions `security definer` auditées (`set search_path=''`).
- **Mass Assignment** 🌐📱 → **liste blanche** des champs modifiables (schéma Zod dédié en écriture) ;
  ne jamais passer le body brut à un `update`/`insert` ; colonnes sensibles (`role`, `is_admin`, `price`) exclues.
- **Business Logic attacks** 🌐📱🖥️ → modéliser et tester les invariants métier (montants, quotas,
  états, remises, étapes obligatoires) côté serveur ; ne pas se fier à l'ordre imposé par l'UI.
- **Race Conditions** 🌐☁️ → opérations atomiques (transaction, contrainte `unique`, `SELECT … FOR
  UPDATE`, verrou applicatif/idempotence) ; ne pas vérifier-puis-agir sans verrou (paiement, stock, quotas).

## C. Authentification & session
- **Authentication attacks** (brute force, credential stuffing, password spraying, bypass) 🌐📱🖥️ →
  **rate limiting** + lockout progressif sur login/reset ; MFA si pertinent ; mots de passe hashés par
  le provider (Supabase Auth) ; détection de fuite (HIBP) ; jamais d'auth « maison » non éprouvée.
- **Session attacks** (vol/fixation, cookies compromis) 🌐 → cookies `httpOnly` + `Secure` + `SameSite`;
  rotation à l'élévation de privilège ; expiration + refresh ; invalidation à la déconnexion ; pas de session dans l'URL.
- **JWT attacks** (signature/alg mal validés, expiration trop longue) 🌐📱🖥️ → algorithme fixé côté
  serveur (rejeter `alg=none`) ; vérifier signature + `exp`/`aud`/`iss` ; durées courtes + refresh ;
  s'appuyer sur la vérification Supabase, ne pas décoder « à la main » sans validation.

## D. API, abus & disponibilité
- **API attacks** (endpoints non protégés, manipulation de paramètres, sur-exposition de données) 🌐📱 →
  auth+authz sur **chaque** endpoint ; validation Zod entrée **et** forme de sortie ; ne renvoyer que les
  champs nécessaires (pas de `select *` exposé) ; pagination ; versionner les contrats.
- **Rate-limit bypass** 🌐☁️ → limiter par identité **et** IP réelle (`X-Forwarded-For` derrière Nginx
  de confiance) ; `limit_req` Nginx + limiteur applicatif (Redis en conteneur sur le VPS) ; coûts asymétriques protégés.
- **DoS / DDoS** 🌐☁️ → CDN/WAF (Cloudflare) devant le VPS ; timeouts et tailles de payload limités ;
  requêtes coûteuses bornées ; `fail2ban` ; health check + limites de ressources conteneur.

## E. Requêtes inter-sites & navigateur
- **CSRF** 🌐 → cookies `SameSite=Lax/Strict` ; vérifier l'origine sur les mutations ; token anti-CSRF
  si formulaires cross-site ; les Server Actions Next.js vérifient l'origine — ne pas la désactiver.
- **SSRF** 🌐☁️ → ne jamais requêter une URL fournie par l'utilisateur sans **liste blanche** de
  domaines ; bloquer les IP privées/métadonnées cloud (169.254.169.254) ; pas de proxy ouvert.
- **CORS misconfiguration** 🌐 → origines **explicitement** autorisées (pas de `*` avec credentials) ;
  pas de reflet aveugle de l'`Origin` ; méthodes/headers minimaux.
- **Clickjacking** 🌐 → `frame-ancestors 'none'` (CSP) + `X-Frame-Options: DENY`.
- **Open Redirect** 🌐 → ne rediriger que vers des chemins internes / une liste blanche ; valider tout
  paramètre `redirect`/`next` (pas d'URL absolue externe).
- **Web Cache Poisoning** 🌐☁️ → clés de cache sûres ; ne pas mettre en cache des réponses variables selon
  des en-têtes non pris en compte ; `Vary` correct ; séparer contenu authentifié du cache public.

## F. Fichiers & upload
- **Upload de fichiers malveillants** 🌐📱🖥️ → valider **type réel** (magic bytes) + taille + extension ;
  stocker hors webroot / bucket **privé** Supabase + URLs signées ; renommer (UUID) ; jamais exécutable ;
  scan antivirus si sensible ; `Content-Type`/`Content-Disposition` sûrs au service.

## G. Fuite d'information & secrets
- **Information Disclosure** (stack traces, `.env`, fichiers, données internes) 🌐📱🖥️☁️ → messages
  d'erreur muets côté utilisateur ; pas de debug en prod ; bloquer l'accès aux fichiers sensibles (Nginx) ;
  pas de listing de répertoire ; en-têtes de version masqués.
- **Secrets leakage** (clés cloud/tokens/passwords dans Git/frontend/logs) 🌐📱🖥️☁️ → `gitleaks` en CI ;
  `.env` gitignoré ; **rien de secret dans `NEXT_PUBLIC_*`** ni dans un binaire mobile/desktop
  (décompilable) ; secrets en secrets GitHub / `.env` VPS `chmod 600` ; rotation ; révoquer si exposé.
- **Database attacks** (accès direct, credentials exposés, backups accessibles) ☁️ → Postgres non exposé
  publiquement ; `service_role` serveur uniquement ; backups chiffrés et privés ; moindre privilège des rôles DB.

## H. Infrastructure & chaîne d'approvisionnement
- **Supply-chain attacks** (dépendance/package compromis) 🌐📱🖥️☁️ → versions **épinglées** + lockfile ;
  `npm audit`/Dependabot ; vérifier intégrité (provenance/SLSA si dispo) ; limiter les dépendances ;
  images de base officielles épinglées par digest.
- **Container / Cloud misconfig** (Docker/K8s/AWS/GCP, stockage public, IAM permissif) ☁️ → conteneur
  non-root, FS lecture seule, pas de secret dans l'image ; ports bindés `127.0.0.1` + Nginx ; buckets privés
  par défaut ; IAM/rôles au **moindre privilège** ; `ufw` + SSH par clé (voir `[[04-security-fundamentals]]` §serveur).
- **DNS / Subdomain takeover** ☁️ → supprimer les enregistrements DNS pendants (services désactivés) ;
  DNSSEC si dispo ; surveiller les sous-domaines ; CAA records.
- **Malware / backdoor** 🌐🖥️☁️ → revue de code + CI de confiance ; pas de build depuis une source non
  vérifiée ; signer les artefacts (desktop : Authenticode ; images : cosign) ; vérifier hash/signature au déploiement.

## I. Facteur humain
- **Phishing / Social Engineering** 👤 → hors code : MFA obligatoire sur les comptes sensibles (GitHub,
  Supabase, VPS, registrar, cloud) ; sensibilisation ; procédures de vérification ; à documenter dans le runbook.
- **Credential theft** (mots de passe, tokens, cookies, clés API) 👤🌐 → cookies `httpOnly`/`Secure` ;
  tokens courts + refresh ; stockage sécurisé (Keychain/Keystore, DPAPI) ; rotation ; alertes de connexion anormale.

---

## Parades transverses (toujours)
Validation aux frontières (Zod) · autorisation serveur + RLS · secrets hors code · TLS partout ·
en-têtes de sécurité (CSP/HSTS/nosniff/Referrer-Policy/Permissions-Policy) · rate limiting · logs sans
PII · dépendances épinglées et auditées · moindre privilège (DB, IAM, OS, permissions). Voir la
configuration concrète dans le `security-engineer` de la plateforme et `[[04-security-fundamentals]]`.
