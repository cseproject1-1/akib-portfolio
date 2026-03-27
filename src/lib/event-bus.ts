// Simple pub/sub event bus for inter-app communication

type Handler = (...args: any[]) => void;

class EventBus {
  private handlers: Map<string, Set<Handler>> = new Map();

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, ...args: any[]) {
    this.handlers.get(event)?.forEach(h => h(...args));
  }

  off(event: string, handler: Handler) {
    this.handlers.get(event)?.delete(handler);
  }
}

export const eventBus = new EventBus();

// Event types
export const OS_EVENTS = {
  OPEN_FILE: 'os:open-file',         // payload: { path: string }
  OPEN_APP: 'os:open-app',           // payload: { appId: string, data?: any }
  FILE_CHANGED: 'os:file-changed',   // payload: { path: string }
  VOLUME_CHANGED: 'os:volume-changed', // payload: { volume: number }
} as const;
