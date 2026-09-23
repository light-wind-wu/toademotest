'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Loader2, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { saveProfileDocument } from '@/lib/applicant-profile';
import { downloadProfileFile, PROFILE_FILE_ACCEPT, profileFileSchema, readProfileFile } from '@/lib/profile-document-files';
import type { ApplicantEditableProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

const pause = () => new Promise((resolve) => setTimeout(resolve, 650));

export default function ProfileDocuments({ profile, dirty, onSaved }: {
  profile: ApplicantEditableProfile; dirty: boolean;
  onSaved: (next: ApplicantEditableProfile, refresh: boolean) => void;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [updateProfile, setUpdateProfile] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const operation = useRef(0);
  const busy = !!stage;
  useEffect(() => () => { operation.current += 1; }, []);

  function open() {
    setUploadOpen(true); setFile(null); setUpdateProfile(false); setDragging(false); setError(''); setNotice('');
  }
  function select(files: File[]) {
    setDragging(false); setError(''); setFile(null);
    if (files.length !== 1) { setError('Choose one file at a time.'); return; }
    const result = profileFileSchema.safeParse({ name: files[0].name, size: files[0].size });
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setFile(files[0]);
  }
  async function upload() {
    if (!file || !uploadOpen || busy) return;
    if (updateProfile && dirty) { setError('Save or cancel your profile changes before updating from a document.'); return; }
    const token = ++operation.current;
    setError(''); setStage('Reading file...');
    try {
      const dataUrl = await readProfileFile(file);
      if (operation.current !== token) return;
      setStage('Checking file (demo)...'); await pause();
      if (operation.current !== token) return;
      if (updateProfile) {
        setStage('Updating profile (demo)...'); await pause();
        if (operation.current !== token) return;
      }
      const next = saveProfileDocument(profile.accountEmail ?? profile.email, profile.fullName, null, {
        name: file.name, size: file.size, mimeType: file.type, dataUrl,
        uploadedAt: new Date().toISOString(), scanStatus: 'demo-passed',
      }, updateProfile);
      setStage(''); setUploadOpen(false); setFile(null);
      setNotice(updateProfile ? 'Profile updated. Refreshing...' : 'File saved.');
      onSaved(next, updateProfile);
    } catch {
      if (operation.current !== token) return;
      setStage(''); setError('The file or profile update could not be saved. Existing files and profile details are unchanged. Try a smaller file or try again.');
    }
  }
  function remove() {
    if (!removeId) return;
    try {
      const next = saveProfileDocument(profile.accountEmail ?? profile.email, profile.fullName, removeId, null);
      onSaved(next, false); setRemoveId(null); setNotice('File deleted.'); setError('');
    } catch { setError('The file could not be deleted. Please try again.'); }
  }

  return (
    <>
      <section aria-labelledby="profile-documents" className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="profile-documents" className="text-headline-sm text-fg">Documents</h2>
          <Button variant="outline" size="sm" onClick={() => open()}><Upload size={14} aria-hidden />Upload</Button>
        </div>
        {!profile.documents.length && <p className="mt-5 text-body-sm text-fg-muted">No files uploaded</p>}
        <div className="divide-y divide-border">
          {profile.documents.map((document) => {
            return <div key={document.id} className="py-5 last:pb-0">
                <p className="mt-2 flex items-start gap-2 text-body-sm text-fg-muted"><FileText size={16} className="mt-0.5 shrink-0" aria-hidden /><span className="min-w-0 break-all">{document.name}</span></p>
                <p className="mt-1 text-body-xs text-fg-muted">{document.size ? `${Math.ceil(document.size / 1024)} KB · ` : ''}{new Date(document.uploadedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p className="mt-1 text-body-xs text-fg-muted">{document.dataUrl ? 'Check complete (demo)' : 'Upload again to enable downloading'}</p>
                <div className="mt-2 flex items-center gap-1">
                  <Button variant="ghost" size="icon" aria-label={`Download ${document.name}`} title="Download file" disabled={!document.dataUrl || document.scanStatus !== 'demo-passed'} onClick={() => { try { downloadProfileFile(document); setError(''); } catch { setError('This file is unavailable. Please upload it again.'); } }}><Download size={16} /></Button>
                  <Button variant="ghost" size="icon" className="text-danger" aria-label={`Delete ${document.name}`} title="Delete file" onClick={() => { setError(''); setRemoveId(document.id); }}><Trash2 size={16} /></Button>
                </div>
            </div>;
          })}
        </div>
        {notice && <p role="status" className="mt-4 text-body-sm text-success">{notice}</p>}
        {error && !uploadOpen && !removeId && <p role="alert" className="mt-4 text-body-sm text-danger">{error}</p>}
      </section>

      <Dialog open={uploadOpen} onOpenChange={(value) => { if (!value && !busy) { setUploadOpen(false); setFile(null); setError(''); } }}>
        <DialogContent showCloseButton={false} className="w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>PDF, Word, PNG or JPG. Maximum file size: 2 MB.</DialogDescription>
          <div className={cn('rounded-lg border-2 border-dashed p-6 text-center', dragging ? 'border-accent bg-bg-subtle' : 'border-border')}
            onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
            onDrop={(event) => { event.preventDefault(); if (!busy) select(Array.from(event.dataTransfer.files)); }}>
            <Upload size={24} className="mx-auto mb-3 text-fg-muted" aria-hidden />
            <p className="mb-3 text-body-sm text-fg-muted">Drag and drop a file here</p>
            <input ref={inputRef} type="file" className="sr-only" tabIndex={-1} accept={PROFILE_FILE_ACCEPT} aria-label="Choose document file" disabled={busy} onChange={(event) => { if (event.target.files?.length) select(Array.from(event.target.files)); event.target.value = ''; }} />
            <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>Choose file</Button>
          </div>
          {file && <div className="flex items-start justify-between gap-3 text-body-sm"><div className="min-w-0"><p className="break-all font-medium">{file.name}</p><p className="text-fg-muted">{Math.ceil(file.size / 1024)} KB</p></div><Button variant="ghost" size="icon" title="Remove selected file" aria-label="Remove selected file" disabled={busy} onClick={() => setFile(null)}><X size={16} /></Button></div>}
          <div>
            <label className="flex items-start gap-3 text-body-sm font-medium"><Checkbox checked={updateProfile} onCheckedChange={(value) => setUpdateProfile(value)} disabled={busy} className="mt-0.5" />Update my profile using this document</label>
            <p className="mt-2 text-body-sm text-fg-muted">Extracted information will replace matching profile details. The page will refresh once the update is complete.</p>
          </div>
          {updateProfile && dirty && <p role="alert" className="text-body-sm text-warning">You have unsaved profile changes. Save or cancel them first, or upload without updating your profile.</p>}
          {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
          {busy && <p role="status" className="flex items-center gap-2 text-body-sm text-fg-muted"><Loader2 size={16} className="animate-spin" aria-hidden />{stage}</p>}
          <DialogFooter><Button variant="outline" disabled={busy} onClick={() => { setUploadOpen(false); setFile(null); setError(''); }}>Cancel</Button><Button disabled={!file || busy || (updateProfile && dirty)} onClick={upload}>{busy ? 'Processing...' : 'Upload'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeId} onOpenChange={(value) => { if (!value) { setRemoveId(null); setError(''); } }}>
        <DialogContent showCloseButton={false} className="w-[calc(100%-2rem)]">
          <DialogTitle>Delete this file?</DialogTitle>
          <DialogDescription>This removes the file from My Profile. Profile details and documents in submitted applications will not change. You can upload the file again.</DialogDescription>
          {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
          <DialogFooter><Button variant="outline" onClick={() => { setRemoveId(null); setError(''); }}>Keep file</Button><Button variant="danger" onClick={remove}>Delete file</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
