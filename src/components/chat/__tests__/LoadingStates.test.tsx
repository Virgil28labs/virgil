import { render, screen } from '@testing-library/react';
import { LoadingStates } from '../LoadingStates';

describe('LoadingStates Component', () => {
  describe('Visibility', () => {
    it('renders when isVisible is true', () => {
      render(<LoadingStates variant="typing" isVisible={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('does not render when isVisible is false', () => {
      render(<LoadingStates variant="typing" isVisible={false} />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('renders by default when isVisible is not provided', () => {
      render(<LoadingStates variant="typing" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Typing Variant', () => {
    it('renders typing indicator with default message', () => {
      render(<LoadingStates variant="typing" />);
      
      expect(screen.getByText('Virgil is thinking...')).toBeInTheDocument();
      expect(screen.getByText('V')).toBeInTheDocument(); // Avatar
      expect(document.querySelector('.typing-indicator')).toBeInTheDocument();
      expect(document.querySelector('.typing-dots')).toBeInTheDocument();
    });

    it('renders custom message when provided', () => {
      render(<LoadingStates variant="typing" message="Custom loading message" />);
      
      expect(screen.getByText('Custom loading message')).toBeInTheDocument();
    });

    it('renders three animated dots', () => {
      render(<LoadingStates variant="typing" />);
      
      expect(document.querySelector('.dot-1')).toBeInTheDocument();
      expect(document.querySelector('.dot-2')).toBeInTheDocument();
      expect(document.querySelector('.dot-3')).toBeInTheDocument();
    });

    it('has correct accessibility attributes', () => {
      render(<LoadingStates variant="typing" />);
      
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Message Variant', () => {
    it('renders message loading state with default type', () => {
      render(<LoadingStates variant="message" />);
      
      expect(screen.getByText('Processing your request...')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument(); // Default icon
      expect(document.querySelector('.message-loading-state')).toBeInTheDocument();
    });

    describe('Different Types', () => {
      it('renders generating type correctly', () => {
        render(<LoadingStates variant="message" type="generating" />);
        
        expect(screen.getByText('Generating response...')).toBeInTheDocument();
        expect(screen.getByText('✨')).toBeInTheDocument();
      });

      it('renders processing type correctly', () => {
        render(<LoadingStates variant="message" type="processing" />);
        
        expect(screen.getByText('Processing your request...')).toBeInTheDocument();
        expect(screen.getByText('⚙️')).toBeInTheDocument();
      });

      it('renders thinking type correctly', () => {
        render(<LoadingStates variant="message" type="thinking" />);
        
        expect(screen.getByText('Thinking about your question...')).toBeInTheDocument();
        expect(screen.getByText('🤔')).toBeInTheDocument();
      });

      it('renders searching type correctly', () => {
        render(<LoadingStates variant="message" type="searching" />);
        
        expect(screen.getByText('Searching through memory...')).toBeInTheDocument();
        expect(screen.getByText('🔍')).toBeInTheDocument();
      });
    });

    it('renders custom message overriding type message', () => {
      render(
        <LoadingStates 
          variant="message" 
          type="generating" 
          message="Custom progress message" 
        />
      );
      
      expect(screen.getByText('Custom progress message')).toBeInTheDocument();
      expect(screen.queryByText('Generating response...')).not.toBeInTheDocument();
    });

    it('renders progress bar when progress is provided', () => {
      render(<LoadingStates variant="message" progress={45} />);
      
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(document.querySelector('.loading-progress')).toBeInTheDocument();
      expect(document.querySelector('.progress-fill')).toHaveStyle({ width: '45%' });
    });

    it('clamps progress between 0 and 100', () => {
      const { rerender } = render(<LoadingStates variant="message" progress={-10} />);
      expect(document.querySelector('.progress-fill')).toHaveStyle({ width: '0%' });
      
      rerender(<LoadingStates variant="message" progress={150} />);
      expect(document.querySelector('.progress-fill')).toHaveStyle({ width: '100%' });
    });

    it('rounds progress percentage display', () => {
      render(<LoadingStates variant="message" progress={45.7} />);
      expect(screen.getByText('46%')).toBeInTheDocument();
    });

    it('does not render progress bar when progress is undefined', () => {
      render(<LoadingStates variant="message" />);
      
      expect(document.querySelector('.loading-progress')).not.toBeInTheDocument();
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });

    it('renders pulse animation dots', () => {
      render(<LoadingStates variant="message" />);
      
      expect(document.querySelector('.pulse-1')).toBeInTheDocument();
      expect(document.querySelector('.pulse-2')).toBeInTheDocument();
      expect(document.querySelector('.pulse-3')).toBeInTheDocument();
    });

    it('renders avatar correctly', () => {
      render(<LoadingStates variant="message" />);
      
      expect(screen.getByText('V')).toBeInTheDocument();
      expect(document.querySelector('.chatbot-avatar-v')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined type gracefully', () => {
      render(<LoadingStates variant="message" type={undefined} />);
      
      expect(screen.getByText('Processing your request...')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    it('handles invalid type gracefully', () => {
      render(<LoadingStates variant="message" type={'invalid' as any} />);
      
      expect(screen.getByText('Working...')).toBeInTheDocument();
      expect(screen.getByText('⏳')).toBeInTheDocument();
    });

    it('handles zero progress', () => {
      render(<LoadingStates variant="message" progress={0} />);
      
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(document.querySelector('.progress-fill')).toHaveStyle({ width: '0%' });
    });

    it('handles 100% progress', () => {
      render(<LoadingStates variant="message" progress={100} />);
      
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(document.querySelector('.progress-fill')).toHaveStyle({ width: '100%' });
    });
  });

  describe('Memoization', () => {
    it('does not re-render when props remain the same', () => {
      const { rerender } = render(
        <LoadingStates variant="typing" type="thinking" />
      );

      const initialElement = screen.getByText('Virgil is thinking...');

      // Re-render with same props
      rerender(<LoadingStates variant="typing" type="thinking" />);

      // Should be the same element (not re-rendered)
      expect(screen.getByText('Virgil is thinking...')).toBe(initialElement);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for typing variant', () => {
      render(<LoadingStates variant="typing" />);
      
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });

    it('has proper ARIA attributes for message variant', () => {
      render(<LoadingStates variant="message" />);
      
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });
  });
});