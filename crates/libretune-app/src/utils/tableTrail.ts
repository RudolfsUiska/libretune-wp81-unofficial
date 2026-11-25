/**
 * Shared primitives for the table trail line (issue #132).
 *
 * The trail follows the live operating point across a table grid: points are
 * recorded in DATA space (row indexes the table's Y bins as stored, col
 * indexes the X bins), independent of how any particular view displays the
 * grid. Views that flip the Y axis (`yAxisBottom`) map through
 * {@link trailDisplayRow} at draw time.
 */

export interface TrailPoint {
  /** Data-space row (index into the table's Y bins as stored). */
  row: number;
  /** Data-space column (index into the table's X bins). */
  col: number;
  /** Recording time (Date.now(), ms). */
  time: number;
}

/**
 * Display row for a data-space row. `yAxisBottom` renders rows reversed;
 * geometry arrays follow the DOM, so an overlay must flip back.
 */
export function trailDisplayRow(row: number, rowCount: number, yAxisBottom: boolean): number {
  return yAxisBottom ? rowCount - 1 - row : row;
}

/**
 * Channels to try, in order, for a table axis' live value.
 *
 * An INI may name a *computed* channel as the axis (rusEFI:
 * `veTableYAxisDisplay = { metric ? veTableYAxis : veTableYAxis * 0.145 }`)
 * that the realtime stream does not always publish. Reading only that name
 * leaves the cursor pinned to row 0 while the engine moves through the map.
 * Fall back to the raw channel behind a `...Display` wrapper, then to the
 * canonical channel for that axis.
 */
export function axisChannelCandidates(
  declared: string | null | undefined,
  canonical: string,
): string[] {
  const out: string[] = [];
  if (declared) {
    out.push(declared);
    if (declared.endsWith('Display') && declared.length > 'Display'.length) {
      out.push(declared.slice(0, -'Display'.length));
    }
  }
  if (!out.includes(canonical)) out.push(canonical);
  return out;
}

/** First candidate channel that has a finite live value. */
export function firstLiveValue(
  values: Record<string, number | undefined> | null | undefined,
  candidates: readonly string[],
): number | undefined {
  if (!values) return undefined;
  for (const c of candidates) {
    const v = values[c];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return undefined;
}
