import { useEffect, useLayoutEffect, useState } from 'react';

/**
 * Start background, as in Windows Phone 8.1: a picture that shows through
 * the tiles (not around them), drifting slower than the tiles as Start
 * scrolls. Tiles with a colour of their own (burn pending, recording) stay
 * solid, as coloured app tiles did.
 *
 * Built-in wallpapers are CSS images, so they cost nothing to ship. A photo is
 * downscaled on the device and kept as a JPEG data URL in localStorage.
 */

export interface BuiltinWallpaper {
  id: string;
  label: string;
  /** A CSS <image> list; may use var(--wp-accent). */
  css: string;
}

export const BUILTIN_WALLPAPERS: BuiltinWallpaper[] = [
  {
    id: 'aurora',
    label: 'aurora',
    css:
      'radial-gradient(ellipse at 22% 28%, rgba(61, 220, 151, 0.75), transparent 55%), ' +
      'radial-gradient(ellipse at 78% 62%, rgba(0, 119, 182, 0.85), transparent 60%), ' +
      'linear-gradient(160deg, #03045e, #023e8a 45%, #0b132b)',
  },
  {
    id: 'sunset',
    label: 'sunset',
    css: 'linear-gradient(180deg, #1a0536 0%, #6a0572 35%, #e1306c 68%, #fcaf45 100%)',
  },
  {
    id: 'night-drive',
    label: 'night drive',
    css:
      'radial-gradient(circle at 50% 100%, rgba(255, 107, 0, 0.9) 0 6%, transparent 32%), ' +
      'repeating-linear-gradient(90deg, transparent 0 46%, rgba(255, 214, 10, 0.5) 46% 54%, transparent 54% 100%), ' +
      'linear-gradient(180deg, #000814, #001d3d 58%, #0b2545)',
  },
  {
    id: 'carbon',
    label: 'carbon fibre',
    css:
      'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.05) 0 5px, transparent 5px 10px), ' +
      'repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.5) 0 5px, transparent 5px 10px), ' +
      'linear-gradient(160deg, #3a3a3a, #121212)',
  },
  {
    id: 'redline',
    label: 'redline',
    css:
      'radial-gradient(circle at 70% 35%, rgba(229, 20, 0, 0.85), transparent 45%), ' +
      'repeating-conic-gradient(from 0deg at 70% 35%, rgba(255, 255, 255, 0.07) 0 1.5deg, transparent 1.5deg 9deg), ' +
      'linear-gradient(200deg, #2b0000, #050505 70%)',
  },
  {
    id: 'accent',
    label: 'accent glow',
    css:
      'radial-gradient(ellipse at 30% 20%, color-mix(in srgb, var(--wp-accent) 70%, white), transparent 60%), ' +
      'linear-gradient(160deg, var(--wp-accent), color-mix(in srgb, var(--wp-accent) 35%, black))',
  },
];

export type WallpaperChoice = { kind: 'none' } | { kind: 'builtin'; id: string } | { kind: 'photo' };

export interface ActiveWallpaper {
  /** CSS image value for background-image, or null for none. */
  css: string | null;
  /** Natural width/height of a photo; null for CSS wallpapers (they stretch). */
  aspect: number | null;
  choice: WallpaperChoice;
}

const CHOICE_KEY = 'libretune.metro.wallpaper';
const PHOTO_KEY = 'libretune.metro.wallpaperPhoto';
const EVENT = 'libretune:metro-wallpaper';

/** Longest side of a stored photo. Enough for a phone screen plus parallax. */
export const PHOTO_MAX_SIDE = 1600;

function readChoice(): WallpaperChoice {
  try {
    const raw = JSON.parse(localStorage.getItem(CHOICE_KEY) || 'null');
    if (raw?.kind === 'builtin' && BUILTIN_WALLPAPERS.some((w) => w.id === raw.id)) return raw;
    if (raw?.kind === 'photo' && localStorage.getItem(PHOTO_KEY)) return raw;
  } catch {
    // fall through
  }
  return { kind: 'none' };
}

