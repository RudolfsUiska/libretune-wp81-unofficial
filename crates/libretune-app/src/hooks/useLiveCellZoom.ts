/**
 * Live zoom: magnify a grid table around the cell the engine is in, and keep
 * that cell in view as the operating point moves.
 *
 * Meant for small screens, where a whole fuel table only fits with numbers
 * too small to read. The axis headers are `position: sticky` in both grids
 * that use this, so the RPM and load values stay pinned to the edges while
 * the cells scroll underneath.
 *
 * The hook owns `table.style.zoom` while enabled; anything else that sets it
 * (the editor's Fit mode) must stand down.
 */
import { useEffect, useLayoutEffect, type RefObject } from 'react';
import type { GridGeometry } from './useTableGridGeometry';

/** Cells kept visible around the live cell; the zoom is chosen to show these. */
export const LIVE_ZOOM_COLS = 6;
export const LIVE_ZOOM_ROWS = 5;
const MAX_ZOOM = 4;

export interface LiveZoomCell {
  /** Row in DISPLAY order (as rendered, after any Y-axis flip). */
  displayRow: number;
  col: number;
}

/**
 * Zoom factor that shows `LIVE_ZOOM_COLS` x `LIVE_ZOOM_ROWS` cells plus the
 * axis headers in the available space. Sizes are the table's unzoomed layout
 * sizes. Never zooms out below what shows the whole table.
 */
export function liveZoomFactor(
  natural: { width: number; height: number; headerW: number; headerH: number },
  counts: { cols: number; rows: number },
  avail: { width: number; height: number },
): number {
  const { width, height, headerW, headerH } = natural;
  if (!width || !height || counts.cols < 1 || counts.rows < 1) return 1;
  if (avail.width <= 0 || avail.height <= 0) return 1;
  const cellW = (width - headerW) / counts.cols;
  const cellH = (height - headerH) / counts.rows;
  const wantW = headerW + Math.min(counts.cols, LIVE_ZOOM_COLS) * cellW;
  const wantH = headerH + Math.min(counts.rows, LIVE_ZOOM_ROWS) * cellH;
  const zoom = Math.min(MAX_ZOOM, avail.width / wantW, avail.height / wantH);
  return zoom > 0 && Number.isFinite(zoom) ? zoom : 1;
}

/**
 * Scroll offsets that centre a cell in the part of the viewport the sticky
 * headers leave free. Geometry is in the scroll host's content space.
 */
export function liveZoomScrollTarget(
  g: GridGeometry,
  cell: LiveZoomCell,
  viewport: { width: number; height: number },
  headerAtBottom: boolean,
): { left: number; top: number } | null {
  const c = g.cols[cell.col];
  const r = g.rows[cell.displayRow];
  const first = g.rows[0];
  const last = g.rows[g.rows.length - 1];
  if (!c || !r || !first || !last || !g.cols[0]) return null;

  const headerW = g.cols[0].left;
  const headerH = headerAtBottom ? g.height - (last.top + last.height) : first.top;
  const cx = g.left + c.left + c.width / 2;
  const cy = g.top + r.top + r.height / 2;

  return {
    left: Math.max(0, cx - (viewport.width + headerW) / 2),
    top: Math.max(
      0,
      headerAtBottom
        ? cy - (viewport.height - headerH) / 2
        : cy - (viewport.height + headerH) / 2,
    ),
  };
}

export interface UseLiveCellZoomOptions {
  enabled: boolean;
  /** Measured grid geometry (re-measured by its owner when the zoom changes). */
  geometry: GridGeometry | null;
  /** The live cell, or null when there is no live position. */
  cell: LiveZoomCell | null;
  colCount: number;
  rowCount: number;
  /** X-axis header rendered in a tfoot (Y axis zero at bottom). */
  headerAtBottom: boolean;
  /** Anything that remounts the table (table switch, 2D/3D). */
  viewKey?: string | number | boolean;
}

