'use client';

/* Shared Singpass profile field grid + tip — used by account-setup and personal-details edit. */
import { type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { isValidNric, type MyinfoProfile } from '@/lib/myinfo';
import { cn } from '@/lib/utils';

export const CONTACT_INPUT =
  'text-[14px] font-normal leading-none text-[rgba(15,23,42,1)] placeholder:text-[rgba(15,23,42,0.45)]';

export function isSingpassPersonalIncomplete(profile: MyinfoProfile): boolean {
  return (
    !profile.name.trim() ||
    !profile.dateOfBirth.trim() ||
    !profile.nationality.trim() ||
    !profile.residentialStatus.trim() ||
    !profile.registeredAddress.trim()
  );
}

export function TipBanner({ children, tall }: { children: ReactNode; tall?: boolean }) {
  return (
    <div
      className={cn(
        'flex gap-2.5 rounded-md border border-[rgba(230,225,216,1)] px-3',
        tall
          ? 'items-center py-3 max-lg:h-[109px] lg:h-12 lg:py-0'
          : 'h-12 items-center',
      )}
      style={{
        marginTop: 24,
        marginBottom: 16,
        background:
          'linear-gradient(0deg, #F3EFE5, #F3EFE5), linear-gradient(0deg, #F9F8F4, #F9F8F4)',
      }}
    >
      <Info
        className="size-4 shrink-0"
        strokeWidth={1.5}
        style={{ color: 'rgba(22, 33, 51, 1)' }}
        aria-hidden
      />
      <p
        style={{
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '20.3px',
          color: 'rgba(22, 33, 51, 1)',
        }}
      >
        {children}
      </p>
    </div>
  );
}

export function VerifiedField({
  label,
  value,
  editing,
  invalid,
  onChange,
  maxLength,
  placeholder,
  inputType = 'text',
}: {
  label: string;
  value: string;
  editing: boolean;
  invalid?: boolean;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
  inputType?: 'text' | 'email';
}) {
  return (
    <div>
      <p
        style={{
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '20px',
          color: 'rgba(69, 85, 108, 1)',
        }}
      >
        {label}
      </p>
      {editing ? (
        <Input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            'mt-1 h-9 rounded-md',
            CONTACT_INPUT,
            invalid && 'border-warning focus-visible:outline-warning',
          )}
        />
      ) : (
        <p
          className={cn(
            'mt-0.5 text-[14px] leading-5 font-semibold lg:font-medium',
            invalid ? 'text-warning' : 'text-[rgba(15,23,43,1)]',
          )}
        >
          {value.trim() || '—'}
        </p>
      )}
    </div>
  );
}

export function ProfileFields({
  personal,
  nric,
  mobile,
  email,
  editing,
  showErrors,
  onChange,
  onNricChange,
  onMobileChange,
  onEmailChange,
}: {
  personal: MyinfoProfile;
  nric: string;
  mobile: string;
  email: string;
  editing: boolean;
  showErrors?: boolean;
  onChange: (patch: Partial<MyinfoProfile>) => void;
  onNricChange: (v: string) => void;
  onMobileChange: (v: string) => void;
  onEmailChange: (v: string) => void;
}) {
  const divider = (
    <div className="flex shrink-0 items-center" aria-hidden>
      <span
        className="block w-px"
        style={{ height: 40, background: 'rgba(231, 228, 221, 1)' }}
      />
      <span className="block w-4" />
    </div>
  );

  const personalField = (
    label: string,
    key: keyof Pick<
      MyinfoProfile,
      'name' | 'dateOfBirth' | 'nationality' | 'residentialStatus' | 'registeredAddress'
    >,
  ) => (
    <VerifiedField
      label={label}
      value={personal[key]}
      editing={editing}
      invalid={showErrors && !personal[key].trim()}
      onChange={(v) => onChange({ [key]: v })}
    />
  );

  return (
    <>
      {/* Mobile — 2 columns + vertical rule */}
      <div className="grid grid-cols-2 gap-y-6 lg:hidden" style={{ rowGap: 24 }}>
        <div className="border-r pr-4" style={{ borderColor: 'rgba(231, 228, 221, 1)' }}>
          {personalField('Name', 'name')}
        </div>
        <div className="pl-4">{personalField('Date of birth', 'dateOfBirth')}</div>
        <div className="border-r pr-4" style={{ borderColor: 'rgba(231, 228, 221, 1)' }}>
          {personalField('Nationality', 'nationality')}
        </div>
        <div className="pl-4">{personalField('Residential status', 'residentialStatus')}</div>
        <div className="col-span-2 border-b pb-6" style={{ borderColor: 'rgba(231, 228, 221, 1)' }}>
          {personalField('Requested address', 'registeredAddress')}
        </div>
        <div className="border-r pr-4" style={{ borderColor: 'rgba(231, 228, 221, 1)' }}>
          <VerifiedField
            label="NRIC / FIN"
            value={nric}
            editing={editing}
            invalid={showErrors && (!nric.trim() || !isValidNric(nric))}
            onChange={(v) => onNricChange(v.toUpperCase())}
            maxLength={9}
            placeholder="e.g. S1234567A"
          />
        </div>
        <div className="pl-4">
          <VerifiedField
            label="Mobile Number"
            value={mobile}
            editing={editing}
            invalid={showErrors && !mobile.trim()}
            onChange={onMobileChange}
          />
        </div>
        <div className="col-span-2">
          <VerifiedField
            label="Email"
            value={email}
            editing={editing}
            invalid={showErrors && !email.trim()}
            onChange={onEmailChange}
            inputType="email"
          />
        </div>
      </div>

      {/* PC — 3 columns; divider + 16px gap; 24px row gap */}
      <div className="hidden lg:flex lg:flex-col" style={{ gap: 24 }}>
        <div className="flex items-start">
          <div className="min-w-0 flex-1">{personalField('Name', 'name')}</div>
          {divider}
          <div className="min-w-0 flex-1">{personalField('Date of birth', 'dateOfBirth')}</div>
          {divider}
          <div className="min-w-0 flex-1">{personalField('Nationality', 'nationality')}</div>
        </div>
        <div className="flex items-start">
          <div className="min-w-0 flex-1">{personalField('Residential status', 'residentialStatus')}</div>
          {divider}
          <div className="min-w-0 flex-1">{personalField('Requested address', 'registeredAddress')}</div>
          {divider}
          <div className="min-w-0 flex-1">
            <VerifiedField
              label="NRIC / FIN"
              value={nric}
              editing={editing}
              invalid={showErrors && (!nric.trim() || !isValidNric(nric))}
              onChange={(v) => onNricChange(v.toUpperCase())}
              maxLength={9}
              placeholder="e.g. S1234567A"
            />
          </div>
        </div>
        <div className="flex items-start">
          <div className="min-w-0 flex-1">
            <VerifiedField
              label="Mobile Number"
              value={mobile}
              editing={editing}
              invalid={showErrors && !mobile.trim()}
              onChange={onMobileChange}
            />
          </div>
          {divider}
          <div className="min-w-0 flex-1">
            <VerifiedField
              label="Email"
              value={email}
              editing={editing}
              invalid={showErrors && !email.trim()}
              onChange={onEmailChange}
              inputType="email"
            />
          </div>
          <div className="flex shrink-0 items-center" aria-hidden>
            <span className="block w-px opacity-0" style={{ height: 40 }} />
            <span className="block w-4" />
          </div>
          <div className="min-w-0 flex-1" />
        </div>
      </div>
    </>
  );
}
