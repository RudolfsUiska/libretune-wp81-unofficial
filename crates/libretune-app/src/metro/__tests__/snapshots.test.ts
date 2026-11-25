import { __resetSnapshots, canSnapshot, captureTab, getSnapshot, pruneSnapshots } from '../snapshots';

describe('page snapshots', () => {
  afterEach(() => {
    delete window.LibreTuneNative;
    __resetSnapshots();
    vi.useRealTimers();
  });

  it('does nothing without the Android bridge', async () => {
    expect(canSnapshot()).toBe(false);
    await captureTab('veTable');
    expect(getSnapshot('veTable')).toBeUndefined();
  });

  it('stores the picture the bridge sends back, and prunes closed pages', async () => {
    window.LibreTuneNative = {
      snapshot: (token: string) => setTimeout(() => window.__metroSnapshotDone?.(token, 'data:image/jpeg;base64,AAA'), 0),
    };
    await captureTab('veTable');
    await captureTab('dashboard');
    expect(getSnapshot('veTable')).toBe('data:image/jpeg;base64,AAA');
    pruneSnapshots(['dashboard']);
    expect(getSnapshot('veTable')).toBeUndefined();
    expect(getSnapshot('dashboard')).toBeDefined();
  });

  it('keeps no picture when the bridge returns none or never answers', async () => {
    window.LibreTuneNative = { snapshot: (token: string) => window.__metroSnapshotDone?.(token, '') };
    await captureTab('a');
    expect(getSnapshot('a')).toBeUndefined();

    vi.useFakeTimers();
    window.LibreTuneNative = { snapshot: () => {} };
    const p = captureTab('b');
    vi.advanceTimersByTime(2000);
    await p;
    expect(getSnapshot('b')).toBeUndefined();
  });
});
