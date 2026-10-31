// Crée (ou met à jour) un compte super administrateur, en local comme en production.
//
// Usage (les valeurs ne sont jamais écrites dans le projet) :
//   ADMIN_EMAIL=… ADMIN_PASSWORD=… ADMIN_FIRST_NAME=… npm run admin:create
//
// Lit NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY dans
// .env. La clé de service reste sur cette machine : elle n'est jamais envoyée au navigateur.
// Sans ADMIN_PASSWORD, le mot de passe est demandé au clavier sans s'afficher (production :
// deploy/scripts/create-admin.sh).
//
// Aucune dépendance : appels directs aux API Auth et données de Supabase, pour tourner aussi dans
// l'image de production (qui ne contient que le code compilé du site).

import { createInterface } from "node:readline";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
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

// Appel JSON à Supabase ; renvoie { data, error } comme le client officiel.
async function call(path, { key, token = key, method = "GET", body, prefer } = {}) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch((error) => ({ ok: false, status: 0, text: async () => error.message }));
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (response.ok) return { data, error: null };
  const message = data?.msg ?? data?.message ?? data?.error_description ?? text;
  return {
    data: null,
    error: { message: `${message || "réponse vide"} (HTTP ${response.status})` },
  };
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

const asAdmin = { key: serviceKey };

// 1. Compte : créé, ou mot de passe mis à jour s'il existe déjà.
let userId;
for (let page = 1; !userId; page++) {
  const { data, error } = await call(`/auth/v1/admin/users?page=${page}&per_page=1000`, asAdmin);
  if (error) fail(`Lecture des comptes impossible : ${error.message}`);
  const users = data?.users ?? [];
  userId = users.find((user) => user.email?.toLowerCase() === email)?.id;
  if (users.length < 1000) break;
}

if (userId) {
  const { error } = await call(`/auth/v1/admin/users/${userId}`, {
    ...asAdmin,
    method: "PUT",
    body: {
      password,
      email_confirm: true,
      ...(firstName ? { user_metadata: { first_name: firstName } } : {}),
    },
  });
  if (error) fail(`Mise à jour du compte impossible : ${error.message}`);
  console.log("• Compte existant : mot de passe mis à jour.");
} else {
  const { data, error } = await call("/auth/v1/admin/users", {
    ...asAdmin,
    method: "POST",
    body: { email, password, email_confirm: true, user_metadata: { first_name: firstName } },
  });
  if (error) fail(`Création du compte impossible : ${error.message}`);
  userId = data.id;
  console.log("• Compte créé.");
}

// 2. Rôle de super administrateur (le profil est créé par le déclencheur d'inscription).
const { error: roleError } = await call(`/rest/v1/profiles?id=eq.${userId}`, {
  ...asAdmin,
  method: "PATCH",
  prefer: "return=minimal",
  body: { role: "super_admin", ...(firstName ? { first_name: firstName } : {}) },
});
if (roleError) fail(`Attribution du rôle impossible : ${roleError.message}`);
console.log("• Rôle super administrateur attribué.");

// 3. Vérification : connexion réelle avec ces identifiants, puis contrôle du rôle.
const { data: session, error: signInError } = await call("/auth/v1/token?grant_type=password", {
  key: anonKey,
  method: "POST",
  body: { email, password },
});
if (signInError) fail(`Connexion de vérification refusée : ${signInError.message}`);
const { data: isSuperAdmin } = await call("/rest/v1/rpc/is_super_admin", {
  key: anonKey,
  token: session.access_token,
  method: "POST",
  body: {},
});
if (isSuperAdmin !== true) fail("Connexion réussie, mais le rôle n'est pas reconnu.");
await call("/auth/v1/logout", { key: anonKey, token: session.access_token, method: "POST" });
console.log(`✓ ${email} peut se connecter et accède à /admin.`);
