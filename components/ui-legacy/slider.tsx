'use client';

import { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  formatValue?: (v: number) => string;
  disabled?: boolean;
  className?: string;
}

export default function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue,
  disabled,
  className,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const pct = ((value - min) / (max - min)) * 100;

  const snap = useCallback((raw: number) => {
    const clamped = Math.max(min, Math.min(max, raw));
    const snapped = Math.round((clamped - min) / step) * step + min;
    return Math.round(snapped * 1e9) / 1e9; // float safety
  }, [min, max, step]);

  const valueFromEvent = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return value;
    const ratio = (clientX - rect.left) / rect.width;
    return snap(min + ratio * (max - min));
  }, [min, max, snap, value]);

  const handleTrackPointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(valueFromEvent(e.clientX));
  }, [disabled, onChange, valueFromEvent]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.buttons === 0) return;
    onChange(valueFromEvent(e.clientX));
  }, [disabled, onChange, valueFromEvent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    const delta = step;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(snap(value + delta));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(snap(value - delta));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(max);
    }
  }, [disabled, step, value, min, max, snap, onChange]);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        ref={trackRef}
        className="prizm-slider-track flex-1"
        data-disabled={disabled ? 'true' : undefined}
        onPointerDown={handleTrackPointer}
        onPointerMove={handlePointerMove}
      >
        <div className="prizm-slider-fill" style={{ width: `${pct}%` }} />
        <div
          className="prizm-slider-thumb"
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          style={{ left: `${pct}%` }}
          onKeyDown={handleKeyDown}
        />
      </div>
      {formatValue && (
        <span className="text-body-sm font-bold text-accent w-10 text-right shrink-0">
          {formatValue(value)}
        </span>
      )}
    </div>
  );
}
