'use client';

/* Ops panel: list / edit JSON / delete Supabase `app_kv` rows (demo cloud store). */
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Database,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import Button from '@/components/ui-legacy/button';
import {
  deleteCloudKv,
  listCloudKv,
  upsertCloudKv,
  type CloudKvRow,
} from '@/lib/cloud-store';
import { ensureCloudConfig, isCloudSyncEnabled } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

function summarizeValue(value: unknown): string {
  if (value == null) return 'null';
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') {
    return `Object(${Object.keys(value as object).length} keys)`;
  }
  if (typeof value === 'string') {
    return value.length > 48 ? `String(${value.length})` : JSON.stringify(value);
  }
  return String(value);
}

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function DemoDataKvPanel() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [rows, setRows] = useState<CloudKvRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureCloudConfig();
      const result = await listCloudKv();
      setEnabled(result.enabled);
      setRows(result.rows);
      if (result.error) setError(result.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load KV list');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openRow(key: string, value: unknown) {
    setExpanded(key);
    setParseError(null);
    setSavedKey(null);
    setDrafts((prev) => ({ ...prev, [key]: prettyJson(value) }));
  }

  function resetDraft(row: CloudKvRow) {
    setDrafts((prev) => ({ ...prev, [row.key]: prettyJson(row.value) }));
    setParseError(null);
    setSavedKey(null);
  }

  async function handleSave(key: string) {
    const raw = drafts[key] ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON');
      return;
    }

    setBusyKey(key);
    setError(null);
    setParseError(null);
    try {
      const result = await upsertCloudKv(key, parsed);
      if (!result.ok) {
        setError(result.error ?? 'Save failed');
        return;
      }
      const pretty = prettyJson(parsed);
      setDrafts((prev) => ({ ...prev, [key]: pretty }));
      setSavedKey(key);
      await refresh();
      setTimeout(() => setSavedKey((cur) => (cur === key ? null : cur)), 2500);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDelete(key: string) {
    setBusyKey(key);
    setError(null);
    try {
      const result = await deleteCloudKv(key);
      if (!result.ok) {
        setError(result.error ?? 'Delete failed');
        return;
      }
      setPendingDelete(null);
      if (expanded === key) setExpanded(null);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      await refresh();
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="card p-6">
      <div className="mb-1 flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <Database size={16} className="text-accent" />
        </div>
        <h2 className="text-headline-md text-fg">Demo Data KV List Management</h2>
      </div>
      <p className="mb-5 ml-11 text-body-sm text-fg-muted">
        Ops view of the Supabase <code className="text-[12px]">app_kv</code> table. Expand a key to
        edit its JSON, save, or delete the row. Delete also clears that shared key from this
        browser and from other open sessions via Realtime.
      </p>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw size={15} className={cn(loading && 'animate-spin')} />
            Refresh
          </Button>
          <span className="text-[12px] text-fg-subtle">
            {isCloudSyncEnabled() || enabled
              ? `${rows.length} key${rows.length === 1 ? '' : 's'}`
              : 'Cloud sync off'}
          </span>
        </div>

        {!enabled && !loading && (
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-bg-subtle px-3 py-2.5">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-body-sm text-fg-muted">
              Cloud sync is not configured. Set{' '}
              <code className="text-[12px]">NEXT_PUBLIC_SUPABASE_URL</code> and a publishable/anon
              key, then refresh.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2.5">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-body-sm text-fg-muted">{error}</p>
          </div>
        )}

        {enabled && (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto] gap-2 border-b border-border bg-bg-subtle px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-fg-subtle">
              <span>Key</span>
              <span>Value</span>
              <span>Updated</span>
              <span className="text-right">Actions</span>
            </div>

            {loading && (
              <p className="px-3 py-6 text-center text-body-sm text-fg-muted">Loading…</p>
            )}

            {!loading && rows.length === 0 && (
              <p className="px-3 py-6 text-center text-body-sm text-fg-muted">
                No rows in <code className="text-[12px]">app_kv</code> yet.
              </p>
            )}

            {!loading &&
              rows.map((row) => {
                const open = expanded === row.key;
                const confirming = pendingDelete === row.key;
                const draft = drafts[row.key] ?? prettyJson(row.value);
                const dirty = draft !== prettyJson(row.value);
                return (
                  <div key={row.key} className="border-b border-border last:border-b-0">
                    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          open ? setExpanded(null) : openRow(row.key, row.value)
                        }
                        className="flex min-w-0 cursor-pointer items-center gap-1.5 text-left text-body-sm font-semibold text-fg hover:text-accent"
                      >
                        {open ? (
                          <ChevronDown size={14} className="shrink-0 text-fg-muted" />
                        ) : (
                          <ChevronRight size={14} className="shrink-0 text-fg-muted" />
                        )}
                        <span className="truncate font-mono text-[13px]">{row.key}</span>
                      </button>
                      <span className="truncate text-body-sm text-fg-muted">
                        {summarizeValue(row.value)}
                      </span>
                      <span className="truncate text-[12px] text-fg-subtle">
                        {formatUpdatedAt(row.updated_at)}
                      </span>
                      <div className="flex justify-end">
                        {!confirming ? (
                          <button
                            type="button"
                            onClick={() => setPendingDelete(row.key)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-danger hover:bg-danger-bg"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={busyKey === row.key}
                              onClick={() => void handleDelete(row.key)}
                              className="cursor-pointer rounded-md bg-danger px-2 py-1 text-[12px] font-semibold text-white hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDelete(null)}
                              className="cursor-pointer rounded-md px-2 py-1 text-[12px] font-semibold text-fg-muted hover:bg-bg-subtle"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {open && (
                      <div className="space-y-2 border-t border-border bg-bg-subtle px-3 py-3">
                        <textarea
                          value={draft}
                          onChange={(e) => {
                            setDrafts((prev) => ({ ...prev, [row.key]: e.target.value }));
                            setParseError(null);
                            setSavedKey(null);
                          }}
                          spellCheck={false}
                          className={cn(
                            'min-h-64 w-full resize-y rounded-lg border bg-surface px-3 py-2 font-mono text-[11px] leading-relaxed text-fg',
                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                            parseError && expanded === row.key
                              ? 'border-danger'
                              : 'border-border',
                          )}
                        />
                        {parseError && expanded === row.key && (
                          <p className="text-[12px] text-danger">Invalid JSON: {parseError}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => void handleSave(row.key)}
                            disabled={busyKey === row.key || !dirty}
                          >
                            <Save size={14} />
                            Save JSON
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => resetDraft(row)}
                            disabled={busyKey === row.key || !dirty}
                          >
                            Reset
                          </Button>
                          {savedKey === row.key && (
                            <span className="text-body-sm font-medium text-success">Saved.</span>
                          )}
                          {dirty && (
                            <span className="text-[12px] text-fg-subtle">Unsaved changes</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
