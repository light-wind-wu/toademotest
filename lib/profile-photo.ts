import { z } from 'zod';
import { readProfileFile } from '@/lib/profile-document-files';
import type { ProfilePhotoCrop } from '@/lib/types';

export const PROFILE_PHOTO_CHANGED = 'dsta-profile-photo-changed';
export const profilePhotoFileSchema = z.object({
  name: z.string().regex(/\.(png|jpe?g)$/i, 'Choose a JPG or PNG photo.'),
  type: z.enum(['image/jpeg', 'image/png'], { error: 'Choose a JPG or PNG photo.' }),
  size: z.number().positive('This file is empty.').max(2 * 1024 * 1024, 'Choose a photo no larger than 2 MB.'),
});

async function loadImage(source: string) {
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
}

export async function readProfilePhoto(file: File) {
  profilePhotoFileSchema.parse({ name: file.name, type: file.type, size: file.size });
  const source = await readProfileFile(file);
  const image = await loadImage(source);
  if (image.naturalWidth < 64 || image.naturalHeight < 64) throw new Error('Choose a photo at least 64 by 64 pixels.');
  if (image.naturalWidth * image.naturalHeight > 24000000) throw new Error('Choose a photo smaller than 24 megapixels.');
  return source;
}

export async function cropProfilePhoto(source: string, crop: ProfilePhotoCrop) {
  const image = await loadImage(source);
  const rect = z.object({ x: z.number().min(0), y: z.number().min(0), width: z.number().positive(), height: z.number().positive() }).parse(crop);
  if (rect.x + rect.width > image.naturalWidth + 1 || rect.y + rect.height > image.naturalHeight + 1) throw new Error('Please adjust the crop and try again.');
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Photo editing is unavailable in this browser.');
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, 512, 512);
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, 512, 512);
  return canvas.toDataURL('image/jpeg', 0.85);
}