export function useLiveCellZoom(
  tableRef: RefObject<HTMLTableElement | null>,
  hostRef: RefObject<HTMLDivElement | null>,
  opts: UseLiveCellZoomOptions,
): void {
  const { enabled, geometry, cell, colCount, rowCount, headerAtBottom, viewKey } = opts;

  // Zoom: reset, measure the natural size, set. Applied straight to the
  // element, like Fit, so there is no render feedback loop.
  useLayoutEffect(() => {
    const host = hostRef.current;
    const table = tableRef.current;
    if (!enabled || !host || !table) return;

    const apply = () => {
      table.style.zoom = '';
      table.style.height = '';
      // Intrinsic size: a table styled to span its container would otherwise
      // report the container's width and could never be wider than it.
      table.style.width = 'max-content';
      const corner = table.querySelector<HTMLTableCellElement>('thead th, tfoot th');
      if (!corner) return;
      const cs = getComputedStyle(host);
      const zoom = liveZoomFactor(
        {
          width: table.offsetWidth,
          height: table.offsetHeight,
          headerW: corner.offsetWidth,
          headerH: corner.offsetHeight,
        },
        { cols: colCount, rows: rowCount },
        {
          width: host.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0'),
          height: host.clientHeight - parseFloat(cs.paddingTop || '0') - parseFloat(cs.paddingBottom || '0'),
        },
      );
      table.style.zoom = String(zoom);
    };

    // Zooming can add or remove scroll bars, which resizes the host; only
    // re-apply when the host changed size for some other reason.
    let appliedSize = '';
    const hostSize = () => `${host.clientWidth}x${host.clientHeight}`;
    const reapply = () => {
      if (hostSize() === appliedSize) return;
      apply();
      appliedSize = hostSize();
    };
    reapply();

    const reset = () => {
      table.style.zoom = '';
      table.style.width = '';
    };
    if (typeof ResizeObserver === 'undefined') return reset; // jsdom
    const ro = new ResizeObserver(reapply);
    ro.observe(host);
    return () => {
      ro.disconnect();
      reset();
    };
  }, [enabled, tableRef, hostRef, colCount, rowCount, headerAtBottom, viewKey]);

  // Follow: re-centre whenever the live cell changes (or the grid is
  // re-measured after a zoom/rotation). Between changes the user is free to
  // pan around; the next cell change brings the view back.
  const row = cell?.displayRow;
  const col = cell?.col;
  useEffect(() => {
    const host = hostRef.current;
    if (!enabled || !host || !geometry || row === undefined || col === undefined) return;
    const target = liveZoomScrollTarget(
      geometry,
      { displayRow: row, col },
      { width: host.clientWidth, height: host.clientHeight },
      headerAtBottom,
    );
    if (!target) return;
    if (typeof host.scrollTo === 'function') {
      host.scrollTo({ left: target.left, top: target.top, behavior: 'smooth' });
    } else {
      host.scrollLeft = target.left;
      host.scrollTop = target.top;
    }
  }, [enabled, hostRef, geometry, row, col, headerAtBottom]);
}

/**
 * Fit: scale a grid table so the whole of it is visible in its scroll host -
 * down when it is too big, up (to 3x) when there is room - and stretch the
 * rows over any spare height. The counterpart of live zoom for when the
 * overview matters more than the digits; the two must not be on together.
 */
export function useFitTableZoom(
  tableRef: RefObject<HTMLTableElement | null>,
  hostRef: RefObject<HTMLDivElement | null>,
  opts: { enabled: boolean; colCount: number; rowCount: number; viewKey?: string | number | boolean },
): void {
  const { enabled, colCount, rowCount, viewKey } = opts;
  useLayoutEffect(() => {
    const host = hostRef.current;
    const table = tableRef.current;
    if (!enabled || !host || !table) return;
    const reset = () => {
      table.style.zoom = '';
      table.style.height = '';
      table.style.width = '';
    };
    const fit = () => {
      reset();
      // Measure the intrinsic size, not the container-spanning one: a table
      // styled width:100% reports the host's width (in its own zoomed units
      // once zoomed), which says nothing about how much it can be scaled.
      table.style.width = 'max-content';
      const w = table.offsetWidth;
      const h = table.offsetHeight;
      table.style.width = '';
      const cs = getComputedStyle(host);
      const availW = host.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0');
      const availH = host.clientHeight - parseFloat(cs.paddingTop || '0') - parseFloat(cs.paddingBottom || '0');
      if (!w || !h || availW <= 0 || availH <= 0) return;
      const zoom = Math.min(3, availW / w, availH / h);
      table.style.zoom = String(zoom);
      // Spare room goes to the cells: fill the host in both directions.
      table.style.width = `${availW / zoom}px`;
      const fillH = availH / zoom;
      if (fillH > h + 1) table.style.height = `${fillH}px`;
    };
    // Same guard as live zoom: fitting can toggle a scroll bar and resize the
    // host, and re-fitting on that would loop.
    let fittedSize = '';
    const hostSize = () => `${host.clientWidth}x${host.clientHeight}`;
    const refit = () => {
      if (hostSize() === fittedSize) return;
      fit();
      fittedSize = hostSize();
    };
    refit();
    if (typeof ResizeObserver === 'undefined') return reset; // jsdom
    const ro = new ResizeObserver(refit);
    ro.observe(host);
    return () => {
      ro.disconnect();
      reset();
    };
  }, [enabled, tableRef, hostRef, colCount, rowCount, viewKey]);
}
