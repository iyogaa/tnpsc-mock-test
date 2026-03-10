import { useEffect, useRef } from 'react';
import { examApi } from '../utils/api';

export function useTabSwitch(sessionId, enabled, onViolation) {
  const countRef = useRef(0);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    const handle = () => {
      if (document.hidden) {
        examApi.tabSwitch(sessionId)
          .then(r => {
            countRef.current = r.data.tab_switch_count;
            onViolation?.(r.data.tab_switch_count, r.data.auto_submit);
          })
          .catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [sessionId, enabled, onViolation]);

  return countRef;
}
