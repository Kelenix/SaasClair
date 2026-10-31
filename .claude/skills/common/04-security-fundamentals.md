# 04 — Fondamentaux de sécurité

> Security by design. Approfondi dans `security-engineer`. À appliquer par TOUS les rôles.

## Les règles de base (toujours)

1. **Ne jamais faire confiance aux entrées.** Valider et assainir côté serveur **et** client.
   Validation au plus près de la frontière (schémas Zod / validators Dart).
2. **Aucun secret dans le code ou le dépôt.** Tout passe par variables d'environnement.
   `.env` est dans `.gitignore` ; seul `.env.example` est versionné.
3. **Principe du moindre privilège.** Chaque clé, rôle, table n'a que les droits strictement
   nécessaires.
4. **Authentification ≠ Autorisation.** Vérifier l'identité *et* le droit d'accès à chaque
   ressource sensible, côté serveur.
5. **Chiffrement en transit (HTTPS/TLS) obligatoire.** Données sensibles chiffrées au repos.
6. **Messages d'erreur muets.** Jamais de stack trace, requête SQL ou détail interne exposé
   à l'utilisateur final (voir `[[06-error-handling]]`).

> **Catalogue complet des menaces** : la liste exhaustive des classes d'attaques (injection, IDOR,
> SSRF, CSRF, JWT, race conditions, supply-chain, secrets leakage, etc.) avec leur parade concrète
> est dans `[[12-threat-catalog]]` — check-list de revue des `security-engineer`.

## OWASP — vérifications minimales

- **Injection** (SQL, NoSQL, commandes) → requêtes paramétrées / ORM, jamais de concaténation.
- **XSS** → échappement par défaut, pas de `dangerouslySetInnerHTML` / HTML brut non assaini.
- **Broken access control** → contrôle d'accès au niveau données (RLS Supabase), pas seulement UI.
- **CSRF** → tokens / SameSite cookies sur les mutations.
- **Auth faible** → mots de passe hashés (bcrypt/argon2 via le provider), MFA si pertinent,
  sessions expirables.
- **Dépendances vulnérables** → audit régulier (`npm audit`, `dart pub outdated`).
- **Mauvaise config** → en-têtes de sécurité (CSP, HSTS), pas de mode debug en prod.

## Spécifique Supabase (web + mobile)

- **Row Level Security (RLS) ACTIVÉE sur TOUTES les tables**, sans exception. Une table sans
  policy = accès refusé par défaut. C'est le point de sécurité n°1 du projet.
- La clé `service_role` ne quitte **jamais** le serveur / les fonctions edge. Le client n'a
  que la clé `anon`.
- Policies écrites et **testées** (un utilisateur ne lit/modifie que ses données).

## Données personnelles (RGPD / vie privée)

- Collecter le minimum. Documenter quelles données, pourquoi, durée de conservation.
- Prévoir suppression/export des données utilisateur si la nature du produit l'exige.
- Pas de log de données sensibles (mots de passe, tokens, PII) en clair.

## Gestion des secrets (partout)

- **Trois zones** (`[[13-environments]]`) : `.env` du poste (dev, gitignoré), environnement GitHub
  `production` (secrets CI/CD, dont `PROD_ENV`), `.env` du VPS (`chmod 600`, écrit par la CD, jamais
  édité à la main). `.env.example` versionné, **sans valeurs**. `.env*` exclu du contexte Docker
  (`.dockerignore`) : aucun secret dans une image.
- `service_role` Supabase, clés de paiement, tokens : **serveur uniquement**. Rien de sensible
  dans une var `NEXT_PUBLIC_*` (exposée au navigateur).
- **Scan** avant tout commit/CI, avec l'image officielle (jamais `npx gitleaks` : le paquet npm de
  ce nom n'est pas l'outil) : `docker run --rm -v "${PWD}:/repo" ghcr.io/gitleaks/gitleaks:v8.30.1 git /repo --no-banner`.
  Un secret commité = révoquer + régénérer + purger l'historique + rotation (jamais « juste le retirer »).

## Durcissement serveur — VPS Hostinger

> Appliqué une fois par le script idempotent `scripts/vps-bootstrap.sh` (détail :
> `web/skills/12-devops-engineer.md` §3). Ne rien configurer à la main sur le serveur.

- **SSH par clé uniquement** (drop-in `/etc/ssh/sshd_config.d/`) : `PasswordAuthentication no`,
  `PermitRootLogin prohibit-password` (root par clé, administration exceptionnelle), clé hôte
  ed25519 (empreinte vérifiée par la CD). Utilisateur `deploy` non-root avec une clé dédiée à la CI.
- **Pare-feu** : `ufw` n'ouvre que OpenSSH et `Nginx Full`. Les ports des apps sont bindés sur
  `127.0.0.1`, accessibles **uniquement** via Nginx (le pare-feu hPanel, s'il est actif, n'ouvre que 22/80/443).
- **fail2ban** actif (anti brute-force SSH) ; **`unattended-upgrades`** pour les patchs sécurité
  (Docker installé depuis les paquets Ubuntu, donc couvert lui aussi).
- **TLS** : Certbot/Let's Encrypt, renouvellement auto, redirection HTTPS + HSTS.
- **Nginx** : `limit_req` (limitation de débit par IP), `client_max_body_size` borné.
- **Conteneurs** : image minimale (Alpine), process **non-root**, secrets injectés au runtime
  (`env_file`), logs Docker bornés (`max-size`), images obsolètes purgées à chaque déploiement.
- **Sauvegardes** : backups Supabase + sauvegardes Hostinger + snapshot avant opération risquée ;
  tester une restauration.

## Règle d'arrêt

> Toute fonctionnalité touchant auth, paiement, données personnelles ou fichiers uploadés
> **doit** passer par la checklist `security-engineer` avant d'être marquée « done ».
