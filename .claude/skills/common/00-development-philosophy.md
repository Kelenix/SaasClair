# 00 — Philosophie de développement

> Socle commun web + mobile. Lu par tous les rôles. Référence : `[[09-ai-working-rules]]`.

## Principe central

**Livrer un produit fini, prêt à l'exécution.** Pas un prototype, pas du code « à compléter ».
Chaque livraison doit pouvoir être installée, lancée et utilisée.

## Les 10 valeurs non négociables

1. **Le cahier des charges est la loi.** Toute décision se justifie par le besoin exprimé ou
   par une bonne pratique reconnue. En cas de conflit, le besoin métier prime.
2. **Autonomie responsable.** Claude décide seul de tout ce qui est raisonnable et documente
   ses choix. Il ne pose une question que si l'impact est métier, financier ou fonctionnel
   important (voir `[[09-ai-working-rules]]`).
3. **Simplicité d'abord (KISS).** La solution la plus simple qui répond au besoin gagne.
4. **Moins de code nécessaire, pas moins de code possible.** On supprime le superflu, jamais
   la lisibilité. Pas de sur-ingénierie (YAGNI), pas de code cryptique. **La quantité de code
   est un coût, pas une valeur** : à comportement égal, la version la plus courte et la plus
   lisible gagne. Chaque ligne doit se justifier par une exigence.
5. **Sécurité dès la conception (Security by design).** Jamais ajoutée après coup.
6. **Tout est testable et testé** à hauteur du risque.
7. **Tout est documenté** au fil de l'eau, pas à la fin.
8. **Scalable par défaut.** Les choix d'architecture ne doivent pas bloquer la croissance.
9. **Traçabilité.** Chaque décision structurante est consignée (`DECISION_LOG.md`).
10. **Échouer proprement.** Toute erreur est anticipée, gérée et journalisée (voir `[[06-error-handling]]`).

## Définition de « produit fini, prêt à l'exécution »

- Le projet **compile et démarre** avec une commande documentée (`README`).
- Variables d'environnement listées dans `.env.example`.
- Migrations / schéma de base **versionnés et appliqués**.
- Tests verts ; lint et types **sans erreur**.
- Sécurité de base en place (auth, autorisation, validation des entrées).
- Documentation utilisateur + technique présente.
- **Tâches manuelles** (clés API, comptes tiers, déploiement) listées clairement (voir `[[03-documentation-rules]]`).

## Économie de code (obligatoire)

> Objectif explicite : livrer **le minimum de code qui résout réellement l'exigence**. L'IA ne
> doit pas produire du code « au cas où », des couches d'abstraction non utilisées, des options
> non demandées ni de la plomberie inutile.

- **Préférer la plateforme et le framework** avant d'écrire du code : fonctionnalités natives
  Next.js/Postgres/Supabase, API standard, primitives du langage. On n'écrit que ce qui manque.
- **Réutiliser avant d'écrire** : chercher un helper/composant existant ; ne pas recréer.
- **Pas d'abstraction spéculative** : pas d'interface, de generic, de « manager », de wrapper ou
  de couche de config tant qu'un besoin réel et présent ne l'exige (règle des 3 pour factoriser).
- **Une passe de réduction avant « done »** : après que ça marche, relire et **supprimer** ce qui
  ne sert pas (variables intermédiaires inutiles, conditions mortes, helpers à un seul appelant
  trivial, commentaires qui répètent le code). Le diff net doit être aussi petit que possible.
- **Moins de dépendances** : n'ajouter une lib que si elle remplace un volume de code significatif
  et fiable (voir `[[01-coding-standards]]`).

## Anti-patterns interdits

- Laisser des `TODO`, du code mort, des fonctions vides « pour plus tard ».
- Inventer une exigence non demandée et la livrer comme un fait.
- Copier-coller au lieu de factoriser.
- **Générer du code superflu** : abstractions non utilisées, options/paramètres non demandés,
  gestion de cas qui ne peuvent pas survenir, boilerplate évitable.
- Désactiver des règles de lint/type sans justification écrite.
- Stocker un secret en clair dans le code ou le dépôt.
