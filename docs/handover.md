# Kit de remise

> Ce que vous recevez, comment le lancer et quoi faire avant la mise en ligne. Version illustrée
> et imprimable : portail `docs-site/dist/index.html` et PDF `docs-site/dist/SaasClair-documentation.pdf`
> (`npm run docs:build`).

## Ce qui est livré (version 1.0.0-rc.1)

- **Site vitrine** : accueil, À propos, tarifs, FAQ, newsletter, bandeau de consentement.
- **Comptes** : email et mot de passe, Google et GitHub prêts, mot de passe oublié.
- **Configuration en 2 actions** : audit réel du site, script, Stripe.
- **Tableau de bord client** : 7 écrans d'analyse, alertes, paramètres.
- **Espace super administrateur** : 9 écrans, gestion des clients, contenus, pixels, état du système.
- **Qualité** : 115 tests unitaires, 52 tests de bout en bout, accessibilité WCAG AA vérifiée.
- **Documentation** : architecture, données, sécurité, maintenance, incidents, configuration.

## Démarrer en local

```bash
npm install
```

```bash
npm run up
```

Puis ouvrir http://localhost:3000. Comptes de démonstration : voir `supabase/seed.sql` (cliente)
et `supabase/seed-admin.sql` (super administrateur), ou créer le vôtre avec
`npm run admin:create`.

## Check-list « Bien démarrer » avant la mise en ligne

- [ ] Fournir le VPS, le domaine et le dépôt GitHub (tâches n° 5 et suivantes)
- [ ] Créer le projet Supabase de production et remplir `.env` (`docs/configuration.md`)
- [ ] Activer la confirmation d'email et le service d'envoi dans Supabase (tâche n° 11)
- [ ] Créer votre compte super administrateur (`npm run admin:create`, tâche n° 12)
- [ ] Saisir l'email de contact, relire la page À propos, publier de vrais témoignages
- [ ] Rédiger mentions légales et politique de confidentialité (tâches n° 9 et 14)
- [ ] Brancher un moniteur de disponibilité sur `/api/health?complet=1` (`docs/maintenance.md`)
- [ ] Faire une première sauvegarde (`npm run db:backup`) et tester sa restauration

## Où trouver quoi

| Besoin | Document |
|--------|----------|
| Comprendre l'architecture | `docs/architecture.md`, `docs/system-design.md`, `docs/data-model.md` |
| Parcours et accessibilité | `docs/design/flows.md`, `docs/design/design-system.md` |
| Sécurité | `docs/security.md` |
| Tests et performance | `docs/qa/test-plan.md`, `docs/performance.md` |
| Entretien courant | `docs/maintenance.md` |
| Incident | `docs/runbook.md` |
| Ce qui reste à faire | `docs/tech-debt.md`, `docs/manual-tasks.md` |
| Historique des décisions et des versions | `DECISION_LOG.md`, `CHANGELOG.md` |
