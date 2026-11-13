/**
 * Limiteur de débit en mémoire (fenêtre glissante), pour une seule instance de l'application
 * (le VPS n'en sert qu'une à la fois, ADR-021). Remis à zéro à chaque redémarrage : c'est un
 * frein contre les abus (analyses en rafale, mots de passe essayés en série), pas un compteur.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  const recent = (key: string, now: number) =>
    (hits.get(key) ?? []).filter((time) => now - time < windowMs);

  return {
    /** Encore autorisé ? (sans compter cette tentative) */
    allows(key: string, now = Date.now()) {
      return recent(key, now).length < limit;
    },
    /** Compte une tentative (réussie ou non, selon l'usage). */
    hit(key: string, now = Date.now()) {
      const times = recent(key, now);
      times.push(now);
      hits.set(key, times);
      // Ménage de temps en temps : la mémoire ne grossit pas indéfiniment.
      if (hits.size > 10_000) {
        for (const [other, list] of hits) {
          if (!list.some((time) => now - time < windowMs)) hits.delete(other);
        }
      }
    },
    /** Compte la tentative si elle est autorisée ; renvoie false sinon. */
    take(key: string, now = Date.now()) {
      if (!this.allows(key, now)) return false;
      this.hit(key, now);
      return true;
    },
    reset(key: string) {
      hits.delete(key);
    },
  };
}
