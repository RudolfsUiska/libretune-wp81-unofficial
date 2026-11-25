import { act, fireEvent, render, screen } from '@testing-library/react';
import ZuneDashboard from '../ZuneDashboard';
import { useRealtimeStore } from '../../../../stores/realtimeStore';
import { featureState, loadFeatured, pivotOrder, type ZuneReadings } from '../zuneLogic';

const calm: ZuneReadings = {
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

describe('Zune dash logic', () => {
  it('rotates the pivot so the featured word comes first', () => {
    expect(pivotOrder('rpm').map((f) => f.pivot)).toEqual(['engine', 'boost', 'mixture', 'coolant', 'battery']);
    expect(pivotOrder('coolant').map((f) => f.pivot)).toEqual(['coolant', 'battery', 'engine', 'boost', 'mixture']);
  });

  it('uses the shared limits for alerts, and AFR only cautions', () => {
    expect(featureState('rpm', calm)).toBe('normal');
    expect(featureState('rpm', { ...calm, rpm: 7000 })).toBe('alert');
    expect(featureState('coolant', { ...calm, coolant: 110 })).toBe('alert');
    expect(featureState('afr', { ...calm, afr: 18 })).toBe('caution');
  });
});

describe('ZuneDashboard', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    act(() => useRealtimeStore.setState({ channels: {} }));
  });

  it('features engine speed and lists the other readings', () => {
    act(() =>
      useRealtimeStore.setState({
        channels: { RPMValue: 3200, coolant: 88.4, AFRValue: 13.2, VBatt: 13.9, TPSValue: 37, vehicleSpeedKph: 64 },
      }),
    );
    render(<ZuneDashboard isConnected={true} />);
    expect(screen.getByLabelText('engine speed')).toHaveTextContent('3200');
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('13.2')).toBeInTheDocument();
    expect(screen.getByText('37%')).toBeInTheDocument();
    expect(screen.getByText('all clear')).toBeInTheDocument();
  });

  it('features a reading when its row is tapped, and remembers it', () => {
    act(() => useRealtimeStore.setState({ channels: { RPMValue: 3200, coolant: 88.4 } }));
    render(<ZuneDashboard isConnected={true} />);
    fireEvent.click(screen.getByRole('button', { name: /coolant temperature/ }));
    expect(screen.getByLabelText('coolant temperature')).toHaveTextContent('88');
    expect(screen.getByRole('button', { name: 'coolant', pressed: true })).toBeInTheDocument();
    expect(loadFeatured()).toBe('coolant');
  });

  it('lists alerts and shows dashes when offline', () => {
    act(() => useRealtimeStore.setState({ channels: { RPMValue: 7000, coolant: 110 } }));
    const { unmount } = render(<ZuneDashboard isConnected={true} />);
    expect(screen.getByText('over-rev · coolant hot')).toBeInTheDocument();
    unmount();
    render(<ZuneDashboard isConnected={false} />);
    expect(screen.queryByText('7000')).not.toBeInTheDocument();
    expect(screen.getByText('no ecu link')).toBeInTheDocument();
  });
});
