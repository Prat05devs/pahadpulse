export interface PageInfo {
  hasNext: boolean;
  nextCursor: number | null;
}

export interface Paginated<T> {
  data: T[];
  pagination: PageInfo;
}
