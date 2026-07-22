'use client';

import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { requestRawCategory } from '@/lib/request-groups';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProjectRequest } from '@/lib/types';

interface RequestContextTableProps {
  requests: ProjectRequest[];
  title?: string;
  className?: string;
  highlightedCategory?: string;
}

function formatPeriodLabel(req: ProjectRequest): string {
  return req.calendarPeriod || '—';
}

function formatDurationLabel(req: ProjectRequest): string {
  return req.duration || '—';
}

export default function RequestContextTable({
  requests,
  title = 'Request Context',
  className,
  highlightedCategory,
}: RequestContextTableProps) {
  if (requests.length === 0) return null;

  return (
    <div className={cn('rounded-lg bg-surface', className)}>
      <p className="text-caption text-fg-muted mb-3">{title}</p>
      <Table className="min-w-[540px]">
        <TableHeader>
          <TableRow>
            <TableHead>
              <span className="inline-flex items-center gap-1">
                Intern Category
                <ArrowUpDown size={12} className="text-fg-subtle" />
              </span>
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1">
                Internship Window
                <ArrowUpDown size={12} className="text-fg-subtle" />
              </span>
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1">
                Project Duration
                <ArrowUpDown size={12} className="text-fg-subtle" />
              </span>
            </TableHead>
            <TableHead>Placements</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((req, index) => {
            const isHighlighted = highlightedCategory && highlightedCategory === requestRawCategory(req);
            return (
              <TableRow key={req.id || index} className={cn(isHighlighted && 'bg-[rgba(249,248,244,1)]')}>
                <TableCell>{requestRawCategory(req)}</TableCell>
                <TableCell>{formatPeriodLabel(req)}</TableCell>
                <TableCell>{formatDurationLabel(req)}</TableCell>
                <TableCell>
                  {req.uploaded ?? 0} of {req.placements} submitted
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
