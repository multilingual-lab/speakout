import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthModal from './AuthModal.jsx';

afterEach(cleanup);

function renderModal(overrides = {}) {
  const props = {
    onClose: vi.fn(),
    onSignInWithGoogle: vi.fn(),
    onSignInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    onSignUp: vi.fn().mockResolvedValue({ error: null }),
    onResetPassword: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  const result = render(<AuthModal {...props} />);
  return { ...result, props };
}

describe('AuthModal — sign-in / sign-up flow', () => {
  // ── Form rendering ──

  it('renders email, password inputs and both buttons', () => {
    renderModal();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
  });

  it('buttons are disabled when inputs are empty', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled();
  });

  // ── Sign in ──

  it('calls onSignInWithPassword and closes modal on success', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(props.onSignInWithPassword).toHaveBeenCalledWith('test@example.com', 'secret123');
    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
  });

  it('shows error message on sign-in failure', async () => {
    const user = userEvent.setup();
    const { props } = renderModal({
      onSignInWithPassword: vi.fn().mockResolvedValue({ error: { message: 'Invalid credentials' } }),
    });

    await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeInTheDocument());
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('does not submit sign-in when email is empty', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.type(screen.getByPlaceholderText('Password'), 'secret123');
    // Button should still be disabled
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    expect(props.onSignInWithPassword).not.toHaveBeenCalled();
  });

  it('trims email whitespace before submitting', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.type(screen.getByPlaceholderText('Email address'), '  test@example.com  ');
    await user.type(screen.getByPlaceholderText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(props.onSignInWithPassword).toHaveBeenCalledWith('test@example.com', 'secret123');
  });

  // ── Sign up ──

  it('calls onSignUp and closes modal on success', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.type(screen.getByPlaceholderText('Email address'), 'new@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'newpass123');
    // Click Sign up to reveal confirm email field
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    await user.type(screen.getByPlaceholderText('Confirm email address'), 'new@example.com');
    // Click Sign up again to submit
    await user.click(screen.getByRole('button', { name: /Sign up/ }));

    expect(props.onSignUp).toHaveBeenCalledWith('new@example.com', 'newpass123');
    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
  });

  it('shows error message on sign-up failure', async () => {
    const user = userEvent.setup();
    const { props } = renderModal({
      onSignUp: vi.fn().mockResolvedValue({ error: { message: 'Email already registered' } }),
    });

    await user.type(screen.getByPlaceholderText('Email address'), 'existing@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'pass123');
    // Click Sign up to reveal confirm email field
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    await user.type(screen.getByPlaceholderText('Confirm email address'), 'existing@example.com');
    // Click Sign up again to submit
    await user.click(screen.getByRole('button', { name: /Sign up/ }));

    await waitFor(() => expect(screen.getByText('Email already registered')).toBeInTheDocument());
    expect(props.onClose).not.toHaveBeenCalled();
  });

  // ── Google sign-in ──

  it('calls onSignInWithGoogle when clicking the Google button', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(props.onSignInWithGoogle).toHaveBeenCalled();
  });

  // ── Forgot password flow ──

  it('navigates to forgot-password step and sends reset email', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(screen.getByText('Reset password')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Email address'), 'forgot@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(props.onResetPassword).toHaveBeenCalledWith('forgot@example.com');
    await waitFor(() => expect(screen.getByText('Check your email')).toBeInTheDocument());
  });

  it('shows error on reset-password failure', async () => {
    const user = userEvent.setup();
    renderModal({
      onResetPassword: vi.fn().mockResolvedValue({ error: { message: 'User not found' } }),
    });

    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
    await user.type(screen.getByPlaceholderText('Email address'), 'nobody@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => expect(screen.getByText('User not found')).toBeInTheDocument());
  });

  it('can navigate back from forgot-password to sign-in form', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(screen.getByText('Reset password')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });

  // ── Modal close ──

  it('calls onClose when clicking the × button', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.click(screen.getByRole('button', { name: '×' }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking the overlay', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    // The overlay is the outermost div
    const overlay = document.querySelector('.settings-overlay');
    await user.click(overlay);
    expect(props.onClose).toHaveBeenCalled();
  });
});
