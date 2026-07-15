import { Badge as PrizmBadge, type BadgeProps as PrizmBadgeProps } from '@/components/ui/badge';
import { toEducationLevel } from '@/lib/data';
import type { ProgStatus, EducationLevel, AppStatus } from '@/lib/types';
import type { HTMLAttributes } from 'react';

export type BadgeVariant =
  | PrizmBadgeProps['variant']
  | 'status-active'
  | 'status-completed'
  | 'status-draft'
  | 'status-open'
  | 'status-closed'
  | 'status-upcoming'
  | 'category'
  | 'category-outline'
  | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

function mapVariant(variant?: BadgeVariant): PrizmBadgeProps['variant'] {
  switch (variant) {
    case 'status-active':
    case 'status-open':
      return 'success';
    case 'status-completed':
    case 'category':
      return 'info';
    case 'status-draft':
    case 'status-closed':
    case 'neutral':
      return 'subtle';
    case 'status-upcoming':
      return 'warning';
    case 'category-outline':
      return 'outline';
    default:
      return variant as PrizmBadgeProps['variant'];
  }
}

export function Badge({ variant, className, children, ...props }: BadgeProps) {
  return (
    <PrizmBadge variant={mapVariant(variant)} className={className} {...props}>
      {children}
    </PrizmBadge>
  );
}

export function StatusBadge({ status }: { status: ProgStatus }) {
  const variant = ({
    Active: 'status-active',
    Completed: 'status-completed',
    Draft: 'status-draft',
  } as const)[status];
  return <Badge variant={variant}>{status}</Badge>;
}

export function StatusDot({ status }: { status: ProgStatus }) {
  const tone = ({
    Active: 'text-success',
    Completed: 'text-info',
    Draft: 'text-fg-muted',
  } as const)[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-normal text-fg">
      <span aria-hidden="true" className={tone}>•</span>
      {status}
    </span>
  );
}

export function AppStatusBadge({ status }: { status: AppStatus }) {
  const variant = ({
    Open: 'status-open',
    Closed: 'status-closed',
  } as const)[status];
  return (
    <Badge variant={variant} className="text-caption font-normal">
      {status}
    </Badge>
  );
}

const INTERN_CATEGORY_SHORT: Record<string, string> = {
  'Undergraduate Scholar/Merit Scholar': 'UG Scholar/Merit',
  'Undergraduate Student': 'UG Student',
  'Junior College Scholar/Junior College Student': 'JC Scholar/Student',
  'Polytechnic Scholar/Polytechnic Student': 'Poly Scholar/Student',
  'Post Junior College/Post Polytechnic Student': 'Post JC/Post Poly',
  'Young Defence Scientist Programme': 'YDSP',
};

export function CategoryBadge({ category }: { category: EducationLevel | string }) {
  const label = toEducationLevel(category);
  const displayLabel = INTERN_CATEGORY_SHORT[label] ?? label;
  return (
    <span className="flex flex-wrap gap-1">
      <Badge variant="category-outline" className="text-caption font-normal">
        {displayLabel}
      </Badge>
    </span>
  );
}
