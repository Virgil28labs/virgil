import { logger } from '../../../lib/logger';

type EventListener<T = unknown> = (data: T) => void;
type UnsubscribeFunction = () => void;

export class EventEmitter {
  private events: Record<string, EventListener[]>;

  constructor() {
    this.events = {};
  }

  on<T = unknown>(event: string, listener: EventListener<T>): UnsubscribeFunction {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener as EventListener);

    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  off<T = unknown>(event: string, listenerToRemove: EventListener<T>): void {
    if (!this.events[event]) return;

    this.events[event] = this.events[event].filter(
      listener => listener !== listenerToRemove,
    );
  }

  emit<T = unknown>(event: string, data: T): void {
    if (!this.events[event]) return;

    this.events[event].forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        logger.error(`Error in event listener for ${event}`, error as Error, {
          component: 'EventEmitter',
          action: 'emit',
          metadata: { event },
        });
      }
    });
  }

  once<T = unknown>(event: string, listener: EventListener<T>): void {
    const onceWrapper = (data: T) => {
      listener(data);
      this.off(event, onceWrapper);
    };

    this.on(event, onceWrapper);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }

  listenerCount(event: string): number {
    return this.events[event] ? this.events[event].length : 0;
  }

  eventNames(): string[] {
    return Object.keys(this.events);
  }
}
