/**
 * Tests for the compact voice-first control bar in [src/app/page.tsx](src/app/page.tsx)
 *
 * Verifies:
 * 1) The 3-control bar renders in order: Text (toggle), Mic (Record), Send.
 * 2) Toggling Text shows a textbox; entering text enables Send.
 * 3) Initial Send (in the control bar) is disabled when there is no text and no transcript.
 */

import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import Page from '../app/page';
import '@testing-library/jest-dom';

// Helper to scope queries to the control bar that contains the "Record" button
function getControlBarContainer() {
  const recordBtn = screen.getByRole('button', { name: /record/i });
  // The structure in [src/app/page.tsx](src/app/page.tsx) is:
  // flex container div (buttons are inside a "flex flex-wrap items-center" div)
  // Record button is nested; we climb up to that flex container.
  let container: HTMLElement | null = recordBtn.parentElement;
  // Climb up until we find an element that contains all three buttons.
  // We expect the container to include "Text" toggle and "Send" button siblings.
  for (let i = 0; i < 5 && container; i++) {
    const hasText = within(container).queryByRole('button', { name: /^text$/i }) !== null
      || within(container).queryByLabelText(/type a message/i) !== null; // when expanded it becomes a textarea with label
    const hasRecord = within(container).queryByRole('button', { name: /record/i }) !== null;
    const hasSend = within(container).queryByRole('button', { name: /^send$/i }) !== null;
    if (hasText && hasRecord && hasSend) {
      return container;
    }
    container = container.parentElement;
  }
  // Fallback to document body if not found (should not happen)
  return document.body;
}

describe('Voice-first control bar UI', () => {
  test('renders three controls in DOM order: Text, Record, Send', () => {
    render(<Page />);

    const container = getControlBarContainer();

    // Collect candidate elements inside the control bar container only
    const textToggle = within(container).queryByRole('button', { name: /^text$/i });
    expect(textToggle).toBeInTheDocument();

    const recordBtn = within(container).getByRole('button', { name: /record/i });
    expect(recordBtn).toBeInTheDocument();

    // Important: There is also a legacy "Send" button above.
    // We must only select the "Send" inside the control bar container.
    const sendBtn = within(container).getByRole('button', { name: /^send$/i });
    expect(sendBtn).toBeInTheDocument();

    // Verify DOM order: Text (or its slot), then Record, then Send
    // Use compareDocumentPosition to assert order in the DOM tree.
    if (textToggle) {
      // textToggle should come before recordBtn
      const posTR = textToggle.compareDocumentPosition(recordBtn);
      expect(posTR & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    // recordBtn should come before sendBtn
    const posRS = recordBtn.compareDocumentPosition(sendBtn);
    expect(posRS & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('clicking "Text" shows a textbox; entering text enables "Send"', () => {
    render(<Page />);

    const container = getControlBarContainer();

    // Initially, there is a "Text" button (collapsed mode)
    const textToggle = within(container).getByRole('button', { name: /^text$/i });
    const sendBtn = within(container).getByRole('button', { name: /^send$/i });

    // Initially send should be disabled (no text, no transcript)
    expect(sendBtn).toBeDisabled();

    // Expand text mode
    fireEvent.click(textToggle);

    // Now a textarea should appear (role="textbox")
    const textbox = within(container).getByRole('textbox');
    expect(textbox).toBeInTheDocument();

    // Enter some text
    fireEvent.change(textbox, { target: { value: 'Hello world' } });

    // With non-empty text, "Send" should be enabled
    expect(sendBtn).not.toBeDisabled();
  });

  test('initial "Send" (in control bar) is disabled when no text and no transcript', () => {
    render(<Page />);

    const container = getControlBarContainer();
    const sendBtn = within(container).getByRole('button', { name: /^send$/i });

    expect(sendBtn).toBeDisabled();
  });
});