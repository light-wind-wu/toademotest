'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Dialog/overlay accessibility per PRIZM cross-cutting standard #5:
 * focus-trap (Tab/Shift+Tab contained), focus the first control on open,
 * Esc to dismiss, and return focus to the trigger on close.
 *
 * Attach the returned ref to the dialog panel. Give the panel
 * `tabIndex={-1}` so it can hold focus when it has no focusable children.
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  onClose?: () => void,
  opts?: { closeOnEsc?: boolean },
) {
  const ref = useRef<T>(null);
  const closeOnEsc = opts?.closeOnEsc ?? true;

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    const prevFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // Focus the first control (or the panel itself as a fallback).
    (focusables()[0] ?? node)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && closeOnEsc) {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const els = focusables();
      if (els.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && (activeEl === first || activeEl === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      // Return focus to the element that opened the dialog.
      prevFocused?.focus?.();
    };
  }, [active, onClose, closeOnEsc]);

  return ref;
}
