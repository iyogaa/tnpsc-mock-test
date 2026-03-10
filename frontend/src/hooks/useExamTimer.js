import { useState, useEffect, useRef, useCallback } from 'react';
import { examApi } from '../utils/api';

export function useExamTimer(initialSeconds, sessionId, onExpire) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  const syncRef = useRef(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const tick = useCallback(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        clearInterval(intervalRef.current);
        setRunning(false);
        onExpireRef.current?.();
        return 0;
      }
      return prev - 1;
    });
  }, []);

  const start = useCallback(() => {
    setRunning(true);
    intervalRef.current = setInterval(tick, 1000);
    // Sync to server every 30s
    syncRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (sessionId && t > 0) examApi.syncTime(sessionId, t).catch(() => {});
        return t;
      });
    }, 30000);
  }, [tick, sessionId]);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    clearInterval(syncRef.current);
    setRunning(false);
  }, []);

  useEffect(() => () => { clearInterval(intervalRef.current); clearInterval(syncRef.current); }, []);

  const hours = Math.floor(timeLeft / 3600);
  const mins = Math.floor((timeLeft % 3600) / 60);
  const secs = timeLeft % 60;
  const pad = n => String(n).padStart(2, '0');
  const formatted = hours > 0 ? `${pad(hours)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  const pct = initialSeconds > 0 ? (timeLeft / initialSeconds) * 100 : 0;
  const isWarning = timeLeft > 0 && timeLeft <= 600;  // 10 min
  const isCritical = timeLeft > 0 && timeLeft <= 120; // 2 min

  return { timeLeft, formatted, pct, isWarning, isCritical, running, start, stop };
}
