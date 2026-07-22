'use client';

import AiSparkleIcon from './ai-sparkle-icon';
import { cn } from '@/lib/utils';
import { runPublicProjectCheck } from '@/lib/ai-check';

interface AiCheckBlockProps {
  title: string;
  description?: string;
  educationLevel: string;
  skills: string[];
  className?: string;
}

type AiCheckResultStatus = 'pass' | 'warn' | 'fail';

function aiCheckStatusLabel(result: AiCheckResultStatus) {
  if (result === 'pass') return 'AI checked';
  return 'AI recommend review';
}

function strongestAiCheckResult(
  results: Array<AiCheckResultStatus | undefined>,
  hasNotes = false,
): AiCheckResultStatus {
  if (results.includes('fail')) return 'fail';
  if (results.includes('warn') || hasNotes) return 'warn';
  return 'pass';
}

export default function AiCheckBlock({
  title,
  description,
  educationLevel,
  skills,
  className,
}: AiCheckBlockProps) {
  const check = runPublicProjectCheck(
    title.trim(),
    description?.trim() ?? '',
    educationLevel,
    skills,
    skills[0] ?? '',
  );
  const isScope = description !== undefined;
  const scopedNotes = isScope
    ? check.notes.filter((note) => /scope|applicant|public|sensitive|wording|intern/i.test(note))
    : check.notes.filter((note) => /title/i.test(note));
  const notes = scopedNotes.length > 0 ? scopedNotes.slice(0, 2) : check.notes.slice(0, 1);
  const result = isScope
    ? strongestAiCheckResult([check.grammar, check.publicReadiness], scopedNotes.length > 0)
    : strongestAiCheckResult([check.grammar], scopedNotes.length > 0);
  const hasIssue = result !== 'pass';
  const note = hasIssue
    ? notes[0]
    : 'Looks clear for applicant-facing use.';

  return (
    <div className={cn('mt-2 flex flex-wrap items-center gap-2', className)}>
      <span
        className={cn(
          'badge inline-flex items-center gap-1 text-caption font-normal',
          'border border-[rgba(37,99,235,0.3)] bg-[rgba(37,99,235,0.05)] text-[rgba(26,101,248,1)]',
        )}
      >
        <AiSparkleIcon size={12} />
        {aiCheckStatusLabel(result)}
      </span>
      <span className="text-body-sm text-fg-muted">{note}</span>
    </div>
  );
}
