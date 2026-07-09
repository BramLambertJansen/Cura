interface LocalNotificationOptions {
  body?: string;
  /** Coalesces with a same-key notification (e.g. an incoming push) into one. */
  tag?: string;
  icon?: string;
  /** Deep-link target: opens the task on click, via the SW notificationclick handler
   *  (SW path) or the fallback onclick below (plain-constructor path). */
  taskId?: string;
  /** Fallback click handler used only on the plain `new Notification()` path
   *  (no service worker). The SW path routes clicks through sw.ts instead. */
  onClick?: () => void;
}

/**
 * Show an OS notification while the app is running, without ever throwing.
 *
 * The bare `new Notification()` constructor is an *illegal constructor* on
 * Android Chrome (and any browser that requires an active service worker),
 * throwing "Illegal constructor. Use ServiceWorkerRegistration.showNotification()
 * instead." — which, when thrown uncaught out of the reminder dispatch, tripped
 * the app's ErrorBoundary (#notification-constructor-error).
 *
 * So we prefer `ServiceWorkerRegistration.showNotification()` — exactly what the
 * browser asks for, and it lets sw.ts's `notificationclick` handler own the tap
 * (focus tab + open the task). Only when there is no registration do we fall back
 * to the constructor, guarded so a throw can never bubble into React.
 *
 * Fire-and-forget: callers never await, and every path swallows its own errors.
 */
export function showLocalNotification(title: string, options: LocalNotificationOptions = {}): void {
  const { body, tag, icon, taskId, onClick } = options;
  void (async () => {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          body,
          tag,
          icon,
          // Mirrors the push path in sw.ts so notificationclick can deep-link the task.
          data: taskId ? { url: `/vandaag?taak=${taskId}`, taskId } : undefined,
        });
        return;
      }
    } catch {
      // No usable registration (or showNotification rejected) — fall through.
    }
    try {
      const n = new Notification(title, { body, tag, icon });
      if (onClick) {
        n.onclick = () => {
          window.focus();
          onClick();
          n.close();
        };
      }
    } catch {
      // Some browsers forbid the constructor entirely (the case above) and have
      // no registration to use — nothing more we can do, so stay silent.
    }
  })();
}
