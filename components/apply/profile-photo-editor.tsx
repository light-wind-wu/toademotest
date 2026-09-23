'use client';

import { useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Camera, Loader2, Minus, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { saveProfilePhoto } from '@/lib/applicant-profile';
import { cropProfilePhoto, PROFILE_PHOTO_CHANGED, profilePhotoFileSchema, readProfilePhoto } from '@/lib/profile-photo';
import type { ApplicantEditableProfile, ProfilePhotoCrop } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function ProfilePhotoEditor({ profile, initials, onSaved }: {
  profile: ApplicantEditableProfile; initials: string; onSaved: (next: ApplicantEditableProfile) => void;
}) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<ProfilePhotoCrop | null>(null);
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const operation = useRef(0);
  useEffect(() => () => { operation.current++; }, []);

  function edit() {
    setSource(profile.photo?.dataUrl ?? ''); setCrop({ x: 0, y: 0 }); setZoom(1); setArea(null);
    setRemove(false); setError(''); setDragging(false); setNotice(''); setOpen(true);
  }
  async function select(files: File[]) {
    setDragging(false); setError('');
    if (files.length !== 1) { setError('Choose one photo at a time.'); return; }
    const file = files[0];
    const parsed = profilePhotoFileSchema.safeParse({ name: file.name, type: file.type, size: file.size });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    const token = ++operation.current;
    setBusy('Checking photo (demo)...');
    try {
      const next = await readProfilePhoto(file);
      if (token !== operation.current) return;
      setSource(next); setCrop({ x: 0, y: 0 }); setZoom(1); setArea(null); setRemove(false);
    } catch (cause) {
      if (token === operation.current) setError(cause instanceof Error && cause.message.startsWith('Choose') ? cause.message : 'This photo could not be opened. Choose another JPG or PNG.');
    } finally { if (token === operation.current) setBusy(''); }
  }
  async function save() {
    if (busy || (!remove && (!source || !area))) return;
    const token = ++operation.current;
    setError(''); setBusy('Saving photo...');
    try {
      const photo = remove ? null : { dataUrl: await cropProfilePhoto(source, area!), updatedAt: new Date().toISOString() };
      if (token !== operation.current) return;
      const next = saveProfilePhoto(profile.accountEmail ?? profile.email, profile.fullName, photo);
      onSaved(next); window.dispatchEvent(new Event(PROFILE_PHOTO_CHANGED));
      setOpen(false); setNotice(remove ? 'Photo removed.' : 'Photo saved.');
    } catch { if (token === operation.current) setError('Your photo could not be saved. The previous photo is unchanged. Please try again.'); }
    finally { if (token === operation.current) setBusy(''); }
  }

  return <>
    <button type="button" aria-label="Edit profile photo" title="Edit profile photo" onClick={edit} className="relative size-12 shrink-0 rounded-full bg-accent text-body-lg font-semibold text-accent-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
      {profile.photo ? <img src={profile.photo.dataUrl} alt="Profile photo" className="size-full rounded-full object-cover" /> : initials}
      <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border border-border bg-surface text-fg"><Camera size={14} aria-hidden /></span>
    </button>
    <span role="status" className="sr-only">{notice}</span>
    <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
      <DialogContent showCloseButton={false} className="w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto data-[starting-style]:scale-100 data-[ending-style]:scale-100">
        <DialogTitle>Edit profile photo</DialogTitle>
        <DialogDescription>JPG or PNG, up to 2 MB. Drag to reposition and zoom to crop.</DialogDescription>
        <div onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); if (!busy) void select(Array.from(event.dataTransfer.files)); }}
          className={cn('relative aspect-square w-full overflow-hidden rounded-lg bg-bg-subtle', dragging && 'outline outline-2 outline-accent')}>
          {source ? <Cropper image={source} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setArea(pixels)} zoomWithScroll={false} keyboardStep={5}
            onInteractionStart={() => setError('')} style={{ containerStyle: { background: 'var(--prizm-color-bg-subtle)' } }} />
            : <div className="flex h-full flex-col items-center justify-center gap-4 p-6"><span className="flex size-24 items-center justify-center rounded-full bg-accent text-3xl text-accent-fg">{initials}</span><p className="text-center text-body-sm text-fg-muted">{remove ? 'Photo will be removed when saved.' : 'Drop a photo here or choose a file.'}</p></div>}
          {busy && <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80"><Loader2 className="animate-spin text-accent" size={24} aria-label={busy} /></div>}
        </div>
        {source && <div className="flex items-center gap-3"><Minus size={16} aria-hidden /><Slider aria-label="Photo zoom" min={1} max={3} step={0.01} value={zoom} onValueChange={(value) => setZoom(Array.isArray(value) ? value[0] : value)} disabled={!!busy} /><Plus size={16} aria-hidden /></div>}
        <input ref={input} className="sr-only" tabIndex={-1} type="file" accept="image/jpeg,image/png" aria-label="Choose profile photo" disabled={!!busy} onChange={(event) => { if (event.target.files?.length) void select(Array.from(event.target.files)); event.target.value = ''; }} />
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="outline" size="sm" disabled={!!busy} onClick={() => input.current?.click()}><Upload size={16} aria-hidden />{source ? 'Change photo' : 'Choose photo'}</Button>
          {(profile.photo || source) && !remove && <Button variant="ghost" size="sm" className="text-danger" disabled={!!busy} onClick={() => { setSource(''); setArea(null); setRemove(!!profile.photo); }}><Trash2 size={16} aria-hidden />Remove photo</Button>}
        </div>
        <p className="text-body-xs text-fg-muted">Photo checks are simulated in this demo. Photos stay in this browser.</p>
        {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
        <DialogFooter><Button variant="outline" disabled={!!busy} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!!busy || (!remove && (!source || !area))} onClick={save}>{busy || 'Save photo'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
