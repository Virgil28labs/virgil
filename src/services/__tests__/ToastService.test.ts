import { toastService } from '../ToastService';
import type { Toast } from '../../components/ToastNotification';

describe('ToastService', () => {
  let mockListener: jest.Mock;
  let unsubscribe: () => void;

  beforeEach(() => {
    mockListener = jest.fn();
    unsubscribe = toastService.subscribe(mockListener);
  });

  afterEach(() => {
    unsubscribe();
    jest.clearAllMocks();
  });

  describe('subscribe/unsubscribe', () => {
    it('subscribes listeners to toast events', () => {
      toastService.success('Test message');
      
      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledWith({
        type: 'success',
        message: 'Test message',
        duration: 4000,
      });
    });

    it('unsubscribes listeners', () => {
      unsubscribe();
      
      toastService.success('Test message');
      
      expect(mockListener).not.toHaveBeenCalled();
    });

    it('supports multiple subscribers', () => {
      const secondListener = jest.fn();
      const unsubscribe2 = toastService.subscribe(secondListener);
      
      toastService.info('Test message');
      
      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(secondListener).toHaveBeenCalledTimes(1);
      
      unsubscribe2();
    });

    it('handles partial unsubscription correctly', () => {
      const secondListener = jest.fn();
      const unsubscribe2 = toastService.subscribe(secondListener);
      
      unsubscribe();
      
      toastService.warning('Test message');
      
      expect(mockListener).not.toHaveBeenCalled();
      expect(secondListener).toHaveBeenCalledTimes(1);
      
      unsubscribe2();
    });
  });

  describe('toast methods', () => {
    describe('success', () => {
      it('emits success toast with default duration', () => {
        toastService.success('Success message');
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'success',
          message: 'Success message',
          duration: 4000,
        });
      });

      it('accepts custom options', () => {
        toastService.success('Success', {
          duration: 2000,
          title: 'Custom Title',
          action: {
            label: 'Undo',
            onClick: jest.fn(),
          },
        });
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'success',
          message: 'Success',
          duration: 2000,
          title: 'Custom Title',
          action: {
            label: 'Undo',
            onClick: expect.any(Function),
          },
        });
      });
    });

    describe('error', () => {
      it('emits error toast with longer duration', () => {
        toastService.error('Error message');
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'error',
          message: 'Error message',
          duration: 7000,
        });
      });

      it('accepts custom options', () => {
        toastService.error('Error', {
          duration: 10000,
          persistent: true,
        });
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'error',
          message: 'Error',
          duration: 10000,
          persistent: true,
        });
      });
    });

    describe('warning', () => {
      it('emits warning toast with medium duration', () => {
        toastService.warning('Warning message');
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'warning',
          message: 'Warning message',
          duration: 5000,
        });
      });
    });

    describe('info', () => {
      it('emits info toast with default duration', () => {
        toastService.info('Info message');
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'info',
          message: 'Info message',
          duration: 4000,
        });
      });
    });
  });

  describe('memory-specific methods', () => {
    describe('memorySuccess', () => {
      it('shows appropriate message for save operation', () => {
        toastService.memorySuccess('save');
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'success',
          message: '💾 Conversation saved successfully',
          duration: 4000,
        });
      });

      it('shows appropriate message for mark operation', () => {
        toastService.memorySuccess('mark');
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'success',
          message: '💡 Memory marked as important',
          duration: 4000,
        });
      });

      it('shows appropriate message for forget operation', () => {
        toastService.memorySuccess('forget');
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'success',
          message: '🗑️ Memory forgotten',
          duration: 4000,
        });
      });

      it('shows appropriate message for export operation', () => {
        toastService.memorySuccess('export');
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'success',
          message: '📁 Data exported successfully',
          duration: 4000,
        });
      });

      it('shows appropriate message for clear operation', () => {
        toastService.memorySuccess('clear');
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'success',
          message: '🧹 All data cleared',
          duration: 4000,
        });
      });

      it('shows generic message for unknown operation', () => {
        toastService.memorySuccess('unknown');
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'success',
          message: 'unknown completed successfully',
          duration: 4000,
        });
      });
    });

    describe('memoryError', () => {
      it('shows basic error message without error details', () => {
        toastService.memoryError('save');
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to save conversation - Please try again.',
          duration: 7000,
          title: 'Memory System Error',
          action: undefined,
        });
      });

      it('shows quota exceeded message for quota errors', () => {
        const error = new Error('QuotaExceededError: Storage quota exceeded');
        toastService.memoryError('save', error);
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to save conversation - Storage quota exceeded. Try clearing old data.',
          duration: 7000,
          title: 'Memory System Error',
          action: undefined,
        });
      });

      it('shows transaction error message', () => {
        const error = new Error('TransactionInactiveError: Transaction is not active');
        toastService.memoryError('mark', error);
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to mark memory as important - Please try again.',
          duration: 7000,
          title: 'Memory System Error',
          action: undefined,
        });
      });

      it('shows network error message', () => {
        const error = new Error('NetworkError: Failed to fetch');
        toastService.memoryError('export', error);
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to export data - Check your internet connection.',
          duration: 7000,
          title: 'Memory System Error',
          action: undefined,
        });
      });

      it('includes retry action when provided', () => {
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

      it('handles unknown operations', () => {
        toastService.memoryError('unknown-op');
        
        expect(mockListener).toHaveBeenCalledWith({
          type: 'error',
          message: 'unknown-op failed - Please try again.',
          duration: 7000,
          title: 'Memory System Error',
          action: undefined,
        });
      });
    });
  });

  describe('loading', () => {
    it('shows loading toast with persistent flag', () => {
      const loadingId = toastService.loading('Processing...');
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'info',
        message: '⏳ Processing...',
        persistent: true,
      });
      
      expect(loadingId).toMatch(/^loading-\d+$/);
    });

    it('accepts custom options', () => {
      toastService.loading('Loading data', {
        title: 'Please wait',
        duration: 0, // Infinite
      });
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'info',
        message: '⏳ Loading data',
        persistent: true,
        title: 'Please wait',
        duration: 0,
      });
    });

    it('returns unique loading IDs', () => {
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000);
        
      const id1 = toastService.loading('First');
      const id2 = toastService.loading('Second');
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^loading-\d+$/);
      expect(id2).toMatch(/^loading-\d+$/);
    });
  });

  describe('edge cases', () => {
    it('handles empty message strings', () => {
      toastService.success('');
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'success',
        message: '',
        duration: 4000,
      });
    });

    it('handles very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      toastService.info(longMessage);
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'info',
        message: longMessage,
        duration: 4000,
      });
    });

    it('handles null/undefined in error objects gracefully', () => {
      toastService.memoryError('save', undefined);
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to save conversation - Please try again.',
        duration: 7000,
        title: 'Memory System Error',
        action: undefined,
      });
    });

    it('handles errors with no message property', () => {
      const error = { toString: () => 'Custom error' };
      // Pass as Error to avoid the optional chaining issue
      toastService.memoryError('save', error as any);
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to save conversation - Please try again.',
        duration: 7000,
        title: 'Memory System Error',
        action: undefined,
      });
    });
  });
});