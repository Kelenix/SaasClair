// Sauvegarde de la base : schéma et données dans backups/AAAA-MM-JJ_HHMM/ (dossier ignoré par Git).
//
//   npm run db:backup                         → base locale (Supabase lancé par npm run up)
//   SUPABASE_DB_URL=postgres://… npm run db:backup   → base de production (chaîne de connexion
//                                               du tableau de bord Supabase, jamais écrite ici)
//
// Restauration : voir docs/runbook.md, « Restaurer une sauvegarde ».

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// Le CLI Supabase est un script Node : lancé directement, sans shell (arguments jamais réinterprétés).
const supabaseCli = createRequire(import.meta.url).resolve("supabase/dist/supabase.js");

const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
const folder = path.join("backups", stamp);
fs.mkdirSync(folder, { recursive: true });

const target = process.env.SUPABASE_DB_URL
  ? ["--db-url", process.env.SUPABASE_DB_URL]
  : ["--local"];
const dump = (file, extra = []) =>
  execFileSync(
    process.execPath,
    [supabaseCli, "db", "dump", ...target, ...extra, "-f", path.join(folder, file)],
    { stdio: "inherit" },
  );

dump("schema.sql");
dump("donnees.sql", ["--data-only"]);
dump("roles.sql", ["--role-only"]);

const size = fs
  .readdirSync(folder)
  .reduce((total, file) => total + fs.statSync(path.join(folder, file)).size, 0);
console.log(`✓ Sauvegarde écrite dans ${folder} (${Math.round(size / 1024)} Ko).`);
console.log(
  "  Copiez-la hors de cette machine (stockage chiffré) : une sauvegarde locale seule ne protège de rien.",
);
