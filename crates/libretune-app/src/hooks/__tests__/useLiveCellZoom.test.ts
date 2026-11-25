import { describe, expect, it } from 'vitest';
import { liveZoomFactor, liveZoomScrollTarget, LIVE_ZOOM_COLS, LIVE_ZOOM_ROWS } from '../useLiveCellZoom';
import type { GridGeometry } from '../useTableGridGeometry';

/** 16x16 grid of 50x20 cells behind a 40px-wide, 20px-tall header. */
function grid(headerAtBottom: boolean): GridGeometry {
  const cols = Array.from({ length: 16 }, (_, i) => ({ left: 40 + i * 50, width: 50 }));
  const rows = Array.from({ length: 16 }, (_, i) => ({
    top: (headerAtBottom ? 0 : 20) + i * 20,
    height: 20,
  }));
  return { left: 0, top: 0, width: 40 + 16 * 50, height: 20 + 16 * 20, cols, rows };
}

describe('liveZoomFactor', () => {
  it('zooms so the window of cells plus the headers fills the space', () => {
    const zoom = liveZoomFactor(
      { width: 840, height: 340, headerW: 40, headerH: 20 },
      { cols: 16, rows: 16 },
      { width: 340, height: 1000 },
    );
    // Width-limited: 40 + 6 * 50 = 340 px must fit 340 px.
    expect(zoom).toBeCloseTo(340 / (40 + LIVE_ZOOM_COLS * 50));
  });

  it('is limited by height on a wide, short screen', () => {
    const zoom = liveZoomFactor(
      { width: 840, height: 340, headerW: 40, headerH: 20 },
      { cols: 16, rows: 16 },
      { width: 2000, height: 240 },
    );
    expect(zoom).toBeCloseTo(240 / (20 + LIVE_ZOOM_ROWS * 20));
  });

  it('never asks for more cells than the table has', () => {
    const zoom = liveZoomFactor(
      { width: 140, height: 60, headerW: 40, headerH: 20 },
      { cols: 2, rows: 2 },
      { width: 280, height: 1000 },
    );
    expect(zoom).toBeCloseTo(2);
  });

  it('falls back to 1 when there is nothing to measure', () => {
    expect(
      liveZoomFactor(
        { width: 0, height: 0, headerW: 0, headerH: 0 },
        { cols: 16, rows: 16 },
        { width: 300, height: 300 },
      ),
    ).toBe(1);
  });
});

describe('liveZoomScrollTarget', () => {
  const viewport = { width: 340, height: 120 };

  it('centres the cell in the area the top/left headers leave free', () => {
    const t = liveZoomScrollTarget(grid(false), { displayRow: 8, col: 8 }, viewport, false)!;
    // Cell centre (465, 190) must land mid-way between header edge and far edge.
    expect(465 - t.left).toBeCloseTo((40 + 340) / 2);
    expect(190 - t.top).toBeCloseTo((20 + 120) / 2);
  });

  it('accounts for a header stuck to the bottom edge', () => {
    const t = liveZoomScrollTarget(grid(true), { displayRow: 8, col: 8 }, viewport, true)!;
    expect(170 - t.top).toBeCloseTo((120 - 20) / 2);
  });

  it('does not scroll past the start for a corner cell', () => {
    const t = liveZoomScrollTarget(grid(false), { displayRow: 0, col: 0 }, viewport, false)!;
    expect(t).toEqual({ left: 0, top: 0 });
  });

  it('returns null for a cell outside the grid', () => {
    expect(liveZoomScrollTarget(grid(false), { displayRow: 99, col: 0 }, viewport, false)).toBeNull();
  });
});
