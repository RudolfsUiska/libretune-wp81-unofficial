import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import CydDashboard from '../CydDashboard';
import { MetroContext, type MetroCtx } from '../../../../metro/context';
import { useRealtimeStore } from '../../../../stores/realtimeStore';
import { arcPath, banner, coolantTone, gearBox, loadPage, type CydReadings } from '../cydLogic';

const calm: CydReadings = {
  rpm: 2720,
  boost: 0.2,
  coolant: 88,
  afr: 14.7,
  battery: 14.2,
  iat: 27,
  tps: 20,
  speed: 57,
  lambda: 1,
  timing: 18,
  gear: 3,
  duty: 30,
  mapBar: 1.2,
};

describe('CYD cluster logic', () => {
  it('shows the gear, N, R, or the shift arrow past the shift point', () => {
    expect(gearBox(calm)).toEqual({ kind: 'gear', text: '3' });
    expect(gearBox({ ...calm, gear: 0 }).text).toBe('N');
    expect(gearBox({ ...calm, gear: -1 }).text).toBe('R');
    expect(gearBox({ ...calm, gear: undefined }).text).toBe('–');
    expect(gearBox({ ...calm, rpm: 6200 }).kind).toBe('shift');
  });

  it('tones coolant cold, ok and hot', () => {
    expect(coolantTone(43)).toBe('cold');
    expect(coolantTone(89)).toBe('ok');
    expect(coolantTone(108)).toBe('hot');
  });

  it('draws nothing for an empty arc and a large arc past 180°', () => {
    expect(arcPath(120, 120, 100, 0, 0)).toBe('');
    expect(arcPath(120, 120, 100, 0, 1)).toContain(' 0 1 1 ');
    expect(arcPath(120, 120, 100, 0, 0.5)).toContain(' 0 0 1 ');
  });

  it('banners the first alert and counts the rest', () => {
    expect(banner(calm)).toBeNull();
    const b = banner({ ...calm, rpm: 7000, coolant: 110 });
    expect(b?.title).toBe('Over-rev');
    expect(b?.detail).toContain('+1 more');
  });
});

describe('CydDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    // The status page asks for the INI's lamps on mount.
    vi.mocked(invoke).mockResolvedValue(null);
  });
  afterEach(() => {
    act(() => useRealtimeStore.setState({ channels: {} }));
  });

  it('shows speed, rpm, gear and the corner readings', () => {
    act(() =>
      useRealtimeStore.setState({
        channels: { RPMValue: 2720, vehicleSpeedKph: 57, detectedGear: 3, coolant: 43, VBatt: 14.2, AFRValue: 13.2, intake: 27 },
      }),
    );
    render(<CydDashboard isConnected={true} />);
    expect(screen.getByText('57')).toBeInTheDocument();
    expect(screen.getByText('2720')).toBeInTheDocument();
    expect(screen.getByLabelText('gear 3')).toBeInTheDocument();
    expect(screen.getByLabelText('coolant')).toHaveClass('cold');
    expect(screen.getByText('14.2')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('switches to the engine page from the dots and remembers it', () => {
    render(<CydDashboard isConnected={true} />);
    fireEvent.click(screen.getByRole('button', { name: 'engine page' }));
    expect(screen.getByRole('heading', { name: 'Engine' })).toBeInTheDocument();
    expect(loadPage()).toBe('engine');
  });

  it('toggles logging through the shell and opens AutoTune instead of starting it', async () => {
    vi.mocked(invoke).mockResolvedValue({ running: false });
    const toggleLogging = vi.fn();
    const open = vi.fn();
    const metro = { isLogging: true, canLog: true, toggleLogging, open } as unknown as MetroCtx;
    render(
      <MetroContext.Provider value={metro}>
        <CydDashboard isConnected={true} />
      </MetroContext.Provider>,
    );
    const log = screen.getByRole('switch', { name: 'log' });
    expect(log).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(log);
    expect(toggleLogging).toHaveBeenCalledTimes(1);

    const at = screen.getByRole('switch', { name: 'autotune' });
    expect(at).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(at);
    expect(open).toHaveBeenCalledWith('autotune', 'AutoTune');
    expect(invoke).not.toHaveBeenCalledWith('start_autotune', expect.anything());
  });

  it('stops a running AutoTune session from the switch', async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: string) => (cmd === 'get_autotune_status' ? { running: true } : undefined));
    const metro = { isLogging: false, canLog: true, toggleLogging: vi.fn(), open: vi.fn() } as unknown as MetroCtx;
    render(
      <MetroContext.Provider value={metro}>
        <CydDashboard isConnected={true} />
      </MetroContext.Provider>,
    );
    const at = screen.getByRole('switch', { name: 'autotune' });
    await waitFor(() => expect(at).toHaveAttribute('aria-checked', 'true'));
    fireEvent.click(at);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('stop_autotune'));
    await waitFor(() => expect(at).toHaveAttribute('aria-checked', 'false'));
  });

  it('disables the switches when offline or outside the shell', () => {
    render(<CydDashboard isConnected={true} />);
    expect(screen.getByRole('switch', { name: 'log' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'autotune' })).toBeDisabled();
  });

  it('banners an alert, dismisses on tap, and shows dashes offline', () => {
    act(() => useRealtimeStore.setState({ channels: { RPMValue: 7000 } }));
    const { unmount } = render(<CydDashboard isConnected={true} />);
    fireEvent.click(screen.getByRole('alert'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('shift up')).toBeInTheDocument();
    unmount();
    render(<CydDashboard isConnected={false} />);
    expect(screen.queryByText('7000')).not.toBeInTheDocument();
    expect(screen.getByText('OFFLINE')).toBeInTheDocument();
  });
});
