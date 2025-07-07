/**
 * UI Component Types
 * Common UI patterns and component props
 */

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
}

export interface LoadingState {
  loading: boolean;
  message?: string;
}

export interface ErrorState {
  error: string | null;
  onClear?: () => void;
}

export interface MessageState {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  'aria-describedby'?: string;
  autoComplete?: string;
}

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  'aria-label'?: string;
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  closeOnOverlayClick?: boolean;
}

export interface DropdownProps {
  options: Array<{
    id: string;
    label: string;
    value: string;
  }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export interface DateTimeDisplayProps {
  format?: 'full' | 'time' | 'date';
  updateInterval?: number;
}

export interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'full' | 'icon';
}

export interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}