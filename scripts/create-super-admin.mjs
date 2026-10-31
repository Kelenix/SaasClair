// Crée (ou met à jour) un compte super administrateur, en local comme en production.
//
// Usage (les valeurs ne sont jamais écrites dans le projet) :
//   ADMIN_EMAIL=… ADMIN_PASSWORD=… ADMIN_FIRST_NAME=… npm run admin:create
//
// Lit NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY dans
// .env. La clé de service reste sur cette machine : elle n'est jamais envoyée au navigateur.
// Sans ADMIN_PASSWORD, le mot de passe est demandé au clavier sans s'afficher (production :
// deploy/scripts/create-admin.sh).

import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const firstName = process.env.ADMIN_FIRST_NAME?.trim() || "";

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      if (text.startsWith(question)) process.stdout.write(question);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

if (!url || !anonKey || !serviceKey) fail("Variables Supabase absentes (voir .env.example).");
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("ADMIN_EMAIL manquant ou invalide.");

let password = process.env.ADMIN_PASSWORD;
if (!password && process.stdin.isTTY) {
  password = await askHidden("Mot de passe (8 caractères minimum) : ");
  if (password !== (await askHidden("Confirmez le mot de passe : ")))
    fail("Les deux saisies sont différentes.");
}
if (!password || password.length < 8)
  fail("ADMIN_PASSWORD manquant ou trop court (8 caractères minimum).");

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 1. Compte : créé, ou mot de passe mis à jour s'il existe déjà.
let userId;
for (let page = 1; !userId; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) fail(`Lecture des comptes impossible : ${error.message}`);
  userId = data.users.find((user) => user.email?.toLowerCase() === email)?.id;
  if (data.users.length < 1000) break;
}

if (userId) {
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
    ...(firstName ? { user_metadata: { first_name: firstName } } : {}),
  });
  if (error) fail(`Mise à jour du compte impossible : ${error.message}`);
  console.log("• Compte existant : mot de passe mis à jour.");
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName },
  });
  if (error) fail(`Création du compte impossible : ${error.message}`);
  userId = data.user.id;
  console.log("• Compte créé.");
}

// 2. Rôle de super administrateur (le profil est créé par le déclencheur d'inscription).
const { error: roleError } = await admin
  .from("profiles")
  .update({ role: "super_admin", ...(firstName ? { first_name: firstName } : {}) })
  .eq("id", userId);
if (roleError) fail(`Attribution du rôle impossible : ${roleError.message}`);
console.log("• Rôle super administrateur attribué.");

// 3. Vérification : connexion réelle avec ces identifiants, puis contrôle du rôle.
const visitor = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error: signInError } = await visitor.auth.signInWithPassword({ email, password });
if (signInError) fail(`Connexion de vérification refusée : ${signInError.message}`);
const { data: isSuperAdmin } = await visitor.rpc("is_super_admin");
if (!isSuperAdmin) fail("Connexion réussie, mais le rôle n'est pas reconnu.");
await visitor.auth.signOut();
console.log(`✓ ${email} peut se connecter et accède à /admin.`);
