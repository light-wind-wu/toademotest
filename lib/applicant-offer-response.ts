import offerResponseSeed from '@/data/applicant-offer-response.json';
import type { ApplicantOfferResponseDraft } from '@/lib/types';

export const APPLICANT_OFFER_RESPONSE_KEY = 'dsta_applicant_offer_response';

export const APPLICANT_OFFER_RESPONSE_SEED: ApplicantOfferResponseDraft = {
  ...offerResponseSeed,
  decision: 'accept',
};

export function loadApplicantOfferResponse(): ApplicantOfferResponseDraft {
  if (typeof window === 'undefined') return { ...APPLICANT_OFFER_RESPONSE_SEED };
  try {
    const stored = window.localStorage.getItem(APPLICANT_OFFER_RESPONSE_KEY);
    if (!stored) return { ...APPLICANT_OFFER_RESPONSE_SEED };
    return { ...APPLICANT_OFFER_RESPONSE_SEED, ...JSON.parse(stored) } as ApplicantOfferResponseDraft;
  } catch {
    return { ...APPLICANT_OFFER_RESPONSE_SEED };
  }
}

export function saveApplicantOfferResponse(response: ApplicantOfferResponseDraft) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(APPLICANT_OFFER_RESPONSE_KEY, JSON.stringify(response));
}
