import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Page from '../app/page';
import '@testing-library/jest-dom';

/**
 * UI-only tests for Sign in modal
 */

describe('Sign in modal UI', () => {
  test('Sign in button is visible and opens modal with form fields', () => {
    render(<Page />);

    const openBtn = screen.getByRole('button', { name: /sign in/i });
    expect(openBtn).toBeInTheDocument();

    fireEvent.click(openBtn);

    // Modal title
    const title = screen.getByRole('heading', { name: /sign in/i });
    expect(title).toBeInTheDocument();

    const email = screen.getByLabelText(/email/i);
    const password = screen.getByLabelText(/password/i);
    expect(email).toBeInTheDocument();
    expect(password).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: /^sign in$/i });
    expect(submit).toBeInTheDocument();

    const cancel = screen.getByRole('button', { name: /cancel/i });
    expect(cancel).toBeInTheDocument();
  });

  test('Modal closes via Cancel, ESC, and backdrop click', () => {
    render(<Page />);

    const openBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(openBtn);

    // Cancel
    const cancel = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancel);
    expect(screen.queryByRole('heading', { name: /sign in/i })).not.toBeInTheDocument();

    // Open again
    fireEvent.click(openBtn);
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();

    // ESC
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('heading', { name: /sign in/i })).not.toBeInTheDocument();

    // Open again
    fireEvent.click(openBtn);
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();

    // Backdrop
    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);
    expect(screen.queryByRole('heading', { name: /sign in/i })).not.toBeInTheDocument();
  });
});
