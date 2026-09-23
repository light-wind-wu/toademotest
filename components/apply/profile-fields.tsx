'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import DatePicker from '@/components/ui-legacy/date-picker';
import { MonthPicker } from '@/components/month-picker';
import { format, isValid, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui-legacy/select';

function Field({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <label id={`${id}-label`} htmlFor={id} className="block text-body-sm font-medium text-fg">
        {label}{required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error && <p id={`${id}-error`} role="alert" className="text-body-sm text-danger">{error}</p>}
    </div>
  );
}

export function ProfileInput({ id, label, value, onChange, required, error, suggestions, ...props }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  required?: boolean; error?: string; suggestions?: readonly string[];
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id'>) {
  return (
    <Field id={id} label={label} required={required} error={error}>
      <Input {...props} id={id} value={value} onChange={(event) => onChange(event.target.value)} required={required}
        list={suggestions ? `${id}-options` : undefined} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />
      {suggestions && <datalist id={`${id}-options`}>{suggestions.map((option) => <option key={option} value={option} />)}</datalist>}
    </Field>
  );
}

export function ProfileDatePicker({ id, label, value, onChange, required, error, maxDate }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  required?: boolean; error?: string; maxDate?: string;
}) {
  return (
    <Field id={id} label={label} required={required} error={error}>
      <DatePicker id={id} value={value} onChange={onChange} maxDate={maxDate}
        placeholder="Select date" error={!!error} aria-labelledby={`${id}-label`}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />
    </Field>
  );
}

export function ProfileMonthPicker({ id, label, value, onChange, required, error, minMonth }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  required?: boolean; error?: string; minMonth?: string;
}) {
  const monthValue = (raw?: string) => {
    if (!raw) return undefined;
    const date = parse(raw, 'yyyy-MM', new Date());
    return isValid(date) && format(date, 'yyyy-MM') === raw ? { year: date.getFullYear(), month: date.getMonth() } : undefined;
  };
  return (
    <Field id={id} label={label} required={required} error={error}>
      <MonthPicker id={id} value={monthValue(value)} min={monthValue(minMonth)}
        onChange={(next) => onChange(`${String(next.year).padStart(4, '0')}-${String(next.month + 1).padStart(2, '0')}`)}
        onClear={() => onChange('')} aria-labelledby={`${id}-label`} aria-required={required} aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined} className={cn(error && 'border-danger')} />
    </Field>
  );
}

export function ProfileSelect({ id, label, value, onChange, options, required = true, error }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  options: readonly string[]; required?: boolean; error?: string;
}) {
  return (
    <Field id={id} label={label} required={required} error={error}>
      <Select value={value || null} onValueChange={(next) => onChange(next ?? '')}>
        <SelectTrigger id={id} aria-labelledby={`${id}-label`} aria-required={required} aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined} className="h-auto min-h-9 text-left">
          <SelectValue className="break-words" placeholder="Select" />
        </SelectTrigger>
        <SelectContent className="max-w-[calc(100vw-2rem)]">
          {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}
