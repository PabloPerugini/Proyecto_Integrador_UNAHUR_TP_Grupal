const NO_YEAR = 999;

export function yearLabel(year: number | null | undefined): string {
  return year == null || year === NO_YEAR ? 'Sin año' : `Año ${year}`;
}
