import { useCallback, useContext, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { MetroContext } from '../../../metro/context';

/**
 * The cluster's top-bar switches: data logging and AutoTune.
 *
 * Logging goes through the shell's own toggle (the same one the Start tile
 * and toolbar use), so the switch and App's 1 s logging-status poll can never
 * disagree.
 *
 * AutoTune is asymmetric on purpose. Switching it OFF stops the session at
 * once. Switching it ON opens the AutoTune page instead of starting a session
 * from here: starting needs the table choice and runs a preflight safety check
 * there, and a dash button must not skip that.
 */
export function useDashSwitches(isConnected: boolean) {
  const metro = useContext(MetroContext);
  const [autotune, setAutotune] = useState(false);

  // AutoTune can be started or stopped on its own page: follow the backend.
  useEffect(() => {
    if (!isConnected) {
      setAutotune(false);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const st = await invoke<{ running: boolean } | null>('get_autotune_status');
        if (!cancelled) setAutotune(!!st?.running);
      } catch {
        // No session or no backend: show it off.
        if (!cancelled) setAutotune(false);
      }
    };
    void poll();
    const t = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [isConnected]);

  const toggleAutotune = useCallback(async () => {
    if (autotune) {
      try {
        await invoke('stop_autotune');
        setAutotune(false);
      } catch (e) {
        console.error('Stopping AutoTune failed:', e);
      }
    } else {
      metro?.open('autotune', 'AutoTune');
    }
  }, [autotune, metro]);

  return {
    logging: !!metro?.isLogging,
    canLog: isConnected && !!metro?.canLog,
    toggleLogging: () => metro?.toggleLogging(),
    autotune,
    canAutotune: isConnected && !!metro,
    toggleAutotune,
  };
}
