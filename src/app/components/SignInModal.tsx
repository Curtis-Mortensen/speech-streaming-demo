'use client';

import React, { useEffect, useRef } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input[type="text"]:not([disabled])',
    'input[type="email"]:not([disabled])',
    'input[type="password"]:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(selectors.join(',')));
  return nodes.filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
}

export default function SignInModal({ isOpen, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusElRef = useRef<Element | null>(null);

  // Open/close side-effects
  useEffect(() => {
    if (!isOpen) return;

    restoreFocusElRef.current = document.activeElement;

    // Lock body scroll while open
    document.body.classList.add('overflow-hidden');

    // Focus first focusable inside the panel
    const panel = panelRef.current;
    const focusables = getFocusableElements(panel as HTMLElement);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      panel?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        // Trap focus within modal
        const fEls = getFocusableElements(panelRef.current as HTMLElement);
        if (fEls.length === 0) return;
        const first = fEls[0];
        const last = fEls[fEls.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (!active || active === first || !panelRef.current?.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (!active || active === last || !panelRef.current?.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('overflow-hidden');
      // Restore focus to the element that triggered the modal
      const prev = restoreFocusElRef.current as HTMLElement | null;
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        data-testid="modal-backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sign-in-title"
          className="pointer-events-auto w-full max-w-sm rounded-lg bg-white text-gray-900 dark:bg-neutral-900 dark:text-white shadow-xl focus:outline-none"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <div className="p-6">
            <h2 id="sign-in-title" className="text-xl font-semibold mb-4">Sign in</h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                // UI-only demo: optionally close modal on submit
                onClose();
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="email" className="block text-sm mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm mb-1">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
