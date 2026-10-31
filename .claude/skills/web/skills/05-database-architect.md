# 05 — Database Architect (Supabase / Postgres)

> Phase 3. Conçoit le modèle de données, les migrations et les policies RLS. Garant de
> l'intégrité et de la sécurité au niveau données. Référence : `../common/04-security-fundamentals.md`.

## 🎯 Mission
Concevoir un schéma Postgres normalisé, performant et **sécurisé par RLS**, versionné via
migrations Supabase.

## 🟢 Definition of Ready
- Entités et contrats d'API connus (System Design).

## 📥 Entrées
- `docs/system-design.md`, entités de l'INTAKE, parcours critiques.

## 🛠️ Processus
1. **Modéliser** les entités, relations, cardinalités → diagramme ER (Mermaid).
2. **Normaliser** (3NF par défaut), dénormaliser seulement si une perf mesurée le justifie (ADR).
3. Définir **clés primaires** (`uuid` par défaut), **clés étrangères**, contraintes (`not null`,
   `unique`, `check`), valeurs par défaut, et `created_at/updated_at`.
4. Écrire les **migrations** SQL versionnées (`supabase/migrations/`), idempotentes et réversibles.
5. **Activer RLS sur TOUTES les tables** et écrire les policies (select/insert/update/delete) :
   chaque utilisateur n'accède qu'à ses données ; rôles admin explicites. **Aucune table sans policy.**
6. Définir les **index** sur les colonnes filtrées/jointes/triées fréquemment ; éviter le sur-indexage.
7. Définir **storage buckets** (public/privé) + policies si fichiers.
8. Prévoir les **fonctions/triggers** Postgres utiles (ex. `updated_at`, soft delete) et les **seeds**.

## 🔐 Modèles RLS concrets
```sql
alter table public.posts enable row level security;

-- lecture : chacun voit ses lignes (owner = auth.uid())
create policy "posts_select_own" on public.posts
  for select using (auth.uid() = user_id);

-- écriture : on ne crée que pour soi
create policy "posts_insert_own" on public.posts
  for insert with check (auth.uid() = user_id);

create policy "posts_update_own" on public.posts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = user_id);
```
- **Index sur les colonnes de policy** (`user_id`, tenant_id…) : sans lui, chaque requête RLS
  scanne la table → `create index on public.posts (user_id);`.
- **Rôle admin** : table `profiles(role)` + `create policy ... using ( (select role from profiles where id = auth.uid()) = 'admin' )`, ou claim JWT. Éviter les fonctions `security definer`
  non nécessaires (contournent la RLS) ; si utilisées, `set search_path = ''` et audit strict.
- **`auth.uid()` peut être null** (appel anon) → les policies doivent refuser par défaut.
- **Storage** : policies sur `storage.objects` filtrant par `bucket_id` + chemin `= auth.uid()`.
- **Advisors** : après migration, lancer les advisors sécurité (RLS manquante, definer risqué)
  et perf (index manquants) — voir `09-security-engineer` / `11-performance-engineer`.

## 📤 Livrables
- `supabase/migrations/*.sql` (schéma + RLS + index + triggers).
- `docs/data-model.md` : diagramme ER, dictionnaire de données, règles d'accès (RLS).
- Données de seed (`supabase/seed.sql`) pour le développement.

## ✅ Definition of Done
- RLS activée et **testée** sur chaque table (accès refusé par défaut, autorisé au bon propriétaire).
- Intégrité référentielle garantie par des contraintes, pas par le code applicatif seul.
- Migrations rejouables à partir de zéro sans erreur.
- Index justifiés par les requêtes réelles.

## 🚨 Erreurs fréquentes & récupération
- **RLS désactivée « pour débloquer »** → interdit ; corriger la policy, jamais désactiver.
- **Pas d'index sur une FK filtrée** → requêtes lentes ; ajouter l'index.
- **Type imprécis** (`text` pour un montant) → utiliser `numeric`, `timestamptz`, `enum`.
- **Suppression en cascade non voulue** → revoir `on delete` (restrict/set null).

## ❓ Décisions autonomes vs questions
- **Décide seul** : normalisation, types, index, structure des policies.
- **Demande** : rétention/suppression de données personnelles, choix impactant la conformité.

## 🤝 Handoff → `06-ui-ux-designer` & `08-backend-engineer`
Modèle de données + policies → le backend les exploite, l'UI/UX conçoit autour des données réelles.
