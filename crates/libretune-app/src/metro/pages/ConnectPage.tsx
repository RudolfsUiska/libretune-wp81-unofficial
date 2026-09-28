import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AppBar, ListPicker, PageHeader, ProgressBar, ProgressDots } from '../controls';
import { useMetro } from '../context';
import ConnectionMetrics from '../../components/layout/ConnectionMetrics';
import { Cable, Glyph } from '../icons';

const BAUDS = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600, 1000000, 2000000] as const;

function describePort(p: string): { title: string; sub: string } {
  if (p.startsWith('usb:')) {
    const m = /^usb:(\S+)\s*(.*)$/.exec(p);
    return { title: (m?.[2] || 'usb serial adapter').toLowerCase(), sub: `usb ${m?.[1] ?? ''}` };
  }
  return { title: p.toLowerCase(), sub: 'serial port' };
}

/** Pick a port and baud rate, connect or disconnect, watch the sync. */
export function ConnectPage() {
  const m = useMetro();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await m.refreshPorts();
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => {
    void refresh();
    // Once on arrival; the app bar has a refresh button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The backend can answer with nothing at all before a scan has run.
  const ports = m.ports ?? [];
  const phase = m.connectionPhase;
  const busy = m.connecting || m.syncing || phase === 'auto-connect';
  const headline =
    phase === 'connected' ? 'connected'
    : phase === 'syncing' ? 'reading the tune'
    : busy ? 'connecting'
    : phase === 'signature-mismatch' ? 'wrong definition'
    : phase === 'auto-connect-waiting' ? 'waiting for the ecu'
    : 'disconnected';
  const bauds: number[] = BAUDS.includes(m.baudRate as (typeof BAUDS)[number]) ? [...BAUDS] : [...BAUDS, m.baudRate].sort((a, b) => a - b);

  return (
    <div className="wp-page">
      <PageHeader title="connection" />
      <div className="wp-scroll wp-form">
        <div className={`wp-status-big${m.connected ? ' accent' : ''}`}>{headline}</div>
        <div className="wp-subtle-text">
          {m.connected
            ? `${m.status.signature ?? m.ecuType}`
            : m.currentProject
              ? `project ${m.currentProject.name}`
              : 'no project open: the ecu is detected when you create one'}
        </div>
        {busy && !m.syncProgress && <ProgressDots />}
        {m.syncProgress && <ProgressBar percent={m.syncProgress.percent} />}
        {m.syncWarning && <div className="wp-warning-text">{m.syncWarning}</div>}

        <div className="wp-field-header wp-gap">link</div>
        <div className="wp-link-stats">
          <span>
            packets <b className="packet-mode">{m.connected ? m.packetMode : '—'}</b>
          </span>
          <ConnectionMetrics compact />
        </div>

        <div className="wp-field-header wp-gap">port</div>
        {ports.length === 0 && (
          <p className="wp-empty-text">
            {refreshing ? 'looking for adapters…' : 'No adapter found. Plug the ECU in over USB (an OTG cable on a phone) and refresh.'}
          </p>
        )}
        <div role="radiogroup">
          {ports.map((p) => {
            const d = describePort(p);
            const on = p === m.selectedPort;
            return (
              <button
                key={p}
                role="radio"
                aria-checked={on}
                className={`wp-radio wp-tilt${on ? ' on' : ''}`}
                disabled={m.connected || busy}
                onClick={() => m.setSelectedPort(p)}
              >
                <span className="wp-radio-dot" />
                <span className="wp-radio-text">
                  <span>{d.title}</span>
                  <span className="wp-subtle-text">{d.sub}</span>
                </span>
              </button>
            );
          })}
        </div>

        <ListPicker header="baud rate" value={m.baudRate} options={bauds} onChange={m.onBaudChange} />

        <div className="wp-button-row">
          {m.connected || busy ? (
            <button className="wp-button" onClick={m.disconnect}>disconnect</button>
          ) : (
            <button className="wp-button accent" disabled={!m.selectedPort || !m.currentProject} onClick={m.connect}>
              connect
            </button>
          )}
        </div>
        <button className="wp-link" onClick={m.actions.connectionDialog}>advanced connection settings</button>
      </div>
      <AppBar
        buttons={[
          { id: 'refresh', icon: <RefreshCw size={20} strokeWidth={1.5} />, label: 'refresh', onClick: refresh, disabled: refreshing },
          m.connected || busy
            ? { id: 'disconnect', icon: <Glyph icon={Cable} size={20} />, label: 'disconnect', onClick: m.disconnect, active: true }
            : { id: 'connect', icon: <Glyph icon={Cable} size={20} />, label: 'connect', onClick: m.connect, disabled: !m.selectedPort || !m.currentProject },
        ]}
      />
    </div>
  );
}
