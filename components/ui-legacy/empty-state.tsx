import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState as PrizmEmptyState } from '@/components/ui/empty-state';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const iconSize = size === 'sm' ? 20 : 24;
  return (
    <PrizmEmptyState
      icon={Icon ? <Icon size={iconSize} /> : undefined}
      title={title}
      description={description}
      action={action}
      className={cn(size === 'sm' ? 'py-16' : 'py-20', className)}
    />
  );
}

export { EmptyState };