export function getWallpaper(): ActiveWallpaper {
  const choice = readChoice();
  if (choice.kind === 'builtin') {
    return { css: BUILTIN_WALLPAPERS.find((w) => w.id === choice.id)!.css, aspect: null, choice };
  }
  if (choice.kind === 'photo') {
    try {
      const photo = JSON.parse(localStorage.getItem(PHOTO_KEY) || 'null') as { url: string; aspect: number } | null;
      if (photo?.url) return { css: `url("${photo.url}")`, aspect: photo.aspect || 1, choice };
    } catch {
      // fall through
    }
  }
  return { css: null, aspect: null, choice: { kind: 'none' } };
}

function save(choice: WallpaperChoice) {
  try {
    localStorage.setItem(CHOICE_KEY, JSON.stringify(choice));
  } catch {
    // Storage unavailable: lasts this session.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function setWallpaper(choice: WallpaperChoice): void {
  if (choice.kind !== 'photo') {
    try {
      localStorage.removeItem(PHOTO_KEY);
    } catch {
      // ignore
    }
  }
  save(choice);
}

/** The size a photo is stored at: longest side at most `max`, never enlarged. */
export function fitWithin(w: number, h: number, max = PHOTO_MAX_SIDE): { w: number; h: number } {
  const scale = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

/** Load, downscale and store a picked photo, then make it the wallpaper. */
export async function setWallpaperPhoto(file: File): Promise<void> {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('That file is not a picture this phone can read.'));
      i.src = src;
    });
    const { w, h } = fitWithin(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process the picture.');
    ctx.drawImage(img, 0, 0, w, h);
    const url = canvas.toDataURL('image/jpeg', 0.85);
    try {
      localStorage.setItem(PHOTO_KEY, JSON.stringify({ url, aspect: w / h }));
    } catch {
      throw new Error('The picture is too large to keep. Try a smaller one.');
    }
    save({ kind: 'photo' });
  } finally {
    URL.revokeObjectURL(src);
  }
}

export function useWallpaper(): ActiveWallpaper {
  const [wp, setWp] = useState(getWallpaper);
  useEffect(() => {
    const on = () => setWp(getWallpaper());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return wp;
}

/**
 * Background geometry for the parallax. The picture moves at `PARALLAX` of
 * the scroll speed, so it must cover the viewport plus that share of the
 * scroll range; a photo is scaled to cover that box and centred across it.
 */
export const PARALLAX = 0.3;

export function wallpaperBox(
  viewW: number,
  viewH: number,
  scrollMax: number,
  aspect: number | null,
): { w: number; h: number; x: number } {
  const boxH = viewH + Math.max(0, scrollMax) * PARALLAX;
  if (!aspect) return { w: viewW, h: boxH, x: 0 };
  // cover
  if (viewW / boxH > aspect) return { w: viewW, h: viewW / aspect, x: 0 };
  const w = boxH * aspect;
  return { w, h: boxH, x: (viewW - w) / 2 };
}

/**
 * Keep the wallpaper lined up across the tiles in `container`: sets the box
 * size and the scroll offset on the container, and each tile's position
 * (`--tx`/`--ty`, layout offsets, so animations do not skew them) on the
 * elements matching `selector`. CSS in metro.css does the drawing.
 */
export function useWallpaperGeometry(
  ref: React.RefObject<HTMLElement>,
  wp: ActiveWallpaper,
  selector: string,
): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !wp.css) return;
    const place = () => {
      const box = wallpaperBox(el.clientWidth, el.clientHeight, el.scrollHeight - el.clientHeight, wp.aspect);
      el.style.setProperty('--wall-w', `${box.w}px`);
      el.style.setProperty('--wall-h', `${box.h}px`);
      el.style.setProperty('--wall-x', `${box.x}px`);
      el.style.setProperty('--wall-k', String(1 - PARALLAX));
      el.querySelectorAll<HTMLElement>(selector).forEach((t) => {
        // Offsets up to `el`, summed through any positioned ancestors.
        let x = 0;
        let y = 0;
        let n: HTMLElement | null = t;
        while (n && n !== el) {
          x += n.offsetLeft;
          y += n.offsetTop;
          n = n.offsetParent as HTMLElement | null;
        }
        t.style.setProperty('--tx', `${x}px`);
        t.style.setProperty('--ty', `${y}px`);
      });
    };
    const onScroll = () => el.style.setProperty('--scroll', `${el.scrollTop}px`);
    place();
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    if (typeof ResizeObserver === 'undefined') return () => el.removeEventListener('scroll', onScroll);
    const ro = new ResizeObserver(place);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  });
}

