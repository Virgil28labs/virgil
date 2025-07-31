/**
 * EventEmitter Test Suite
 * 
 * Tests event subscription, emission, unsubscription, and error handling.
 * Critical for LLM service communication and state synchronization.
 */

import { EventEmitter } from '../eventEmitter';
import { logger } from '../../../../lib/logger';

// Mock the logger
jest.mock('../../../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('EventEmitter', () => {
  let emitter: EventEmitter;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    emitter = new EventEmitter();
  });

  describe('Constructor', () => {
    it('creates empty event store', () => {
      expect(emitter.eventNames()).toEqual([]);
      expect(emitter.listenerCount('any-event')).toBe(0);
    });
  });

  describe('Event Subscription (on)', () => {
    it('subscribes to events and returns unsubscribe function', () => {
      const listener = jest.fn();
      
      const unsubscribe = emitter.on('test-event', listener);
      
      expect(typeof unsubscribe).toBe('function');
      expect(emitter.listenerCount('test-event')).toBe(1);
      expect(emitter.eventNames()).toContain('test-event');
    });

    it('supports multiple listeners for same event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();
      
      emitter.on('multi-event', listener1);
      emitter.on('multi-event', listener2);
      emitter.on('multi-event', listener3);
      
      expect(emitter.listenerCount('multi-event')).toBe(3);
    });

    it('supports different event types', () => {
      const stringListener = jest.fn();
      const numberListener = jest.fn();
      const objectListener = jest.fn();
      
      emitter.on<string>('string-event', stringListener);
      emitter.on<number>('number-event', numberListener);
      emitter.on<{ id: string }>('object-event', objectListener);
      
      expect(emitter.listenerCount('string-event')).toBe(1);
      expect(emitter.listenerCount('number-event')).toBe(1);
      expect(emitter.listenerCount('object-event')).toBe(1);
    });

    it('handles special characters in event names', () => {
      const listener = jest.fn();
      const specialEvents = [
        'event-with-dashes',
        'event_with_underscores',
        'event.with.dots',
        'event:with:colons',
        'event with spaces',
      ];
      
      specialEvents.forEach(event => {
        emitter.on(event, listener);
        expect(emitter.listenerCount(event)).toBe(1);
      });
    });
  });

  describe('Event Emission (emit)', () => {
    it('emits events to registered listeners', () => {
      const listener = jest.fn();
      const testData = { message: 'Hello World' };
      
      emitter.on('test-event', listener);
      emitter.emit('test-event', testData);
      
      expect(listener).toHaveBeenCalledWith(testData);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('emits to multiple listeners in registration order', () => {
      const results: number[] = [];
      const listener1 = jest.fn(() => results.push(1));
      const listener2 = jest.fn(() => results.push(2));
      const listener3 = jest.fn(() => results.push(3));
      
      emitter.on('order-test', listener1);
      emitter.on('order-test', listener2);
      emitter.on('order-test', listener3);
      
      emitter.emit('order-test', 'data');
      
      expect(results).toEqual([1, 2, 3]);
      expect(listener1).toHaveBeenCalledWith('data');
      expect(listener2).toHaveBeenCalledWith('data');
      expect(listener3).toHaveBeenCalledWith('data');
    });

    it('handles different data types', () => {
      const stringListener = jest.fn();
      const numberListener = jest.fn();
      const objectListener = jest.fn();
      const booleanListener = jest.fn();
      const nullListener = jest.fn();
      
      emitter.on('string', stringListener);
      emitter.on('number', numberListener);
      emitter.on('object', objectListener);
      emitter.on('boolean', booleanListener);
      emitter.on('null', nullListener);
      
      emitter.emit('string', 'hello');
      emitter.emit('number', 42);
      emitter.emit('object', { key: 'value' });
      emitter.emit('boolean', true);
      emitter.emit('null', null);
      
      expect(stringListener).toHaveBeenCalledWith('hello');
      expect(numberListener).toHaveBeenCalledWith(42);
      expect(objectListener).toHaveBeenCalledWith({ key: 'value' });
      expect(booleanListener).toHaveBeenCalledWith(true);
      expect(nullListener).toHaveBeenCalledWith(null);
    });

    it('does nothing for non-existent events', () => {
      // Should not throw error
      expect(() => emitter.emit('non-existent', 'data')).not.toThrow();
    });

    it('handles listener errors gracefully', () => {
      const goodListener = jest.fn();
      const badListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const anotherGoodListener = jest.fn();
      
      emitter.on('error-test', goodListener);
      emitter.on('error-test', badListener);
      emitter.on('error-test', anotherGoodListener);
      
      emitter.emit('error-test', 'test-data');
      
      // Good listeners should still be called
      expect(goodListener).toHaveBeenCalledWith('test-data');
      expect(anotherGoodListener).toHaveBeenCalledWith('test-data');
      
      // Error should be logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in event listener for error-test',
        expect.any(Error),
        {
          component: 'EventEmitter',
          action: 'emit',
          metadata: { event: 'error-test' },
        },
      );
    });
  });

  describe('Event Unsubscription (off)', () => {
    it('removes specific listener', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      emitter.on('test-event', listener1);
      emitter.on('test-event', listener2);
      
      expect(emitter.listenerCount('test-event')).toBe(2);
      
      emitter.off('test-event', listener1);
      
      expect(emitter.listenerCount('test-event')).toBe(1);
      
      emitter.emit('test-event', 'data');
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith('data');
    });

    it('handles removing non-existent listener', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      emitter.on('test-event', listener1);
      
      // Try to remove listener that was never added
      expect(() => emitter.off('test-event', listener2)).not.toThrow();
      expect(emitter.listenerCount('test-event')).toBe(1);
    });

    it('handles removing from non-existent event', () => {
      const listener = jest.fn();
      
      expect(() => emitter.off('non-existent', listener)).not.toThrow();
    });

    it('works with unsubscribe function returned by on()', () => {
      const listener = jest.fn();
      
      const unsubscribe = emitter.on('test-event', listener);
      expect(emitter.listenerCount('test-event')).toBe(1);
      
      unsubscribe();
      expect(emitter.listenerCount('test-event')).toBe(0);
      
      emitter.emit('test-event', 'data');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Once Listeners (once)', () => {
    it('executes listener only once', () => {
      const listener = jest.fn();
      
      emitter.once('once-event', listener);
      
      expect(emitter.listenerCount('once-event')).toBe(1);
      
      emitter.emit('once-event', 'first');
      expect(listener).toHaveBeenCalledWith('first');
      expect(listener).toHaveBeenCalledTimes(1);
      
      // After first emission, listener should be automatically removed
      expect(emitter.listenerCount('once-event')).toBe(0);
      
      emitter.emit('once-event', 'second');
      expect(listener).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('works with multiple once listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      emitter.once('multi-once', listener1);
      emitter.once('multi-once', listener2);
      
      expect(emitter.listenerCount('multi-once')).toBe(2);
      
      emitter.emit('multi-once', 'data');
      
      expect(listener1).toHaveBeenCalledWith('data');
      expect(listener2).toHaveBeenCalledWith('data');
      expect(emitter.listenerCount('multi-once')).toBe(0);
    });

    it('can be mixed with regular listeners', () => {
      const regularListener = jest.fn();
      const onceListener = jest.fn();
      
      emitter.on('mixed-event', regularListener);
      emitter.once('mixed-event', onceListener);
      
      expect(emitter.listenerCount('mixed-event')).toBe(2);
      
      emitter.emit('mixed-event', 'first');
      
      expect(regularListener).toHaveBeenCalledWith('first');
      expect(onceListener).toHaveBeenCalledWith('first');
      expect(emitter.listenerCount('mixed-event')).toBe(1);
      
      emitter.emit('mixed-event', 'second');
      
      expect(regularListener).toHaveBeenCalledWith('second');
      expect(regularListener).toHaveBeenCalledTimes(2);
      expect(onceListener).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('Remove All Listeners', () => {
    it('removes all listeners for specific event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const otherListener = jest.fn();
      
      emitter.on('target-event', listener1);
      emitter.on('target-event', listener2);
      emitter.on('other-event', otherListener);
      
      expect(emitter.listenerCount('target-event')).toBe(2);
      expect(emitter.listenerCount('other-event')).toBe(1);
      
      emitter.removeAllListeners('target-event');
      
      expect(emitter.listenerCount('target-event')).toBe(0);
      expect(emitter.listenerCount('other-event')).toBe(1); // Unchanged
      expect(emitter.eventNames()).toEqual(['other-event']);
    });

    it('removes all listeners for all events when no event specified', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();
      
      emitter.on('event1', listener1);
      emitter.on('event2', listener2);
      emitter.on('event3', listener3);
      
      expect(emitter.eventNames()).toHaveLength(3);
      
      emitter.removeAllListeners();
      
      expect(emitter.eventNames()).toHaveLength(0);
      expect(emitter.listenerCount('event1')).toBe(0);
      expect(emitter.listenerCount('event2')).toBe(0);
      expect(emitter.listenerCount('event3')).toBe(0);
    });

    it('handles removing from non-existent event', () => {
      expect(() => emitter.removeAllListeners('non-existent')).not.toThrow();
    });
  });

  describe('Listener Count', () => {
    it('returns correct count for events with listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      expect(emitter.listenerCount('test-event')).toBe(0);
      
      emitter.on('test-event', listener1);
      expect(emitter.listenerCount('test-event')).toBe(1);
      
      emitter.on('test-event', listener2);
      expect(emitter.listenerCount('test-event')).toBe(2);
    });

    it('returns 0 for non-existent events', () => {
      expect(emitter.listenerCount('non-existent')).toBe(0);
    });

    it('updates correctly after removing listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      emitter.on('test-event', listener1);
      emitter.on('test-event', listener2);
      expect(emitter.listenerCount('test-event')).toBe(2);
      
      emitter.off('test-event', listener1);
      expect(emitter.listenerCount('test-event')).toBe(1);
      
      emitter.removeAllListeners('test-event');
      expect(emitter.listenerCount('test-event')).toBe(0);
    });
  });

  describe('Event Names', () => {
    it('returns array of current event names', () => {
      expect(emitter.eventNames()).toEqual([]);
      
      emitter.on('event1', jest.fn());
      emitter.on('event2', jest.fn());
      emitter.on('event3', jest.fn());
      
      const eventNames = emitter.eventNames();
      expect(eventNames).toHaveLength(3);
      expect(eventNames).toContain('event1');
      expect(eventNames).toContain('event2');
      expect(eventNames).toContain('event3');
    });

    it('updates after removing events', () => {
      emitter.on('event1', jest.fn());
      emitter.on('event2', jest.fn());
      
      expect(emitter.eventNames()).toHaveLength(2);
      
      emitter.removeAllListeners('event1');
      expect(emitter.eventNames()).toEqual(['event2']);
      
      emitter.removeAllListeners();
      expect(emitter.eventNames()).toEqual([]);
    });
  });

  describe('Edge Cases and Memory Management', () => {
    it('handles rapid subscription and unsubscription', () => {
      const listener = jest.fn();
      
      // Rapid subscribe/unsubscribe cycles
      for (let i = 0; i < 100; i++) {
        const unsubscribe = emitter.on('rapid-test', listener);
        expect(emitter.listenerCount('rapid-test')).toBe(1);
        unsubscribe();
        expect(emitter.listenerCount('rapid-test')).toBe(0);
      }
    });

    it('handles large numbers of listeners', () => {
      const listeners = [];
      const eventName = 'stress-test';
      
      // Add 1000 listeners
      for (let i = 0; i < 1000; i++) {
        const listener = jest.fn();
        listeners.push(listener);
        emitter.on(eventName, listener);
      }
      
      expect(emitter.listenerCount(eventName)).toBe(1000);
      
      emitter.emit(eventName, 'test-data');
      
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledWith('test-data');
      });
    });

    it('handles listeners that modify the emitter', () => {
      const selfModifyingListener = jest.fn(() => {
        // Listener adds another listener
        emitter.on('modified-event', jest.fn());
      });
      
      emitter.on('modified-event', selfModifyingListener);
      
      expect(emitter.listenerCount('modified-event')).toBe(1);
      
      emitter.emit('modified-event', 'data');
      
      expect(selfModifyingListener).toHaveBeenCalled();
      expect(emitter.listenerCount('modified-event')).toBe(2);
    });

    it('handles complex object data without side effects', () => {
      const listener = jest.fn();
      const complexData = {
        nested: {
          array: [1, 2, 3],
          object: { a: 'b' },
        },
        function: () => 'test',
        date: new Date(),
      };
      
      emitter.on('complex-event', listener);
      emitter.emit('complex-event', complexData);
      
      expect(listener).toHaveBeenCalledWith(complexData);
      expect(listener.mock.calls[0][0]).toBe(complexData); // Same reference
    });
  });
});