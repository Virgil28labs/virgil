import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UserProfile } from './UserProfile';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { supabase } from '../lib/supabase';

// Mock dependencies
jest.mock('../contexts/AuthContext');
jest.mock('../hooks/useToast');
jest.mock('../hooks/useKeyboardNavigation');
jest.mock('../lib/supabase');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseKeyboardNavigation = useKeyboardNavigation as jest.MockedFunction<typeof useKeyboardNavigation>;

const mockUser = {
  id: 'test-id',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  user_metadata: {
    name: 'Test User',
    bio: 'This is a test bio',
    avatarUrl: 'https://example.com/avatar.jpg'
  }
};

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn()
};

const mockSignOut = jest.fn();
const mockOnBack = jest.fn();

describe('UserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: mockSignOut
    });
    
    mockUseToast.mockReturnValue(mockToast);
    
    mockUseKeyboardNavigation.mockReturnValue({
      containerRef: { current: null },
      activeIndex: 0,
      setActiveIndex: jest.fn()
    });
    
    // Mock supabase auth methods
    (supabase.auth.updateUser as jest.Mock) = jest.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  it('renders user profile information', async () => {
    const { container } = render(<UserProfile />);
    
    // Wait for any async updates to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('This is a test bio')).toBeInTheDocument();
    
    // Check for the Member Since label 
    expect(screen.getByText('Member Since')).toBeInTheDocument();
    // The date should be formatted - just check it exists, don't check exact value
    const memberSinceSection = screen.getByText('Member Since').parentElement;
    expect(memberSinceSection).toHaveTextContent(/\w+ \d{1,2}, \d{4}/);
  });

  it('renders avatar or initials', async () => {
    await act(async () => {
      render(<UserProfile />);
    });
    
    const avatar = screen.getByAltText('Profile avatar');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('shows initials when no avatar URL', () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, user_metadata: { ...mockUser.user_metadata, avatarUrl: '' } },
      loading: false,
      signOut: mockSignOut
    });
    
    render(<UserProfile />);
    
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('toggles edit mode', () => {
    render(<UserProfile />);
    
    const editButton = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editButton);
    
    // Should show form inputs
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
    
    // Should show save and cancel buttons
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('cancels edit mode', () => {
    render(<UserProfile />);
    
    const editButton = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editButton);
    
    // Make some changes
    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    
    // Cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    // Should revert to view mode
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('saves profile changes', async () => {
    render(<UserProfile />);
    
    const editButton = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editButton);
    
    // Make changes
    const nameInput = screen.getByLabelText(/full name/i);
    const bioInput = screen.getByLabelText(/bio/i);
    
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
    fireEvent.change(bioInput, { target: { value: 'Updated bio' } });
    
    // Save
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        data: {
          name: 'Updated Name',
          bio: 'Updated bio',
          avatarUrl: 'https://example.com/avatar.jpg'
        }
      });
      expect(mockToast.success).toHaveBeenCalledWith('Profile updated successfully');
    });
  });

  it('handles profile update error', async () => {
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Update failed' }
    });
    
    render(<UserProfile />);
    
    const editButton = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editButton);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Update failed');
    });
  });

  it('toggles password change form', () => {
    render(<UserProfile />);
    
    const changePasswordButton = screen.getByRole('button', { name: /change password/i });
    fireEvent.click(changePasswordButton);
    
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
  });

  it('validates password confirmation', async () => {
    render(<UserProfile />);
    
    const changePasswordButton = screen.getByRole('button', { name: /change password/i });
    fireEvent.click(changePasswordButton);
    
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    
    fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
    
    const updateButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Passwords do not match');
    });
  });

  it('validates password length', async () => {
    render(<UserProfile />);
    
    const changePasswordButton = screen.getByRole('button', { name: /change password/i });
    fireEvent.click(changePasswordButton);
    
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    
    fireEvent.change(newPasswordInput, { target: { value: 'short' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });
    
    const updateButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Password must be at least 6 characters');
    });
  });

  it('handles file upload for avatar', async () => {
    render(<UserProfile />);
    
    const editButton = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editButton);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/upload avatar/i);
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      // Should show preview (data URL would be set)
      expect(screen.getByRole('img', { name: /user avatar/i })).toBeInTheDocument();
    });
  });

  it('validates file type', async () => {
    render(<UserProfile />);
    
    const editButton = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editButton);
    
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/upload avatar/i);
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Please select an image file');
    });
  });

  it('validates file size', async () => {
    render(<UserProfile />);
    
    const editButton = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editButton);
    
    // Create a large file (> 5MB)
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/upload avatar/i);
    
    Object.defineProperty(fileInput, 'files', {
      value: [largeFile],
      writable: false
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Image must be less than 5MB');
    });
  });

  it('handles sign out', () => {
    render(<UserProfile />);
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);
    
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('calls onBack when back button is clicked', () => {
    render(<UserProfile onBack={mockOnBack} />);
    
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);
    
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('shows loading state during updates', async () => {
    render(<UserProfile />);
    
    const editButton = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editButton);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    
    // Button should be disabled while loading
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveTextContent(/saving/i);
  });

  it('has proper accessibility attributes', async () => {
    await act(async () => {
      render(<UserProfile />);
    });
    
    const profileSection = screen.getByRole('main', { name: /user profile/i });
    expect(profileSection).toBeInTheDocument();
    
    const editButton = screen.getByText('Edit Profile');
    expect(editButton).toHaveAttribute('data-keyboard-nav');
  });
});