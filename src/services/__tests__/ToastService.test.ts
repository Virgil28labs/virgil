/**
 * ToastService Comprehensive Test Suite
 * 
 * Tests the toast notification system used throughout the app for user feedback.
 * Critical for error handling, success messages, and user communication.
 */

import { toastService } from '../ToastService';
import { timeService } from '../TimeService';

// Mock timeService
jest.mock('../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(() => 1234567890),
  },
}));

describe('ToastService', () => {
  let mockListener: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockListener = jest.fn();
    // Clear any existing listeners
    (toastService as any).listeners = [];
  });

  describe('Basic Toast Operations', () => {
    it('creates success toast', () => {
      toastService.subscribe(mockListener);
      
      toastService.success('Operation successful');

      expect(mockListener).toHaveBeenCalledWith({
        type: 'success',
        message: 'Operation successful',
        duration: 4000,
      });
    });

    it('creates error toast', () => {
      toastService.subscribe(mockListener);
      
      toastService.error('Operation failed');

      expect(mockListener).toHaveBeenCalledWith({
        type: 'error',
        message: 'Operation failed',
        duration: 7000,
      });
    });

    it('creates warning toast', () => {
      toastService.subscribe(mockListener);
      
      toastService.warning('Warning message');

      expect(mockListener).toHaveBeenCalledWith({
        type: 'warning',
        message: 'Warning message',
        duration: 5000,
      });
    });

    it('creates info toast', () => {
      toastService.subscribe(mockListener);
      
      toastService.info('Info message');

      expect(mockListener).toHaveBeenCalledWith({
        type: 'info',
        message: 'Info message',
        duration: 4000,
      });
    });
  });

  describe('Toast Options', () => {
    it('creates toast with custom duration', () => {
      toastService.subscribe(mockListener);
      
      toastService.success('Custom duration', { duration: 10000 });

      expect(mockListener).toHaveBeenCalledWith({
        type: 'success',
        message: 'Custom duration',
        duration: 10000,
      });
    });

    it('creates toast with custom options', () => {
      toastService.subscribe(mockListener);
      
      toastService.error('Custom options', { 
        duration: 8000,
        persistent: true,
        title: 'Error Title',
      });

      expect(mockListener).toHaveBeenCalledWith({
        type: 'error',
        message: 'Custom options',
        duration: 8000,
        persistent: true,
        title: 'Error Title',
      });
    });
  });

  describe('Subscription System', () => {
    it('allows subscribing to toast events', () => {
      const unsubscribe = toastService.subscribe(mockListener);
      
      toastService.success('Test message');
      
      expect(mockListener).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('allows unsubscribing from toast events', () => {
      const unsubscribe = toastService.subscribe(mockListener);
      
      unsubscribe();
      
      toastService.success('Should not notify');
      
      expect(mockListener).not.toHaveBeenCalled();
    });

    it('handles multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      toastService.subscribe(listener1);
      toastService.subscribe(listener2);
      
      toastService.error('Multiple listeners');
      
      expect(listener1).toHaveBeenCalledWith({
        type: 'error',
        message: 'Multiple listeners',
        duration: 7000,
      });
      expect(listener2).toHaveBeenCalledWith({
        type: 'error',
        message: 'Multiple listeners',
        duration: 7000,
      });
    });

    it('removes specific listener when unsubscribing', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      toastService.subscribe(listener1);
      const unsubscribe2 = toastService.subscribe(listener2);
      
      unsubscribe2();
      
      toastService.warning('One listener removed');
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('Memory-Specific Messages', () => {
    it('shows memory success messages', () => {
      toastService.subscribe(mockListener);
      
      toastService.memorySuccess('save');
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'success',
        message: '💾 Conversation saved successfully',
        duration: 4000,
      });
    });

    it('shows memory success for different operations', () => {
      toastService.subscribe(mockListener);
      
      const operations = ['save', 'mark', 'forget', 'export', 'clear'];
      const expectedMessages = [
        '💾 Conversation saved successfully',
        '💡 Memory marked as important',
        '🗑️ Memory forgotten',
        '📁 Data exported successfully',
        '🧹 All data cleared',
      ];
      
      operations.forEach((operation, index) => {
        jest.clearAllMocks();
        toastService.memorySuccess(operation);
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'success',
          message: expectedMessages[index],
          duration: 4000,
        });
      });
    });

    it('shows generic success for unknown operations', () => {
      toastService.subscribe(mockListener);
      
      toastService.memorySuccess('unknown');
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'success',
        message: 'unknown completed successfully',
        duration: 4000,
      });
    });

    it('shows memory error messages', () => {
      toastService.subscribe(mockListener);
      
      toastService.memoryError('save');
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to save conversation - Please try again.',
        duration: 7000,
        title: 'Memory System Error',
        action: undefined,
      });
    });

    it('shows memory error with retry action', () => {
      toastService.subscribe(mockListener);
      const retryAction = jest.fn();
      
      toastService.memoryError('load', undefined, retryAction);
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to load memories - Please try again.',
        duration: 7000,
        title: 'Memory System Error',
        action: {
          label: 'Retry',
          onClick: retryAction,
        },
      });
    });

    it('provides specific error context for quota errors', () => {
      toastService.subscribe(mockListener);
      const quotaError = new Error('quota exceeded');
      
      toastService.memoryError('save', quotaError);
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to save conversation - Storage quota exceeded. Try clearing old data.',
        duration: 7000,
        title: 'Memory System Error',
        action: undefined,
      });
    });

    it('provides specific error context for network errors', () => {
      toastService.subscribe(mockListener);
      const networkError = new Error('network failed');
      
      toastService.memoryError('export', networkError);
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to export data - Check your internet connection.',
        duration: 7000,
        title: 'Memory System Error',
        action: undefined,
      });
    });

    it('provides specific error context for transaction errors', () => {
      toastService.subscribe(mockListener);
      const transactionError = new Error('transaction failed');
      
      toastService.memoryError('mark', transactionError);
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to mark memory as important - Please try again in a moment.',
        duration: 7000,
        title: 'Memory System Error',
        action: undefined,
      });
    });
  });

  describe('Loading Messages', () => {
    it('creates loading toast', () => {
      toastService.subscribe(mockListener);
      
      const loadingId = toastService.loading('Processing request');
      
      expect(loadingId).toBe('loading-1234567890');
      expect(mockListener).toHaveBeenCalledWith({
        type: 'info',
        message: '⏳ Processing request',
        persistent: true,
      });
      expect(timeService.getTimestamp).toHaveBeenCalled();
    });

    it('creates loading toast with custom options', () => {
      toastService.subscribe(mockListener);
      
      toastService.loading('Saving data', { title: 'Please Wait' });
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'info',
        message: '⏳ Saving data',
        persistent: true,
        title: 'Please Wait',
      });
    });
  });

  describe('Error Handling', () => {
    it('handles listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();
      
      toastService.subscribe(errorListener);
      toastService.subscribe(goodListener);
      
      expect(() => toastService.success('Test')).not.toThrow();
      expect(goodListener).toHaveBeenCalled();
    });

    it('handles empty message strings', () => {
      toastService.subscribe(mockListener);
      
      expect(() => toastService.success('')).not.toThrow();
      expect(mockListener).toHaveBeenCalledWith({
        type: 'success',
        message: '',
        duration: 4000,
      });
    });

    it('handles null/undefined options', () => {
      toastService.subscribe(mockListener);
      
      expect(() => toastService.error('Test', null as any)).not.toThrow();
      expect(() => toastService.warning('Test', undefined)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long messages', () => {
      toastService.subscribe(mockListener);
      const longMessage = 'A'.repeat(1000);
      
      toastService.info(longMessage);
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'info',
        message: longMessage,
        duration: 4000,
      });
    });

    it('handles special characters in messages', () => {
      toastService.subscribe(mockListener);
      const specialMessage = '特殊字符 🚀 <script>alert("xss")</script>';
      
      toastService.success(specialMessage);
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'success',
        message: specialMessage,
        duration: 4000,
      });
    });

    it('handles rapid toast creation', () => {
      toastService.subscribe(mockListener);
      
      // Create many toasts rapidly
      for (let i = 0; i < 10; i++) {
        toastService.info(`Rapid toast ${i}`);
      }
      
      expect(mockListener).toHaveBeenCalledTimes(10);
    });
  });

  describe('Integration with TimeService', () => {
    it('uses timeService for loading toast IDs', () => {
      toastService.loading('Test loading');
      
      expect(timeService.getTimestamp).toHaveBeenCalled();
    });
  });
});