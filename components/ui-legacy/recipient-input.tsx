'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONTACTS } from '@/lib/data';
import type { Contact } from '@/lib/types';

/* ── Helpers ─────────────────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isEmail(s: string) { return EMAIL_RE.test(s.trim()); }

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Rank contacts against a query: name/email startsWith beats includes; empty query = none. */
function filterContacts(contacts: Contact[], query: string, exclude: Set<string>, limit = 8): Contact[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { c: Contact; score: number }[] = [];
  for (const c of contacts) {
    if (exclude.has(c.email.toLowerCase())) continue;
    const name = c.name.toLowerCase();
    const email = c.email.toLowerCase();
    const pc = (c.pc ?? '').toLowerCase();
    let score = -1;
    if (name.startsWith(q) || email.startsWith(q)) score = 0;
    else if (name.includes(q) || email.includes(q)) score = 1;
    else if (pc && pc.includes(q)) score = 2;
    if (score >= 0) scored.push({ c, score });
  }
  scored.sort((a, b) => a.score - b.score || a.c.name.localeCompare(b.c.name));
  return scored.slice(0, limit).map(s => s.c);
}

/* ── Recipient chip ──────────────────────────────────────────────── */

function Chip({ email, contact, onRemove }: { email: string; contact?: Contact; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-1 pr-1.5 py-0.5 bg-bg-subtle border border-border text-fg rounded-md text-[13px] max-w-full">
      <span className="w-4 h-4 rounded-full bg-accent/15 text-accent text-[9px] font-bold flex items-center justify-center shrink-0">
        {initials(contact?.name ?? email)}
      </span>
      <span className="truncate max-w-[180px]" title={contact ? `${contact.name} · ${email}` : email}>
        {contact?.name ?? email}
      </span>
      <button type="button" onClick={onRemove} className="hover:text-danger transition-colors shrink-0">
        <X size={10} />
      </button>
    </span>
  );
}

/* ── RecipientInput ──────────────────────────────────────────────── */

interface RecipientInputProps {
  /** Selected recipient emails. */
  value:         string[];
  onChange:      (emails: string[]) => void;
  /** Address book to search. Defaults to the shared CONTACTS list. */
  contacts?:     Contact[];
  /** When false, only a single recipient may be selected. Defaults to true. */
  multiple?:     boolean;
  placeholder?:  string;
  /** Set to false to reject free-typed addresses not in the address book. Defaults to true. */
  allowCustom?:  boolean;
  className?:    string;
  inputClassName?: string;
}

/**
 * Outlook/Gmail-style recipient picker. Type a name or email to autocomplete
 * against the address book; selected recipients render as chips. Reusable for
 * any To / Cc style field.
 */
export default function RecipientInput({
  value, onChange, contacts = CONTACTS, multiple = true,
  placeholder, allowCustom = true, className, inputClassName,
}: RecipientInputProps) {
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);
  const [active, setActive] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const byEmail = useMemo(
    () => new Map(contacts.map(c => [c.email.toLowerCase(), c])),
    [contacts],
  );

  const exclude  = useMemo(() => new Set(value.map(v => v.toLowerCase())), [value]);
  const matches  = useMemo(() => filterContacts(contacts, query, exclude), [contacts, query, exclude]);
  const atLimit  = !multiple && value.length >= 1;

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  function add(email: string) {
    const e = email.trim().replace(/,$/, '').trim();
    if (!e) return;
    if (!exclude.has(e.toLowerCase())) {
      onChange(multiple ? [...value, e] : [e]);
    }
    setQuery('');
    setOpen(false);
  }

  function remove(email: string) {
    onChange(value.filter(v => v !== email));
  }

  function commitTyped() {
    const t = query.trim();
    if (!t) return;
    if (matches.length > 0) { add(matches[active]?.email ?? matches[0].email); return; }
    if (allowCustom && isEmail(t)) add(t);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && open && matches.length) {
      e.preventDefault(); setActive(a => Math.min(a + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp' && open && matches.length) {
      e.preventDefault(); setActive(a => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' || e.key === ',' || (e.key === 'Tab' && query.trim() && (matches.length || (allowCustom && isEmail(query))))) {
      if (e.key === 'Enter' || e.key === ',') e.preventDefault();
      else if (e.key === 'Tab') e.preventDefault();
      commitTyped();
    } else if (e.key === 'Backspace' && !query && value.length) {
      remove(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={cn('relative flex-1 min-w-0', className)}>
      <div
        className="flex flex-wrap gap-1 items-center cursor-text"
        onClick={() => { if (!atLimit) inputRef.current?.focus(); }}
      >
        {value.map(email => (
          <Chip key={email} email={email} contact={byEmail.get(email.toLowerCase())} onRemove={() => remove(email)} />
        ))}
        {!atLimit && (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => { if (query) setOpen(true); }}
            onKeyDown={onKeyDown}
            onBlur={commitTyped}
            placeholder={value.length === 0 ? placeholder : ''}
            className={cn(
              'flex-1 min-w-[140px] bg-transparent border-none outline-none text-body-sm text-fg placeholder:text-fg-subtle py-0.5',
              inputClassName,
            )}
          />
        )}
      </div>

      {open && matches.length > 0 && (
        <div className="absolute z-[200] left-0 top-full mt-1.5 w-full min-w-[300px] bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-1">
            {matches.map((c, i) => (
              <button
                key={c.email}
                type="button"
                // onMouseDown (not onClick) so it fires before the input's blur
                onMouseDown={e => { e.preventDefault(); add(c.email); }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                  i === active ? 'bg-accent/8' : 'hover:bg-bg-subtle',
                )}
              >
                <span className="w-7 h-7 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center shrink-0">
                  {initials(c.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm text-fg font-medium truncate">
                    {c.name}
                    {(c.title || c.pc) && (
                      <span className="ml-1.5 font-normal text-[12px] text-fg-muted">
                        {c.title}{c.title && c.pc ? ' · ' : ''}{c.pc}
                      </span>
                    )}
                  </span>
                  <span className="block text-[12px] text-fg-muted truncate">{c.email}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
