/**
 * Le serveur de données (PostgREST) ne renvoie jamais plus de 1 000 lignes par requête
 * (`PGRST_DB_MAX_ROWS`), sans signaler qu'il a coupé : un `.limit(50_000)` ne suffit pas.
 * On lit donc page par page, dans un ordre stable, jusqu'à la dernière page ou au plafond.
 */
export const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: unknown };

export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  max: number,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < max; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE, max) - 1;
    const { data, error } = await page(from, to);
    if (error || !data) break;
    rows.push(...data);
    if (data.length < to - from + 1) break;
  }
  return rows;
}
