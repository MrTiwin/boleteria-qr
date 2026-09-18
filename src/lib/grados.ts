// Military rank order, highest to lowest — not alphabetical. Any grado not in this list (a typo,
// a rank added later) sorts after all known ones instead of disappearing.
export const GRADO_ORDER = [
  "CRL",
  "TTE CRL",
  "MY",
  "CAP",
  "TTE",
  "TTE A",
] as const;

function gradoRank(grado: string): number {
  const index = GRADO_ORDER.indexOf(grado as (typeof GRADO_ORDER)[number]);
  return index === -1 ? GRADO_ORDER.length : index;
}

export function compareByGrado(a: string, b: string): number {
  return gradoRank(a) - gradoRank(b);
}

export function sortGrados(grados: Iterable<string>): string[] {
  return [...new Set(grados)].sort(compareByGrado);
}
