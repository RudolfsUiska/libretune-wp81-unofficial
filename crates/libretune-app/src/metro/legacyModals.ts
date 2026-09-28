import { nav } from './nav';

/**
 * LibreTune's own dialogs know nothing about the Back button: on the phone,
 * Back would leave the page underneath and keep the dialog open. While any of
 * them is on screen, hold a Back layer that closes the topmost one - with its
 * close or cancel button when it has one, otherwise with Escape, which the
 * shared Dialog and most others listen for.
 */
export const LEGACY_OVERLAYS = [
  '.modal-overlay', '.units-backdrop', '.action-recorder-overlay', '.plugin-consent-overlay',
  '.diff-modal-overlay', '.tune-history-overlay', '.lt-dialog-overlay', '.ts-dashboard-dialog-overlay',
  '.ts-dashboard-selector-overlay', '.command-warning-overlay', '.rebin-dialog-overlay',
  '.preflight-backdrop', '.dialog-overlay',
].join(', ');

const CLOSE_BUTTONS =
  '.lt-dialog__close, .dialog-close, .modal-close, [class*="close-btn"], [class*="close-button"], button[aria-label^="Close" i]';

function closeTopmost(): void {
  const all = document.querySelectorAll<HTMLElement>(LEGACY_OVERLAYS);
  const top = all[all.length - 1];
  if (!top) return;
  const byClass = top.querySelector<HTMLButtonElement>(CLOSE_BUTTONS);
  const byText = Array.from(top.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
    /^(cancel|close|×|✕|x)$/i.test(b.textContent?.trim() ?? ''),
  );
  const btn = byClass ?? byText;
  if (btn && !btn.disabled) {
    btn.click();
    return;
  }
  const esc = { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true };
  (document.activeElement ?? top).dispatchEvent(new KeyboardEvent('keydown', esc));
  window.dispatchEvent(new KeyboardEvent('keydown', esc));
}

export function installLegacyModalBack(): () => void {
  let release: (() => void) | null = null;
  let queued = false;

  const check = () => {
    queued = false;
    const open = !!document.querySelector(LEGACY_OVERLAYS);
    if (open && !release) {
      release = nav.pushLayer(() => {
        // Back pressed: the layer is gone; close the dialog, then re-check in
        // case another one is still open underneath.
        release = null;
        closeTopmost();
        setTimeout(schedule, 80);
      });
    } else if (!open && release) {
      const r = release;
      release = null;
      r();
    }
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    setTimeout(check, 30);
  };

  const mo = new MutationObserver(schedule);
  mo.observe(document.body, { childList: true, subtree: true });
  schedule();
  return () => mo.disconnect();
}
