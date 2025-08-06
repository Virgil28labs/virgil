import type { Toast } from '../components/ToastNotification';
import { timeService } from './TimeService';
import { logger } from '../lib/logger';

type ToastEventListener = (toast: Omit<Toast, 'id'>) => void;

/**
 * Global ToastService for showing notifications from anywhere in the app
 * Uses event system to communicate with React components
 */
class ToastService {
  private listeners: ToastEventListener[] = [];

  /**
   * Subscribe to toast events (used by React components)
   */
  subscribe(listener: ToastEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Emit a toast event to all subscribers
   */
  private emit(toast: Omit<Toast, 'id'>): void {
    this.listeners.forEach(listener => {
      try {
        listener(toast);
      } catch (error) {
        // Silently ignore listener errors to prevent cascade failures
        logger.error('Toast listener error', { component: 'ToastService', action: 'emit' }, error as Error);
      }
    });
  }

  /**
   * Show a success toast
   */
  success(message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>): void {
    this.emit({
      type: 'success',
      message,
      duration: 4000,
      ...options,
    });
  }

  /**
   * Show an error toast
   */
  error(message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>): void {
    this.emit({
      type: 'error',
      message,
      duration: 7000, // Errors stay longer
      ...options,
    });
  }

  /**
   * Show a warning toast
   */
  warning(message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>): void {
    this.emit({
      type: 'warning',
      message,
      duration: 5000,
      ...options,
    });
  }

  /**
   * Show an info toast
   */
  info(message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>): void {
    this.emit({
      type: 'info',
      message,
      duration: 4000,
      ...options,
    });
  }

  /**
   * Memory-specific success messages
   */
  memorySuccess(operation: string): void {
    const messages = {
      save: '💾 Conversation saved successfully',
      mark: '💡 Memory marked as important',
      forget: '🗑️ Memory forgotten',
      export: '📁 Data exported successfully',
      clear: '🧹 All data cleared',
    };

    this.success(messages[operation as keyof typeof messages] || `${operation} completed successfully`);
  }

  /**
   * Memory-specific error messages with helpful context
   */
  memoryError(operation: string, error?: Error, retryAction?: () => void): void {
    const baseMessages = {
      save: 'Failed to save conversation',
      mark: 'Failed to mark memory as important',
      forget: 'Failed to remove memory',
      export: 'Failed to export data',
      clear: 'Failed to clear data',
      load: 'Failed to load memories',
      context: 'Failed to build conversation context',
    };

    const baseMessage = baseMessages[operation as keyof typeof baseMessages] || `${operation} failed`;

    // Provide user-friendly error context
    let message = baseMessage;
    const errorMessage = error?.message || '';

    if (errorMessage.includes('quota')) {
      message += ' - Storage quota exceeded. Try clearing old data.';
    } else if (errorMessage.includes('transaction')) {
      message += ' - Please try again in a moment.';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      message += ' - Check your internet connection.';
    } else {
      message += ' - Please try again.';
    }

    this.error(message, {
      title: 'Memory System Error',
      action: retryAction ? {
        label: 'Retry',
        onClick: retryAction,
      } : undefined,
    });
  }

  /**
   * Show loading toast for long operations
   */
  loading(message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>): string {
    const loadingId = `loading-${timeService.getTimestamp()}`;
    this.emit({
      type: 'info',
      message: `⏳ ${message}`,
      persistent: true,
      ...options,
    });
    return loadingId;
  }
}

// Export singleton instance
export const toastService = new ToastService();
