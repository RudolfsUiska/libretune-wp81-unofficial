import { act, render, screen } from '@testing-library/react';
import Win81Dashboard from '../Win81Dashboard';
import { useRealtimeStore } from '../../../../stores/realtimeStore';
import { alerts, afrOutOfBand, fraction, show, type Win81Readings } from '../win81Logic';

const calm: Win81Readings = {
  rpm: 2500,
  boost: 0.4,
  coolant: 88,
  afr: 14.7,
  battery: 13.9,
  iat: 25,
  tps: 20,
  speed: 60,
  lambda: 1,
  timing: 18,
};

describe('Windows 8.1 dash logic', () => {
  it('raises alerts from the shared limits', () => {
    expect(alerts(calm)).toEqual([]);
    const hot = alerts({ ...calm, rpm: 7000, coolant: 108, battery: 11.2 }).map((a) => a.key);
    expect(hot).toEqual(['rpm', 'coolant', 'battery']);
    expect(alerts({ ...calm, boost: 1.6 }).map((a) => a.text)).toEqual(['boost high']);
  });

  it('treats lean or rich AFR as a colour change, not an alert', () => {
    expect(afrOutOfBand(18)).toBe(true);
    expect(afrOutOfBand(14.7)).toBe(false);
    expect(alerts({ ...calm, afr: 18 })).toEqual([]);
  });

  it('clamps meter fractions and formats readouts', () => {
    expect(fraction(4000, 0, 8000)).toBe(0.5);
    expect(fraction(-10, 0, 8000)).toBe(0);
    expect(fraction(undefined, 0, 8000)).toBe(0);
    expect(show.boost(0.854)).toBe('+0.85');
    expect(show.boost(-0.6)).toBe('−0.60');
    expect(show.temp(88.4)).toBe('88°');
    expect(show.rpm(undefined)).toBe('—');
  });
});

describe('Win81Dashboard', () => {
  afterEach(() => {
    act(() => useRealtimeStore.setState({ channels: {} }));
  });

  it('shows rusEFI readings on the tiles', () => {
    act(() =>
      useRealtimeStore.setState({
        channels: {
          RPMValue: 3200,
          MAPValue: 181.3,
          baroPressure: 101.3,
          coolant: 88.4,
          AFRValue: 13.2,
          VBatt: 13.9,
          intake: 24,
          TPSValue: 37,
          vehicleSpeedKph: 64,
        },
      }),
    );
    render(<Win81Dashboard isConnected={true} />);
    expect(screen.getByText('3200')).toBeInTheDocument();
    expect(screen.getByText('88°')).toBeInTheDocument();
    expect(screen.getByText('13.2')).toBeInTheDocument();
    expect(screen.getByText('13.9')).toBeInTheDocument();
    expect(screen.getByText('37%')).toBeInTheDocument();
    expect(screen.getByText('64')).toBeInTheDocument();
    expect(screen.getByText('all clear')).toBeInTheDocument();
  });

  it('turns tiles red and counts alerts', () => {
    act(() => useRealtimeStore.setState({ channels: { RPMValue: 7000, coolant: 110 } }));
    render(<Win81Dashboard isConnected={true} />);
    expect(screen.getByText('over-rev · coolant hot')).toBeInTheDocument();
    expect(screen.getByLabelText('engine speed')).toHaveStyle({ background: '#ee1111' });
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows dashes instead of stale values when offline', () => {
    act(() => useRealtimeStore.setState({ channels: { RPMValue: 3200 } }));
    render(<Win81Dashboard isConnected={false} />);
    expect(screen.queryByText('3200')).not.toBeInTheDocument();
    expect(screen.getByText('offline')).toBeInTheDocument();
    expect(screen.getByText('no ecu link')).toBeInTheDocument();
  });
});
