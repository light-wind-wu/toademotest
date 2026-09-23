'use client';

import { useEffect, useState } from 'react';
import { profilePhotoSchema, profileStorageKey } from '@/lib/applicant-profile';
import { PROFILE_PHOTO_CHANGED } from '@/lib/profile-photo';

export function useProfilePhoto(email: string, enabled: boolean) {
  const [photo, setPhoto] = useState({ email: '', url: '' });
  useEffect(() => {
    function read() {
      let url = '';
      if (enabled) {
        try {
          const saved = JSON.parse(localStorage.getItem(profileStorageKey(email)) || '{}');
          const result = profilePhotoSchema.safeParse(saved.photo);
          if (result.success && (!saved.email || (saved.accountEmail ?? saved.email) === email)) url = result.data.dataUrl;
        } catch { /* Keep initials when local profile data is unavailable. */ }
      }
      setPhoto({ email, url });
    }
    read();
    window.addEventListener(PROFILE_PHOTO_CHANGED, read);
    window.addEventListener('storage', read);
    return () => { window.removeEventListener(PROFILE_PHOTO_CHANGED, read); window.removeEventListener('storage', read); };
  }, [email, enabled]);
  return enabled && photo.email === email ? photo.url : '';
}
