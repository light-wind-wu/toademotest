/* AI-specific colour tokens used across the TOA app.
   These are not part of the PRIZM design system; they come from the
   product-specific Figma specs for AI badges and AI-suggest buttons. */

export const AI_COLOURS = {
  /** "Suggest with AI" outline button. */
  suggestButton:
    'border-[rgba(37,99,235,0.3)] bg-[rgba(37,99,235,0.05)] text-[rgba(26,101,248,1)] hover:bg-[rgba(37,99,235,0.1)]',

  /** AI quality-check: passed. */
  checkPass: {
    badge: 'bg-[rgba(0,201,80,0.1)]',
    label:
      'bg-gradient-to-r from-[#1A65F8] to-[#008236] bg-clip-text text-transparent',
  },

  /** AI quality-check: needs review (warn or fail). */
  checkReview: {
    badge: 'bg-[rgba(254,154,0,0.15)] text-[rgba(187,77,0,1)]',
  },
} as const;
