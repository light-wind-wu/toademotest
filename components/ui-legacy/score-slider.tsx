'use client';

import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export interface ScoreSliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export function ScoreSlider({
  label,
  value,
  onValueChange,
  min = 0,
  max = 10,
  step = 0.5,
  disabled,
  className,
}: ScoreSliderProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-body-sm text-fg">{label}</span>
        <span className="text-body-sm font-bold text-success tabular-nums">{value.toFixed(1)}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(v: number | readonly number[]) =>
          onValueChange(Array.isArray(v) ? v[0] : v)
        }
        disabled={disabled}
      />
    </div>
  );
}
