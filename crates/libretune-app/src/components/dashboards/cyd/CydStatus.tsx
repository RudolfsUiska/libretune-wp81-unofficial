import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useShallow } from 'zustand/react/shallow';
import { useRealtimeStore } from '../../../stores/realtimeStore';
import {
  evaluateIndicatorExpression,
  extractExpressionVariables,
} from '../../../utils/evaluateIndicatorExpression';
import { lampColor, lampIsAlarm, type StatusLamp } from './cydLogic';

/**
 * The cluster's status page: every lamp the ECU definition lists in its
 * [FrontPage] (sync, fan, launch, check engine, ...), the same set an INI
 * shows under the gauges in a desktop tuner. Lit lamps glow in their INI
 * colour; alarms sort first while they are on.
 */
export function CydStatus({ isConnected }: { isConnected: boolean }) {
  const [lamps, setLamps] = useState<StatusLamp[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    invoke<{ indicators?: StatusLamp[] } | null>('get_frontpage')
      .then((fp) => {
        if (!cancelled) setLamps(fp?.indicators ?? []);
      })
      .catch(() => {
        if (!cancelled) setLamps([]);
      });
    return () => {
      cancelled = true;
    };
    // Labels can depend on settings read at connect, so reload then.
  }, [isConnected]);

  const vars = useMemo(
    () => extractExpressionVariables((lamps ?? []).map((l) => l.expression)),
    [lamps],
  );
  const values = useRealtimeStore(
    useShallow((s) => {
      const out: Record<string, number> = {};
      for (const v of vars) {
        const x = s.channels[v];
        if (x !== undefined) out[v] = x;
      }
      return out;
    }),
  );

  if (lamps === null) return <div className="cyd-status" />;
  if (lamps.length === 0) {
    return (
      <div className="cyd-status">
        <p className="cyd-status-empty">This ECU definition lists no status lamps.</p>
      </div>
    );
  }

  const shown = lamps.map((l, i) => {
    const on = isConnected && evaluateIndicatorExpression(l.expression, values);
    return { l, i, on, alarm: on && lampIsAlarm(l.bg_on) };
  });
  // Alarms that are on come first; the rest keep the INI's order.
  shown.sort((a, b) => Number(b.alarm) - Number(a.alarm) || a.i - b.i);

  return (
    <div className="cyd-status">
      <ul className="cyd-lamps">
        {shown.map(({ l, i, on, alarm }) => {
          const label = (on ? l.label_on : l.label_off) || l.expression;
          return (
            <li
              key={i}
              className={`cyd-lamp-tile${on ? ' on' : ''}${alarm ? ' alarm' : ''}`}
              style={on ? ({ '--lamp': lampColor(l.bg_on) } as React.CSSProperties) : undefined}
              aria-label={`${label}${on ? ', on' : ''}`}
            >
              <span className="cyd-lamp-dot" aria-hidden="true" />
              <span className="cyd-lamp-label">{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
