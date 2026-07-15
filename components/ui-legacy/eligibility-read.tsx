'use client';

import { Check } from 'lucide-react';
import { REQ_TYPES } from '@/lib/data';
import type { CriteriaGroup, CriteriaRule } from '@/lib/types';

export function RuleReadRow({ rule }: { rule: CriteriaRule }) {
  return (
    <div className="flex items-start gap-2 py-0.5">
      <Check size={13} className="text-accent mt-0.5 shrink-0" />
      <span className="text-body-sm text-fg">
        <strong>{REQ_TYPES.find(t => t.key === rule.type)?.label ?? rule.type}</strong>{' '}
        {REQ_TYPES.find(t => t.key === rule.type)?.kind === 'subject-grade' ? (
          <><span className="text-fg-muted">—</span>{' '}<strong>{Array.isArray(rule.value) && rule.value.length > 0 ? rule.value.join(', ') : '—'}</strong>{' '}<span className="text-fg-muted">min grade</span>{' '}<strong>{rule.gradeValue || '—'}</strong></>
        ) : (
          <><span className="text-fg-muted">{rule.operator}</span>{' '}<strong>{Array.isArray(rule.value) ? (rule.value.length ? rule.value.join(', ') : '—') : rule.value || '—'}</strong></>
        )}
      </span>
    </div>
  );
}

export function ReqReadView({ groups }: { groups: CriteriaGroup[] }) {
  if (!groups || groups.length === 0) {
    return <p className="text-body-sm text-fg-muted italic">No requirements — all applicants are eligible.</p>;
  }
  return (
    <div className="space-y-3">
      {groups.map((group, gi) => (
        <div key={group.id}>
          {gi > 0 && (
            <div className="flex items-center gap-2 my-2">
              <div className="h-px flex-1 bg-border" />
              <span className="rounded bg-accent px-1.5 py-0.5 text-label-sm font-bold text-accent-fg">and</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-label-sm font-semibold text-accent">
                {group.matchType === 'ANY' ? 'Any of these options:' : 'All of these conditions:'}
              </p>
            </div>
            {group.matchType === 'ALL' ? (
              group.rules.length === 0
                ? <p className="text-body-sm text-fg-muted italic">Empty group</p>
                : <div className="space-y-0.5">{group.rules.map(r => <RuleReadRow key={r.id} rule={r} />)}</div>
            ) : (
              (group.pathways ?? []).length === 0
                ? <p className="text-body-sm text-fg-muted italic">No options defined</p>
                : <div className="space-y-1.5">
                    {(group.pathways ?? []).map((pathway, pi) => (
                      <div key={pathway.id}>
                        {pi > 0 && <p className="my-1 text-label-sm font-semibold text-fg-muted">or</p>}
                        <div className="border border-border/60 rounded p-2 bg-bg-subtle/40">
                          <p className="mb-1 text-label-sm font-semibold text-fg-muted">Option {pi + 1}</p>
                          {pathway.rules.length === 0
                            ? <p className="text-body-sm text-fg-muted italic">Empty option</p>
                            : pathway.rules.map(r => <RuleReadRow key={r.id} rule={r} />)}
                        </div>
                      </div>
                    ))}
                  </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
