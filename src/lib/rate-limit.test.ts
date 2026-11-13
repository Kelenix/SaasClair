import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("autorise jusqu'à la limite, puis refuse dans la fenêtre", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });
    expect([0, 1, 2, 3].map((t) => limiter.take("a", t))).toEqual([true, true, true, false]);
    expect(limiter.take("b", 3)).toBe(true);
  });

  it("libère les tentatives sorties de la fenêtre", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    limiter.take("a", 0);
    limiter.take("a", 500);
    expect(limiter.allows("a", 900)).toBe(false);
    expect(limiter.allows("a", 1001)).toBe(true);
  });

  it("une réussite peut remettre le compteur à zéro", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.hit("a", 0);
    expect(limiter.allows("a", 1)).toBe(false);
    limiter.reset("a");
    expect(limiter.allows("a", 2)).toBe(true);
  });
});
