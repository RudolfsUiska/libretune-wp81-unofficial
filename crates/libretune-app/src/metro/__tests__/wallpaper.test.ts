import { PARALLAX, fitWithin, getWallpaper, setWallpaper, wallpaperBox } from '../wallpaper';

describe('start background', () => {
  afterEach(() => setWallpaper({ kind: 'none' }));

  it('stores photos at most 1600 px on the long side, never enlarged', () => {
    expect(fitWithin(4000, 3000)).toEqual({ w: 1600, h: 1200 });
    expect(fitWithin(1080, 2340)).toEqual({ w: 738, h: 1600 });
    expect(fitWithin(800, 600)).toEqual({ w: 800, h: 600 });
  });

  it('sizes the picture to cover the view plus the parallax share of the scroll', () => {
    // CSS wallpapers stretch to the box
    expect(wallpaperBox(400, 800, 1000, null)).toEqual({ w: 400, h: 800 + 1000 * PARALLAX, x: 0 });
    // a wide photo is scaled to the box height and centred
    const wide = wallpaperBox(400, 800, 0, 2);
    expect(wide.h).toBe(800);
    expect(wide.w).toBe(1600);
    expect(wide.x).toBe(-600);
    // a tall photo fills the width
    expect(wallpaperBox(400, 800, 0, 0.25)).toEqual({ w: 400, h: 1600, x: 0 });
  });

  it('remembers the choice and ignores unknown built-ins', () => {
    setWallpaper({ kind: 'builtin', id: 'sunset' });
    expect(getWallpaper().css).toContain('linear-gradient');
    setWallpaper({ kind: 'builtin', id: 'no-such-wallpaper' });
    expect(getWallpaper().css).toBeNull();
    // a photo choice without a stored photo falls back to none
    setWallpaper({ kind: 'photo' });
    expect(getWallpaper().choice).toEqual({ kind: 'none' });
  });
});
