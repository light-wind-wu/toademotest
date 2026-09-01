import offerPeriodSeed from '@/data/applicant-offer-period.json';
import type { ApplicantOfferPeriod } from '@/lib/types';

export const APPLICANT_OFFER_PERIOD_KEY = 'dsta_applicant_offer_period';

export const APPLICANT_OFFER_PERIOD_SEED = offerPeriodSeed satisfies ApplicantOfferPeriod;

export function loadApplicantOfferPeriod(): ApplicantOfferPeriod {
  if (typeof window === 'undefined') return { ...APPLICANT_OFFER_PERIOD_SEED };
  try {
    const stored = window.localStorage.getItem(APPLICANT_OFFER_PERIOD_KEY);
    if (!stored) return { ...APPLICANT_OFFER_PERIOD_SEED };
    const parsed = JSON.parse(stored) as Partial<ApplicantOfferPeriod>;
    if (parsed.applicantSubmitted !== true) return { ...APPLICANT_OFFER_PERIOD_SEED };
    return { ...APPLICANT_OFFER_PERIOD_SEED, ...parsed } as ApplicantOfferPeriod;
  } catch {
    return { ...APPLICANT_OFFER_PERIOD_SEED };
  }
}

export function saveApplicantOfferPeriod(period: ApplicantOfferPeriod) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(APPLICANT_OFFER_PERIOD_KEY, JSON.stringify(period));
}
