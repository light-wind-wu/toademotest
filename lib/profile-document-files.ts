import { z } from 'zod';
import type { ProfileDocument } from '@/lib/types';

export const PROFILE_FILE_ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg';
export const profileFileSchema = z.object({
  name: z.string().regex(/\.(pdf|docx?|png|jpe?g)$/i, 'Choose a PDF, Word, PNG or JPG file.'),
  size: z.number().min(1, 'This file is empty. Choose another file.').max(2 * 1024 * 1024, 'Choose a file no larger than 2 MB.'),
});

export async function readProfileFile(file: File): Promise<string> {
  profileFileSchema.parse({ name: file.name, size: file.size });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('The file could not be read.'));
    reader.onerror = () => reject(new Error('The file could not be read. Please select it again.'));
    reader.onabort = () => reject(new Error('Reading the file was cancelled.'));
    reader.readAsDataURL(file);
  });
}

export function downloadProfileFile(document: ProfileDocument) {
  if (!document.dataUrl || document.scanStatus !== 'demo-passed') throw new Error('This file is unavailable. Upload it again to enable downloading.');
  const encoded = document.dataUrl.split(',')[1];
  if (!encoded) throw new Error('This file could not be downloaded. Please upload it again.');
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: document.mimeType || 'application/octet-stream' }));
  const link = window.document.createElement('a');
  link.href = url; link.download = document.name;
  window.document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
