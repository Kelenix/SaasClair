/*! SaasClair — script de collecte (https://saasclair.com). Pages vues et provenance, sans
cookie ni adresse IP ; identifiant du visiteur gardé 13 mois au plus. Identification facultative d'un inscrit : saasclair("identify", email),
envoyée sous forme d'empreinte SHA-256, jamais en clair. */
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
  var endpoint = new URL("/api/collect", script.src).href;

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
    var since = Number(localStorage.getItem("sc_vid_t")) || 0;
    visitor = localStorage.getItem("sc_vid");
    if (!visitor || !since || Date.now() - since > MAX_AGE_MS) {
      // Identifiant d'avant cette règle (sans date) : daté d'aujourd'hui, pas remplacé.
      if (!visitor || since) visitor = randomId();
      localStorage.setItem("sc_vid", visitor);
      localStorage.setItem("sc_vid_t", String(Date.now()));
    }
  } catch {
    visitor = randomId();
  }

  function send(type, extra) {
    var message = { s: site, t: type, u: location.href, r: document.referrer, v: visitor, w: window.innerWidth };
    for (var key in extra) message[key] = extra[key];
    var body = JSON.stringify(message);
    // Texte brut : aucune requête préalable du navigateur, et l'envoi survit à la fermeture.
    if (navigator.sendBeacon && navigator.sendBeacon(endpoint, body)) return;
    if (window.fetch) fetch(endpoint, { method: "POST", body: body, keepalive: true, mode: "no-cors" });
  }

  var last = null;
  function pageview() {
    if (location.href === last) return;
    var from = last || document.referrer;
    last = location.href;
    send("pageview", { r: from });
  }

  // Applications à page unique : chaque changement d'adresse est une page vue.
  var push = history.pushState;
  history.pushState = function () {
    push.apply(this, arguments);
    pageview();
  };
  window.addEventListener("popstate", pageview);

  window.saasclair = function (command, value) {
    if (command !== "identify" || !value || !window.crypto || !crypto.subtle) return;
    var data = new TextEncoder().encode(String(value).trim().toLowerCase());
    crypto.subtle.digest("SHA-256", data).then(function (hash) {
      var hex = Array.prototype.map.call(new Uint8Array(hash), function (b) {
        return ("0" + b.toString(16)).slice(-2);
      }).join("");
      send("identify", { e: hex });
    });
  };

  pageview();
})();
