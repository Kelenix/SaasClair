---
title: Clés et accès
description: Où trouver chaque clé, où la coller, comment vérifier.
---

# Configuration des clés et des accès

> **Aucun secret n'est écrit dans cette documentation** : seulement où le trouver et où le
> coller. Les fichiers `.env` ne sont jamais envoyés sur GitHub.

## Base de données et comptes (Supabase)

| Réglage | Où l'obtenir | Où le coller |
|---------|--------------|--------------|
| Adresse du projet | Supabase › Project Settings › API › Project URL | `.env` › `NEXT_PUBLIC_SUPABASE_URL` |
| Clé publique (anon) | Même page | `.env` › `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Clé de service (secrète) | Même page, « service_role » | `.env` › `SUPABASE_SERVICE_ROLE_KEY` — **jamais ailleurs** |
| Adresse du site | Votre domaine | `.env` › `NEXT_PUBLIC_SITE_URL` |

**Vérifier** : ouvrez `https://votre-domaine/api/health?complet=1` → `"status":"ok"`.

## Connexion avec Google et GitHub

1. Créez une application OAuth chez Google (Google Cloud Console › Identifiants) et chez GitHub
   (Settings › Developer settings › OAuth Apps).
2. Adresse de retour : celle indiquée par Supabase › Authentication › Providers.
3. Collez l'identifiant et le secret dans Supabase › Authentication › Providers.

**Vérifier** : « Continuer avec Google » ouvre la page de Google.

## Votre compte super administrateur

Depuis votre poste, avec les clés de production dans `.env` :

```
ADMIN_EMAIL=vous@domaine.fr ADMIN_PASSWORD=… ADMIN_FIRST_NAME=… npm run admin:create
```

La commande crée le compte (ou change son mot de passe) et vérifie qu'il peut se connecter. Le
mot de passe n'est enregistré nulle part dans le projet.

## Pixels publicitaires

Dans **Administration › Paramètres** (aucun code à toucher) :

| Outil | Où trouver l'identifiant | Format |
|-------|--------------------------|--------|
| Google Ads | Objectifs › Conversions › votre action › Configuration de la balise | `AW-123456789` + libellé |
| Google Analytics 4 | Administration › Flux de données | `G-ABC123XYZ` |
| Meta | Gestionnaire d'évènements › Sources de données | chiffres |
| LinkedIn | Campaign Manager › Données analytiques › Insight Tag | chiffres |

**Vérifier** : en navigation privée, acceptez le bandeau de consentement, puis contrôlez avec
« Tag Assistant » (Google) ou « Meta Pixel Helper ».

## Sécurité des accès

- Changez la clé de service et les mots de passe administrateurs **chaque trimestre**.
- Au moindre doute de fuite : régénérez la clé dans Supabase, mettez à jour `.env`, redéployez.
- Donnez le rôle de super administrateur avec parcimonie ; revoyez la liste chaque année.
