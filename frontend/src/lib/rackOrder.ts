export function orderTiles<T extends { id: string }>(tiles: T[], order: string[]): T[] {
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));
  const used = new Set<string>();
  const ordered: T[] = [];
  for (const id of order) {
    const tile = byId.get(id);
    if (!tile) continue;
    ordered.push(tile);
    used.add(id);
  }
  for (const tile of tiles) {
    if (!used.has(tile.id)) ordered.push(tile);
  }
  return ordered;
}

export function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function insertDraggedId(ids: string[], dragId: string, insertIndex: number): string[] {
  const others = ids.filter((id) => id !== dragId);
  const index = Math.max(0, Math.min(insertIndex, others.length));
  others.splice(index, 0, dragId);
  return others;
}
