type Handler<T = unknown> = (payload: T) => void;

export interface EventBus {
  publish<T>(type: string, payload: T): void;
  subscribe<T>(type: string, handler: Handler<T>): void;
}

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, Handler[]>();
  publish<T>(type: string, payload: T): void {
    for (const h of this.handlers.get(type) ?? []) h(payload);
  }
  subscribe<T>(type: string, handler: Handler<T>): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as Handler);
    this.handlers.set(type, list);
  }
}