/**
 * Start's wallpaper, drawn as one picture layer behind the tiles, so that
 * scrolling never repaints it. The layer lies over the whole scrolled content
 * and is masked down to the tile rectangles; the picture inside it drifts with
 * a scroll-driven CSS animation (metro.css, .wp-wall-img), which the
 * compositor runs in step with the scroll. Moving it from a scroll listener
 * instead lagged a frame or more behind the finger.
 *
 * The mask and sizes change only when the layout does (resize, tiles moved,
 * resized or pinned), never per scroll frame.
 */
export function useStartWallpaper(ref: React.RefObject<HTMLElement>, wp: ActiveWallpaper): void {
  useLayoutEffect(() => {
    const el = ref.current;
    const mask = el?.querySelector<HTMLElement>('.wp-wall-mask');
    const img = mask?.querySelector<HTMLElement>('.wp-wall-img');
    if (!el || !mask || !img || !wp.css) return;

    let raf = 0;
    const place = () => {
      raf = 0;
      const W = el.clientWidth;
      const H = el.clientHeight;
      // Content height from the flow content, not scrollHeight: the layer
      // itself would otherwise keep the page as tall as it once was.
      const last = el.querySelector<HTMLElement>('.wp-start-all');
      const padBottom = parseFloat(getComputedStyle(el).paddingBottom) || 0;
      const lastMargin = last ? parseFloat(getComputedStyle(last).marginBottom) || 0 : 0;
      const contentH = Math.max(H, last ? last.offsetTop + last.offsetHeight + lastMargin + padBottom : H);
      const scrollMax = contentH - H;
      const box = wallpaperBox(W, H, scrollMax, wp.aspect);

      mask.style.height = `${contentH}px`;
      img.style.width = `${box.w}px`;
      img.style.height = `${box.h}px`;
      img.style.left = `${box.x}px`;
      el.style.setProperty('--wall-travel', `${scrollMax * (1 - PARALLAX)}px`);

      const rects: string[] = [];
      el.querySelectorAll<HTMLElement>('.wp-tile-slot').forEach((slot) => {
        let x = 0;
        let y = 0;
        let n: HTMLElement | null = slot;
        while (n && n !== el) {
          x += n.offsetLeft;
          y += n.offsetTop;
          n = n.offsetParent as HTMLElement | null;
        }
        rects.push(`<rect x="${x}" y="${y}" width="${slot.offsetWidth}" height="${slot.offsetHeight}"/>`);
      });
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${contentH}">` +
        `<g fill="#000">${rects.join('')}</g></svg>`;
      const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      const size = `${W}px ${contentH}px`;
      mask.style.setProperty('mask-image', url);
      mask.style.setProperty('-webkit-mask-image', url);
      mask.style.setProperty('mask-size', size);
      mask.style.setProperty('-webkit-mask-size', size);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(place);
    };
    place();

    // Without scroll-driven animations, fall back to moving the picture from
    // the scroll event: a transform, at least, is cheap to update.
    const driven = typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: scroll()');
    const onScroll = () => {
      img.style.transform = `translate3d(0, ${el.scrollTop * (1 - PARALLAX)}px, 0)`;
    };
    if (!driven) {
      onScroll();
      el.addEventListener('scroll', onScroll, { passive: true });
    }

    const observers: { disconnect(): void }[] = [];
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(schedule);
      ro.observe(el);
      el.querySelectorAll('.wp-tiles').forEach((g) => ro.observe(g));
      observers.push(ro);
    }
    if (typeof MutationObserver !== 'undefined') {
      // Tiles moved, resized, pinned or unpinned.
      const mo = new MutationObserver(schedule);
      el.querySelectorAll('.wp-tiles').forEach((g) =>
        mo.observe(g, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }),
      );
      observers.push(mo);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      observers.forEach((o) => o.disconnect());
      el.removeEventListener('scroll', onScroll);
    };
  });
}
