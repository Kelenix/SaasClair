---
title: Espace super administrateur
description: Piloter SaasClair, ses clients, ses contenus et ses réglages.
---

# Espace super administrateur

Réservé au rôle **super administrateur**. Accès : après connexion (arrivée directe) ou menu du
profil › **Espace administrateur**. Adresse : `/admin`.

## Tableau de bord

Utilisateurs inscrits, connectés maintenant (vus dans les 5 dernières minutes), clients payants,
revenu mensuel ; inscriptions des 12 dernières semaines et revenu des 6 derniers mois ;
provenance par canal ; répartition par offre, moyen de paiement et rythme ; essais qui se
terminent et dernières inscriptions.

![Tableau de bord de l'administration](captures/admin.jpg)

## Utilisateurs

Recherche (nom, email, campagne), filtres (statut, offre, canal, connectés). Cliquez sur une
ligne pour ouvrir la fiche :

| Action | Comment |
|--------|---------|
| Changer l'offre, le rythme, le moyen de paiement, le statut | Section « Abonnement » › **Enregistrer l'abonnement** |
| Fixer un prix Pro négocié | Offre « Pro » › prix mensuel |
| Prolonger l'essai | **+7 jours** ou **+14 jours** |
| Suspendre un compte | Statut « Suspendu » (le tableau de bord du client se ferme) |
| Donner le rôle d'administrateur | Section « Rôle » (impossible sur son propre compte) |
| Supprimer le compte | Zone sensible › retaper l'email pour confirmer |

La fiche montre aussi la **provenance** (canal, source, campagne, site d'origine, page d'arrivée)
et l'**activité** (inscription, dernière connexion, site suivi, avancement de la configuration).

![Fiche d'un utilisateur](captures/admin-utilisateur.jpg)

> Tant que la facturation Stripe n'est pas branchée, les abonnements se gèrent ici à la main :
> aucun prélèvement n'est déclenché depuis l'administration.

## Abonnements

Revenu par offre et par moyen de paiement, et ce qui demande votre attention : **paiements en
retard**, essais qui se terminent, résiliations récentes. Chaque personne mène à sa fiche.

## Newsletter

Les inscriptions arrivent par le formulaire du pied de page. Recherchez, désinscrivez, effacez,
et **exportez en CSV** (compatible Brevo, Mailchimp, Excel).

## Contenus du site

| Écran | Ce qu'on y fait |
|-------|-----------------|
| **Témoignages** | Ajouter, modifier, publier ou masquer, réordonner, supprimer. Seuls de vrais témoignages, avec l'accord de leur auteur. |
| **FAQ** | Les questions du site vitrine, dans l'ordre voulu. |
| **À propos** | Titre, introduction et texte de la page `/a-propos`. |

Les changements apparaissent **immédiatement** sur le site.

## Paramètres

Collez l'identifiant de vos outils publicitaires ; SaasClair installe le reste :

- **Google Ads** : ID de conversion (`AW-…`) et libellé de la conversion « inscription », envoyée
  à chaque nouveau compte ;
- **Google Analytics 4** (`G-…`), **pixel Meta**, **LinkedIn Insight Tag** ;
- **email de contact** (bouton « Nous contacter » de l'offre Pro, pied de page).

Les traceurs ne se chargent qu'**après l'accord du visiteur** (bandeau de consentement), et
jamais dans le tableau de bord de vos clients.

![Paramètres publicitaires](captures/admin-parametres.jpg)

## État du système

Base de données (temps de réponse, version, taille), authentification, versions de
l'application, intégrations, volume par table, migrations appliquées et **journal d'activité** de
toutes les actions des administrateurs.

![État du système](captures/admin-systeme.jpg)
