'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftRight, KeyRound, Moon, Sun } from 'lucide-react';
import Shell from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useRole } from '@/lib/role';
import { useTheme } from '@/lib/theme';
import { loadApplicantNotificationSettings, saveApplicantNotificationSettings } from '@/lib/applicant-settings';

export default function ApplySettings() {
  const { profile } = useRole();
  const { mode, toggle } = useTheme();
  const [recommendations, setRecommendations] = useState(false);
  const [notificationReady, setNotificationReady] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [notificationSaved, setNotificationSaved] = useState(false);
  const [emailVersion, setEmailVersion] = useState(false);

  useEffect(() => {
    setNotificationReady(false); setNotificationError(''); setNotificationSaved(false);
    try {
      setRecommendations(loadApplicantNotificationSettings(profile.email).eventsAndOpportunities);
      setNotificationReady(true);
    } catch { setNotificationError('Your notification preference could not be loaded. Please reload and try again.'); }
  }, [profile.email]);

  function changeRecommendations(checked: boolean) {
    try {
      const next = saveApplicantNotificationSettings(profile.email, { eventsAndOpportunities: checked });
      setRecommendations(next.eventsAndOpportunities); setNotificationError(''); setNotificationSaved(true);
    } catch { setNotificationError('Your preference could not be saved. Please try again.'); setNotificationSaved(false); }
  }

  return (
    <Shell activeRoute="/apply/settings">
      <div className="mx-auto max-w-7xl pb-8 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-headline-lg text-fg">Settings</h1>
          <Button variant="outline" size="sm" onClick={() => setEmailVersion((current) => !current)}>
            <ArrowLeftRight size={16} aria-hidden />{emailVersion ? 'Singpass version' : 'Email version'}
          </Button>
        </div>

        <div className="mt-8 max-w-3xl divide-y divide-border">
          <section aria-labelledby="settings-appearance" className="pb-8">
            <h2 id="settings-appearance" className="text-headline-sm text-fg">Appearance</h2>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <span className="text-body-md text-fg" id="settings-theme-label">Theme</span>
              <div role="group" aria-labelledby="settings-theme-label" className="flex gap-2">
                <Button variant={mode === 'light' ? 'solid' : 'outline'} aria-pressed={mode === 'light'} onClick={() => { if (mode !== 'light') toggle(); }}><Sun size={16} aria-hidden />Light</Button>
                <Button variant={mode === 'dark' ? 'solid' : 'outline'} aria-pressed={mode === 'dark'} onClick={() => { if (mode !== 'dark') toggle(); }}><Moon size={16} aria-hidden />Dark</Button>
              </div>
            </div>
          </section>
          <section aria-labelledby="settings-notification" className="py-8">
            <h2 id="settings-notification" className="text-headline-sm text-fg">Notification</h2>
            <div className="mt-5 flex items-start justify-between gap-4">
              <div className="min-w-0"><label id="settings-recommendations-label" htmlFor="settings-recommendations" className="text-body-md font-medium text-fg">Events and opportunities</label><p id="settings-recommendations-description" className="mt-1 text-body-sm text-fg-muted">Email updates about upcoming events and opportunities.</p></div>
              <Switch id="settings-recommendations" aria-labelledby="settings-recommendations-label" aria-describedby="settings-recommendations-description" className="mt-1" checked={recommendations} disabled={!notificationReady} onCheckedChange={changeRecommendations} />
            </div>
            {notificationError && <p role="alert" className="mt-4 text-body-sm text-danger">{notificationError}</p>}
            {notificationSaved && <p role="status" className="mt-4 text-body-sm text-success">Saved</p>}
            {emailVersion && (
              <div className="mt-6 flex items-center justify-between gap-4">
                <span className="text-body-md font-medium text-fg">Change password</span>
                <Button type="button" variant="solid" className="shrink-0">
                  <KeyRound size={16} aria-hidden />Change password
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}
