/**
 * Keep gauge text inside the gauge. The painters size text from the gauge's
 * height, as TunerStudio does; a dashboard stretched to fill a phone in
 * portrait makes some gauges tall and narrow, and their titles then ran off
 * the sides ("COOLANT" drawn as "OLA"). This makes fillText/strokeText on one
 * context squeeze a line horizontally (the canvas maxWidth argument) when it
 * would cross the gauge's edge, and leaves everything else untouched.
 */
export function fitTextToCanvas(ctx: CanvasRenderingContext2D, cssWidth: () => number): void {
  const proto = CanvasRenderingContext2D.prototype;
  const wrap = (draw: typeof proto.fillText) =>
    function (this: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth?: number) {
      const W = cssWidth();
      const m = this.getTransform();
      // Rotated or skewed text: no simple horizontal room to compare with.
      if (!W || m.b !== 0 || m.c !== 0 || m.a <= 0) return draw.call(this, text, x, y, maxWidth);
      const dpr = this.canvas.width / W;
      const sx = m.a / dpr; // user units -> CSS px
      const left = (m.a * x + m.e) / dpr; // anchor, CSS px
      const align = this.textAlign;
      const room =
        align === 'center'
          ? 2 * Math.min(left, W - left)
          : align === 'right' || align === 'end'
            ? left
            : W - left;
      const limit = Math.max(8, room - 2) / sx;
      const allowed = maxWidth === undefined ? limit : Math.min(maxWidth, limit);
      if (this.measureText(String(text)).width <= allowed) return draw.call(this, text, x, y, maxWidth);
      return draw.call(this, text, x, y, allowed);
    };
  ctx.fillText = wrap(proto.fillText);
  ctx.strokeText = wrap(proto.strokeText);
}
