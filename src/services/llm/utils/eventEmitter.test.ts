import { EventEmitter } from './eventEmitter'

describe('EventEmitter', () => {
  let emitter: EventEmitter

  beforeEach(() => {
    emitter = new EventEmitter()
  })

  describe('on', () => {
    it('should add event listener', () => {
      const listener = jest.fn()
      emitter.on('test', listener)
      
      expect(emitter.listenerCount('test')).toBe(1)
    })

    it('should add multiple listeners for same event', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      
      emitter.on('test', listener1)
      emitter.on('test', listener2)
      
      expect(emitter.listenerCount('test')).toBe(2)
    })

    it('should add listeners for different events', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      
      emitter.on('event1', listener1)
      emitter.on('event2', listener2)
      
      expect(emitter.listenerCount('event1')).toBe(1)
      expect(emitter.listenerCount('event2')).toBe(1)
    })

    it('should return unsubscribe function', () => {
      const listener = jest.fn()
      const unsubscribe = emitter.on('test', listener)
      
      expect(typeof unsubscribe).toBe('function')
      
      unsubscribe()
      expect(emitter.listenerCount('test')).toBe(0)
    })

    it('should handle typed events', () => {
      interface TestData {
        message: string
        count: number
      }
      
      const listener = jest.fn<void, [TestData]>()
      emitter.on<TestData>('typed', listener)
      
      emitter.emit<TestData>('typed', { message: 'test', count: 1 })
      
      expect(listener).toHaveBeenCalledWith({ message: 'test', count: 1 })
    })
  })

  describe('off', () => {
    it('should remove specific listener', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      
      emitter.on('test', listener1)
      emitter.on('test', listener2)
      
      emitter.off('test', listener1)
      
      expect(emitter.listenerCount('test')).toBe(1)
      
      emitter.emit('test', 'data')
      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalledWith('data')
    })

    it('should handle removing non-existent listener', () => {
      const listener = jest.fn()
      
      // Should not throw
      emitter.off('test', listener)
      expect(emitter.listenerCount('test')).toBe(0)
    })

    it('should handle removing from non-existent event', () => {
      const listener = jest.fn()
      emitter.on('test', listener)
      
      // Should not throw
      emitter.off('nonexistent', listener)
      expect(emitter.listenerCount('test')).toBe(1)
    })
  })

  describe('emit', () => {
    it('should call all listeners with data', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      
      emitter.on('test', listener1)
      emitter.on('test', listener2)
      
      emitter.emit('test', 'testData')
      
      expect(listener1).toHaveBeenCalledWith('testData')
      expect(listener2).toHaveBeenCalledWith('testData')
    })

    it('should handle emitting to non-existent event', () => {
      // Should not throw
      emitter.emit('nonexistent', 'data')
    })

    it('should catch and log listener errors', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error')
      })
      const goodListener = jest.fn()
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      emitter.on('test', errorListener)
      emitter.on('test', goodListener)
      
      emitter.emit('test', 'data')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in event listener for test:',
        expect.any(Error)
      )
      expect(goodListener).toHaveBeenCalledWith('data')
      
      consoleSpy.mockRestore()
    })

    it('should emit different types of data', () => {
      const listener = jest.fn()
      emitter.on('test', listener)
      
      // String
      emitter.emit('test', 'string')
      expect(listener).toHaveBeenCalledWith('string')
      
      // Number
      emitter.emit('test', 123)
      expect(listener).toHaveBeenCalledWith(123)
      
      // Object
      const obj = { a: 1, b: 2 }
      emitter.emit('test', obj)
      expect(listener).toHaveBeenCalledWith(obj)
      
      // Array
      const arr = [1, 2, 3]
      emitter.emit('test', arr)
      expect(listener).toHaveBeenCalledWith(arr)
      
      // Null
      emitter.emit('test', null)
      expect(listener).toHaveBeenCalledWith(null)
      
      // Undefined
      emitter.emit('test', undefined)
      expect(listener).toHaveBeenCalledWith(undefined)
    })
  })

  describe('once', () => {
    it('should call listener only once', () => {
      const listener = jest.fn()
      
      emitter.once('test', listener)
      
      emitter.emit('test', 'first')
      emitter.emit('test', 'second')
      emitter.emit('test', 'third')
      
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith('first')
    })

    it('should remove listener after first call', () => {
      const listener = jest.fn()
      
      emitter.once('test', listener)
      expect(emitter.listenerCount('test')).toBe(1)
      
      emitter.emit('test', 'data')
      expect(emitter.listenerCount('test')).toBe(0)
    })

    it('should work with multiple once listeners', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      
      emitter.once('test', listener1)
      emitter.once('test', listener2)
      
      emitter.emit('test', 'data')
      
      expect(listener1).toHaveBeenCalledWith('data')
      expect(listener2).toHaveBeenCalledWith('data')
      expect(emitter.listenerCount('test')).toBe(0)
    })

    it('should work alongside regular listeners', () => {
      const onceListener = jest.fn()
      const regularListener = jest.fn()
      
      emitter.once('test', onceListener)
      emitter.on('test', regularListener)
      
      emitter.emit('test', 'first')
      emitter.emit('test', 'second')
      
      expect(onceListener).toHaveBeenCalledTimes(1)
      expect(regularListener).toHaveBeenCalledTimes(2)
    })
  })

  describe('removeAllListeners', () => {
    it('should remove all listeners for specific event', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      const listener3 = jest.fn()
      
      emitter.on('event1', listener1)
      emitter.on('event1', listener2)
      emitter.on('event2', listener3)
      
      emitter.removeAllListeners('event1')
      
      expect(emitter.listenerCount('event1')).toBe(0)
      expect(emitter.listenerCount('event2')).toBe(1)
    })

    it('should remove all listeners for all events', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      const listener3 = jest.fn()
      
      emitter.on('event1', listener1)
      emitter.on('event2', listener2)
      emitter.on('event3', listener3)
      
      emitter.removeAllListeners()
      
      expect(emitter.listenerCount('event1')).toBe(0)
      expect(emitter.listenerCount('event2')).toBe(0)
      expect(emitter.listenerCount('event3')).toBe(0)
      expect(emitter.eventNames()).toHaveLength(0)
    })

    it('should handle removing from non-existent event', () => {
      // Should not throw
      emitter.removeAllListeners('nonexistent')
    })
  })

  describe('listenerCount', () => {
    it('should return correct count', () => {
      expect(emitter.listenerCount('test')).toBe(0)
      
      emitter.on('test', jest.fn())
      expect(emitter.listenerCount('test')).toBe(1)
      
      emitter.on('test', jest.fn())
      expect(emitter.listenerCount('test')).toBe(2)
    })

    it('should return 0 for non-existent event', () => {
      expect(emitter.listenerCount('nonexistent')).toBe(0)
    })
  })

  describe('eventNames', () => {
    it('should return empty array when no events', () => {
      expect(emitter.eventNames()).toEqual([])
    })

    it('should return all event names', () => {
      emitter.on('event1', jest.fn())
      emitter.on('event2', jest.fn())
      emitter.on('event3', jest.fn())
      
      const names = emitter.eventNames()
      expect(names).toHaveLength(3)
      expect(names).toContain('event1')
      expect(names).toContain('event2')
      expect(names).toContain('event3')
    })

    it('should not include removed events', () => {
      emitter.on('event1', jest.fn())
      emitter.on('event2', jest.fn())
      
      emitter.removeAllListeners('event1')
      
      const names = emitter.eventNames()
      expect(names).toHaveLength(1)
      expect(names).toContain('event2')
    })
  })

  describe('edge cases', () => {
    it('should handle same listener added multiple times', () => {
      const listener = jest.fn()
      
      emitter.on('test', listener)
      emitter.on('test', listener)
      
      expect(emitter.listenerCount('test')).toBe(2)
      
      emitter.emit('test', 'data')
      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('should handle removing same listener multiple times', () => {
      const listener = jest.fn()
      
      emitter.on('test', listener)
      emitter.on('test', listener)
      
      // off() removes ALL instances of the listener
      emitter.off('test', listener)
      expect(emitter.listenerCount('test')).toBe(0)
      
      // Removing again should have no effect
      emitter.off('test', listener)
      expect(emitter.listenerCount('test')).toBe(0)
    })

    it('should handle circular references in emitted data', () => {
      const listener = jest.fn()
      emitter.on('test', listener)
      
      const circular: any = { a: 1 }
      circular.self = circular
      
      // Should not throw
      emitter.emit('test', circular)
      expect(listener).toHaveBeenCalledWith(circular)
    })

    it('should maintain order of listeners', () => {
      const calls: number[] = []
      
      emitter.on('test', () => calls.push(1))
      emitter.on('test', () => calls.push(2))
      emitter.on('test', () => calls.push(3))
      
      emitter.emit('test', null)
      
      expect(calls).toEqual([1, 2, 3])
    })

    it('should handle unsubscribe during emit', () => {
      const listener1 = jest.fn()
      const listener3 = jest.fn()
      
      let unsubscribe2: any
      const listener2 = jest.fn(() => {
        unsubscribe2()
      })
      
      emitter.on('test', listener1)
      unsubscribe2 = emitter.on('test', listener2)
      emitter.on('test', listener3)
      
      emitter.emit('test', 'data')
      
      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
      expect(listener3).toHaveBeenCalled()
      
      // Second emit should not call listener2
      emitter.emit('test', 'data2')
      expect(listener2).toHaveBeenCalledTimes(1)
    })
  })
})