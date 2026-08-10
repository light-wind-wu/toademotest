'use client';

import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── RowMenuButton ────────────────────────────────────────────────────────
   The ⋮ trigger. Place inside a <td> that has onClick={e=>e.stopPropagation()}.
   The parent <tr> must have className="group" for hover-reveal to work.
──────────────────────────────────────────────────────────────────────────── */
export function RowMenuButton({ onClick, alwaysVisible }: { onClick: (e: React.MouseEvent) => void; alwaysVisible?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-2 rounded-full hover:bg-bg-subtle text-fg-muted transition-colors',
        alwaysVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}
    >
      <MoreVertical size={16} />
    </button>
  );
}

/* ── RowDropdown ──────────────────────────────────────────────────────────
   Positioned dropdown + transparent backdrop. Render at the Shell level
   (outside the table) so it isn't clipped by overflow-hidden ancestors.
──────────────────────────────────────────────────────────────────────────── */
export function RowDropdown({
  pos,
  onClose,
  width = 'w-52',
  children,
}: {
  pos: { top: number; right: number };
  onClose: () => void;
  width?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[150]" onClick={onClose} />
      <div
        className={cn(
          'fixed bg-surface border border-border rounded-xl shadow-lg z-[200] py-1 overflow-hidden',
          width,
        )}
        style={{ top: pos.top, right: pos.right }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}

/* ── DropdownItem ─────────────────────────────────────────────────────────
   Single action row inside a RowDropdown.
──────────────────────────────────────────────────────────────────────────── */
export function DropdownItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center px-4 py-2.5 text-body-sm transition-colors text-left',
        icon && 'gap-3',
        danger
          ? 'text-danger hover:bg-danger-bg'
          : 'text-fg hover:bg-bg-subtle',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/* ── DropdownDivider ──────────────────────────────────────────────────────*/
export function DropdownDivider() {
  return <div className="border-t border-border my-1" />;
}
