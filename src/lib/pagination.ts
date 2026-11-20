export const PAGE_SIZES = [10, 25, 50, 100] as const;

export interface PageParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePage(sp: { page?: string | string[]; pageSize?: string | string[] }, defaultSize = 25): PageParams {
  const num = (v: string | string[] | undefined) => (typeof v === "string" ? Number.parseInt(v, 10) : NaN);
  const page = Math.max(1, Number.isFinite(num(sp.page)) ? num(sp.page) : 1);
  const rawSize = Number.isFinite(num(sp.pageSize)) ? num(sp.pageSize) : defaultSize;
  const pageSize = Math.min(100, Math.max(5, rawSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
