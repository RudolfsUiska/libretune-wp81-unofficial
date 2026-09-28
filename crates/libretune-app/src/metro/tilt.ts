/**
 * The Windows Phone "tilt" press effect: an element marked `.wp-tilt` leans
 * away under the finger, towards whichever edge was pressed, and sinks a
 * little when pressed in the middle. One document-level listener serves all.
 */
let installed = false;

export function installTilt(): void {
  if (installed) return;
  installed = true;
  let el: HTMLElement | null = null;
  let start: { x: number; y: number } | null = null;

  const release = () => {
    if (el) {
      el.style.transform = '';
      el.classList.remove('wp-pressed');
    }
    el = null;
    start = null;
  };

  document.addEventListener(
    'pointerdown',
    (e) => {
      const t = (e.target as HTMLElement | null)?.closest?.('.wp-tilt') as HTMLElement | null;
      if (!t || (t as HTMLButtonElement).disabled) return;
      release();
      const r = t.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      // Big targets (wide tiles, list rows) tilt less than small ones.
      const max = Math.max(4, Math.min(14, 2400 / Math.max(r.width, 1)));
      const sink = 1 - 0.05 * Math.max(0, 1 - Math.hypot(x, y) * 2);
      t.style.transform =
        `perspective(${Math.round(Math.max(r.width, r.height) * 3)}px) ` +
        `rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) scale(${sink.toFixed(3)})`;
      t.classList.add('wp-pressed');
      el = t;
      start = { x: e.clientX, y: e.clientY };
    },
    { passive: true },
  );
  document.addEventListener(
    'pointermove',
    (e) => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) release();
    },
    { passive: true },
  );
  document.addEventListener('pointerup', release, { passive: true });
  document.addEventListener('pointercancel', release, { passive: true });
  document.addEventListener('scroll', release, { passive: true, capture: true });
}
