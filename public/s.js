/*! SaasClair — script de collecte (https://saasclair.com). Pages vues et provenance, sans
cookie ni adresse IP ; identifiant du visiteur gardé 13 mois au plus, et suivi d'un sous-domaine
à l'autre du même site (www → app) par les liens. Un inscrit est relié à sa provenance par
l'empreinte SHA-256 de l'email saisi dans le formulaire d'inscription, jamais l'email en clair
(désactivable : data-identify="off" ; ou à la main : saasclair("identify", email)). Un visiteur
qui refuse d'être compté : localStorage « sc_off » = "1", rien n'est envoyé. */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || window.__saasclair) return;
  window.__saasclair = true;
  var site = script.getAttribute("data-site");
  // Robots, et poste du développeur (localhost) : rien n'est envoyé.
  if (!site || navigator.webdriver || /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname)) {
    return;
  }
  // Visiteur qui a refusé d'être compté (droit d'opposition) : rien n'est envoyé, sur ce site,
  // dès son choix (relu à chaque envoi).
  function optedOut() {
    try {
      return localStorage.getItem("sc_off") === "1";
    } catch {
      return false;
    }
  }
  if (optedOut()) return;
  var endpoint = new URL("/api/collect", script.src).href;
  var VISITOR_ID = /^[A-Za-z0-9_-]{8,64}$/;

  // Domaine du site, sans ses sous-domaines (www, app…). Sur un hébergeur partagé, chaque
  // sous-domaine est un autre site : l'adresse complète est gardée.
  var SHARED_HOST = /\.(vercel\.app|netlify\.app|github\.io|pages\.dev|herokuapp\.com|onrender\.com|webflow\.io|framer\.website|framer\.app|wixsite\.com|myshopify\.com|bubbleapps\.io|web\.app|firebaseapp\.com|azurewebsites\.net|fly\.dev|railway\.app|replit\.app|carrd\.co)$/;
  var TWO_LEVEL = /\.(co|com|org|net|gov|ac|edu)\.[a-z]{2}$|\.(gouv|asso)\.fr$/;
  function rootOf(host) {
    host = host.toLowerCase().replace(/^www\./, "");
    if (SHARED_HOST.test(host)) return host;
    return host.split(".").slice(TWO_LEVEL.test(host) ? -3 : -2).join(".");
  }
  // Identifiant reçu d'un autre sous-domaine du même site (lien de www vers app) : repris, puis
  // retiré de l'adresse affichée.
  var LINK_PARAM = "_sc";
  var passed = null;
  try {
    var query = new URLSearchParams(location.search);
    passed = query.get(LINK_PARAM);
    if (passed !== null) {
      query.delete(LINK_PARAM);
      var rest = query.toString();
      history.replaceState(history.state, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
    }
    if (passed && !VISITOR_ID.test(passed)) passed = null;
  } catch {
    passed = null;
  }

  // Identifiant aléatoire du visiteur, gardé sur ce site seulement.
  function randomId() {
    var bytes = new Uint8Array(12);
    if (window.crypto && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return "v_" + Array.prototype.map.call(bytes, function (b) {
      return ("0" + b.toString(36)).slice(-2);
    }).join("");
  }
  // Identifiant gardé 13 mois au plus (recommandation CNIL), puis remplacé par un nouveau.
  var MAX_AGE_MS = 395 * 24 * 60 * 60 * 1000;
  var visitor;
  try {
    if (passed) {
      localStorage.setItem("sc_vid", passed);
      localStorage.setItem("sc_vid_t", String(Date.now()));
    }
    var since = Number(localStorage.getItem("sc_vid_t")) || 0;
    visitor = localStorage.getItem("sc_vid");
    if (!visitor || !since || Date.now() - since > MAX_AGE_MS) {
      // Identifiant d'avant cette règle (sans date) : daté d'aujourd'hui, pas remplacé.
      if (!visitor || since) visitor = randomId();
      localStorage.setItem("sc_vid", visitor);
      localStorage.setItem("sc_vid_t", String(Date.now()));
    }
  } catch {
    visitor = passed || randomId();
  }

  function send(type, extra) {
    if (optedOut()) return;
    var message = { s: site, t: type, u: location.href, r: document.referrer, v: visitor, w: window.innerWidth };
    for (var key in extra) message[key] = extra[key];
    var body = JSON.stringify(message);
    // Texte brut : aucune requête préalable du navigateur, et l'envoi survit à la fermeture.
    if (navigator.sendBeacon && navigator.sendBeacon(endpoint, body)) return;
    if (window.fetch) fetch(endpoint, { method: "POST", body: body, keepalive: true, mode: "no-cors" });
  }

  // Une page vue par page : changer un filtre (?q=…) ou viser une section (#faq) n'en est pas
  // une ; une route d'application par l'ancre (#/tarifs) si.
  function pageKey() {
    var route = /^#!?\//.test(location.hash) ? location.hash.split("?")[0] : "";
    return location.origin + location.pathname + route;
  }
  var last = null;
  var lastUrl = null;
  function pageview() {
    var key = pageKey();
    if (key === last) return;
    var from = lastUrl || document.referrer;
    last = key;
    lastUrl = location.href;
    send("pageview", { r: from });
  }

  // Applications à page unique : chaque changement d'adresse est une page vue, qu'il ajoute une
  // page à l'historique (pushState) ou remplace la page courante (replaceState).
  ["pushState", "replaceState"].forEach(function (name) {
    var original = history[name];
    history[name] = function () {
      var result = original.apply(this, arguments);
      pageview();
      return result;
    };
  });
  window.addEventListener("popstate", pageview);
  window.addEventListener("hashchange", pageview);

  // Empreinte SHA-256 d'un email (minuscules, sans espaces) : l'email ne quitte jamais la page.
  function emailHash(value) {
    var data = new TextEncoder().encode(String(value).trim().toLowerCase());
    return crypto.subtle.digest("SHA-256", data).then(function (hash) {
      return Array.prototype.map.call(new Uint8Array(hash), function (b) {
        return ("0" + b.toString(16)).slice(-2);
      }).join("");
    });
  }
  var canHash = !!(window.crypto && crypto.subtle && window.TextEncoder);

  window.saasclair = function (command, value) {
    if (command !== "identify" || !value || !canHash) return;
    emailHash(value).then(function (hex) {
      send("identify", { e: hex });
    });
  };

  // Liens vers un autre sous-domaine du même site : l'identifiant du visiteur les accompagne,
  // pour que www et app voient la même personne (sans cookie).
  function decorate(event) {
    var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!link) return;
    try {
      var url = new URL(link.href, location.href);
      if (!/^https?:$/.test(url.protocol) || url.hostname === location.hostname) return;
      if (rootOf(url.hostname) !== rootOf(location.hostname)) return;
      url.searchParams.set(LINK_PARAM, visitor);
      link.href = url.href;
    } catch {
      // Lien illisible : laissé tel quel.
    }
  }
  document.addEventListener("mousedown", decorate, true);
  document.addEventListener("click", decorate, true);

  // Inscription : l'email saisi dans le formulaire relie l'inscrit à sa provenance, sans ligne
  // à ajouter. Seulement un formulaire d'inscription (page d'inscription, ou mot de passe hors
  // page de connexion) ; l'empreinte est préparée dès la saisie, pour partir avant le changement
  // de page.
  var SIGNUP_PAGE = /sign-?up|register|inscri|essai|trial|cr[eé]er|create|get-?started|join|onboard/i;
  var LOGIN_PAGE = /log-?in|sign-?in|connexion|connect|auth|session|password|mot-de-passe/i;
  var EMAIL_FIELD =
    'input[type="email"], input[autocomplete="email"], input[name*="email" i], input[id*="email" i]';
  var ready = { value: null, hash: null };
  function signupForm(form) {
    if (!form || !form.querySelector || script.getAttribute("data-identify") === "off") return null;
    var field;
    try {
      field = form.querySelector(EMAIL_FIELD);
    } catch {
      field = form.querySelector('input[type="email"]');
    }
    if (!field || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(field.value).trim())) return null;
    var path = location.pathname + location.hash;
    var hasPassword = !!form.querySelector('input[type="password"]');
    if (SIGNUP_PAGE.test(path) || (hasPassword && !LOGIN_PAGE.test(path))) return field;
    return null;
  }
  if (canHash) {
    document.addEventListener(
      "change",
      function (event) {
        var field = event.target && event.target.form ? signupForm(event.target.form) : null;
        if (!field) return;
        var value = String(field.value).trim().toLowerCase();
        emailHash(value).then(function (hex) {
          ready = { value: value, hash: hex };
        });
      },
      true,
    );
    document.addEventListener(
      "submit",
      function (event) {
        var field = signupForm(event.target);
        if (!field) return;
        var value = String(field.value).trim().toLowerCase();
        if (ready.value === value && ready.hash) send("identify", { e: ready.hash });
        else window.saasclair("identify", value);
      },
      true,
    );
  }

  pageview();
})();
