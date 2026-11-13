import { describe, expect, it } from "vitest";
import { fetchAll, PAGE_SIZE } from "./fetch-all";

const table = (count: number) => Array.from({ length: count }, (_, index) => index);

/** Imite le serveur : jamais plus de PAGE_SIZE lignes, même si l'on en demande davantage. */
const server = (rows: number[]) => (from: number, to: number) =>
  Promise.resolve({ data: rows.slice(from, Math.min(to + 1, from + PAGE_SIZE)), error: null });

describe("fetchAll", () => {
  it("lit toutes les lignes au-delà de la limite de 1 000 du serveur", async () => {
    const rows = await fetchAll(server(table(2_500)), 50_000);
    expect(rows).toHaveLength(2_500);
    expect(rows.at(-1)).toBe(2_499);
  });

  it("s'arrête au plafond demandé", async () => {
    expect(await fetchAll(server(table(5_000)), 1_500)).toHaveLength(1_500);
  });

  it("gère une table vide ou une erreur sans planter", async () => {
    expect(await fetchAll(server([]), 10_000)).toEqual([]);
    expect(
      await fetchAll(() => Promise.resolve({ data: null, error: new Error("x") }), 10_000),
    ).toEqual([]);
  });

  it("lit une table d'exactement 1 000 lignes sans en perdre", async () => {
    expect(await fetchAll(server(table(PAGE_SIZE)), 50_000)).toHaveLength(PAGE_SIZE);
  });
});
