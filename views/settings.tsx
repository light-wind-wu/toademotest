'use client';

import { useState } from 'react';
import Shell from '@/components/layout/shell';
import { useTheme } from '@/lib/theme';
import { useRole, ROLE_LABELS } from '@/lib/role';
import { Moon, Sun, User } from 'lucide-react';


function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="text-headline-md text-fg mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { mode, toggle } = useTheme();
  const { role, profile } = useRole();


  return (
    <Shell activeRoute="/settings">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-headline-lg text-fg mb-1">Settings</h1>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-12 gap-4">

        {/* Profile — left half */}
        <div className="col-span-12 lg:col-span-6">
          <Card title="Profile">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center shrink-0">
                <span className="text-headline-md font-bold text-accent-fg">{profile.initials}</span>
              </div>
              <div>
                <p className="text-body-lg font-bold text-fg">{profile.name}</p>
                <p className="text-body-sm text-fg-muted">{profile.email}</p>
                <p className="text-body-sm text-fg-subtle mt-0.5">{ROLE_LABELS[role]} · DSTA</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-label-sm text-fg-muted block mb-1.5">Display Name</label>
                <input className="input" value={profile.name} readOnly />
              </div>
              <div>
                <label className="text-label-sm text-fg-muted block mb-1.5">Email</label>
                <input className="input" value={profile.email} readOnly />
              </div>
            </div>
            <p className="text-body-sm text-fg-subtle mt-3 flex items-center gap-1.5">
              <User size={13} />
              Profile details are managed through HR systems. Contact IT to make changes.
            </p>
          </Card>
        </div>

        {/* Appearance — left half */}
        <div className="col-span-12 lg:col-span-6">
          <Card title="Appearance">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-bg-subtle rounded-lg flex items-center justify-center">
                  {mode === 'dark' ? <Moon size={18} className="text-accent" /> : <Sun size={18} className="text-accent" />}
                </div>
                <div>
                  <p className="text-body-md font-semibold text-fg">Dark Mode</p>
                  <p className="text-body-sm text-fg-muted mt-0.5">
                    {mode === 'dark' ? 'Dark theme active' : 'Light theme active'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggle}
                className={`relative w-11 h-6 rounded-full border-none cursor-pointer transition-colors shrink-0 ${mode === 'dark' ? 'bg-accent' : 'bg-border-strong'}`}
                aria-pressed={mode === 'dark'}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${mode === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </Card>
        </div>


      </div>
    </Shell>
  );
}
