const { EventEmitter } = require('events');

class RequestQueue extends EventEmitter {
  constructor(options = {}) {
    super();

    this.maxConcurrent = options.maxConcurrent || process.env.MAX_CONCURRENT_REQUESTS || 10;
    this.timeout = options.timeout || process.env.REQUEST_TIMEOUT || 30000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;

    this.queue = [];
    this.active = 0;
    this.processed = 0;
    this.errors = 0;
  }

  async add(fn, options = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        fn,
        resolve,
        reject,
        attempts: 0,
        priority: options.priority || 0,
        timeout: options.timeout || this.timeout,
        retryAttempts: options.retryAttempts || this.retryAttempts,
        addedAt: Date.now(),
      };

      this.queue.push(request);
      this.queue.sort((a, b) => b.priority - a.priority);

      this.emit('enqueue', {
        queueLength: this.queue.length,
        active: this.active,
      });

      this.process();
    });
  }

  async process() {
    if (this.active >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const request = this.queue.shift();
    this.active++;

    try {
      // Add timeout wrapper
      const result = await this.executeWithTimeout(request);

      this.processed++;
      request.resolve(result);

      this.emit('success', {
        duration: Date.now() - request.addedAt,
        queueLength: this.queue.length,
        active: this.active,
      });

    } catch (error) {
      request.attempts++;

      if (request.attempts < request.retryAttempts) {
        // Retry with exponential backoff
        const delay = this.retryDelay * Math.pow(2, request.attempts - 1);

        this.emit('retry', {
          attempts: request.attempts,
          delay,
          error: error.message,
        });

        setTimeout(() => {
          this.queue.unshift(request);
          this.process();
        }, delay);

      } else {
        // Max retries reached
        this.errors++;
        request.reject(error);

        this.emit('error', {
          attempts: request.attempts,
          error: error.message,
          duration: Date.now() - request.addedAt,
        });
      }
    } finally {
      this.active--;

      // Process next request
      setImmediate(() => this.process());
    }
  }

  async executeWithTimeout(request) {
    return Promise.race([
      request.fn(),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${request.timeout}ms`));
        }, request.timeout);
      }),
    ]);
  }

  async drain() {
    // Wait for all active requests to complete
    return new Promise(resolve => {
      const checkDrain = () => {
        if (this.active === 0 && this.queue.length === 0) {
          resolve();
        } else {
          setTimeout(checkDrain, 100);
        }
      };
      checkDrain();
    });
  }

  clear() {
    // Clear the queue and reject all pending requests
    const cleared = this.queue.length;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      request.reject(new Error('Queue cleared'));
    }

    this.emit('clear', { cleared });
    return cleared;
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      active: this.active,
      processed: this.processed,
      errors: this.errors,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

class PriorityQueue extends RequestQueue {
  constructor(options = {}) {
    super(options);
    this.priorityLevels = {
      HIGH: 10,
      NORMAL: 5,
      LOW: 1,
    };
  }

  async addHigh(fn, options = {}) {
    return this.add(fn, { ...options, priority: this.priorityLevels.HIGH });
  }

  async addNormal(fn, options = {}) {
    return this.add(fn, { ...options, priority: this.priorityLevels.NORMAL });
  }

  async addLow(fn, options = {}) {
    return this.add(fn, { ...options, priority: this.priorityLevels.LOW });
  }
}

module.exports = { RequestQueue, PriorityQueue };
