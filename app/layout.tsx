import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';
import { RoleProvider } from '@/lib/role';
import { ProgrammeProvider } from '@/lib/programme-context';
import { UnsavedChangesProvider } from '@/lib/unsaved-changes';

export const metadata: Metadata = {
  title: 'DSTA Talent Outreach & Acquisition Portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-zone="d-experience" data-mode="light" suppressHydrationWarning>
      <head>
        {/* Auto-reload if PRIZM CSS variables are missing (stale HMR after server restart).
            Cap reloads so a corrupted .next cache cannot loop forever — then show recovery steps. */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var KEY = 'dsta_css_reload';
            function showRecovery(){
              if (document.getElementById('dsta-dev-recovery')) return;
              var el = document.createElement('div');
              el.id = 'dsta-dev-recovery';
              el.setAttribute('role', 'alert');
              el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#f8fafc;padding:24px;font:14px/1.5 system-ui,sans-serif;color:#0f172a;z-index:99999;text-align:center;';
              el.innerHTML = '<div><p style="font-weight:600;margin-bottom:8px">Page assets failed to load</p><p style="color:#64748b;margin-bottom:16px">The dev server cache is likely stale. Stop the server, then run:<br><code style="display:inline-block;margin-top:8px;background:#e2e8f0;padding:6px 10px;border-radius:6px">npm run dev:clean</code></p></div>';
              document.body.appendChild(el);
            }
            function check(){
              var v = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
              if (v) { try { sessionStorage.removeItem(KEY); } catch (e) {} return; }
              var count = 0;
              try { count = parseInt(sessionStorage.getItem(KEY) || '0', 10); } catch (e) {}
              if (count < 2) {
                try { sessionStorage.setItem(KEY, String(count + 1)); } catch (e) {}
                window.location.reload();
                return;
              }
              showRecovery();
            }
            if(document.readyState === 'loading'){
              document.addEventListener('DOMContentLoaded', function(){ setTimeout(check, 300); });
            } else {
              setTimeout(check, 300);
            }
          })();
        `}} />
      </head>
      <body>
        <ThemeProvider>
          <RoleProvider>
            <ProgrammeProvider>
              <UnsavedChangesProvider>
                {children}
              </UnsavedChangesProvider>
            </ProgrammeProvider>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
