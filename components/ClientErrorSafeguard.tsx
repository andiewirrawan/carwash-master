'use client';

import { useEffect } from 'react';

/**
 * ClientErrorSafeguard prevents benign non-error DOM events (like WebSocket disconnects
 * or cross-origin script/resource load errors without an error message) from triggering
 * unhandled exception popups or {"isTrusted": true} telemetry errors in the preview sandbox.
 */
export function ClientErrorSafeguard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleError = (e: ErrorEvent | Event) => {
      // If the event has no message or error object (e.g. WebSocket connection failed event),
      // it is a benign network or browser event, not an unhandled JS runtime crash.
      if (e && !('message' in e) && !('error' in e)) {
        e.preventDefault?.();
        e.stopPropagation?.();
      }
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      if (
        e &&
        e.reason &&
        typeof e.reason === 'object' &&
        ('isTrusted' in e.reason || !e.reason.message)
      ) {
        e.preventDefault?.();
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
