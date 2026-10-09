# Internship hero refresh QA — 2026-09-20

- Source: current user attachment showing left text/badge and right illustration; badge asset `/Users/jiangxiaoming/Downloads/Property 1=complete.png`.
- Implementation: in-app browser tab 1, `/join-us/student/internships`, inline screenshot 1108 × 858 CSS px; screenshot file path unavailable.
- State: initial programme listing. Same illustration reused from `public/images/dsta-internships-hero.jpg`; supplied badge copied unchanged to `public/images/dsta-internship-complete.png`.
- Typography: compact semibold heading, blue uppercase eyebrow, muted description; existing system fonts retained.
- Layout: left heading/description/badge and right centred illustration. Mobile stacks columns. Existing header, navigation and programme cards unchanged.
- Colors: semantic accent badge/eyebrow and white card; existing cream page retained.
- Images: original artwork, object-contain, no crop or generated substitutes. Completion artwork presented as an earnable badge, not an earned status.
- Content: source copy retained; links and preview buttons still present in accessibility tree.
- TypeScript and whitespace checks passed. Desktop screenshot inspected; mobile not verified.
- Full/focused comparison: screenshot and source were reviewed separately; normalized combined comparison unavailable. No claim of pixel-exact fidelity.
- final result: blocked
- Blocker: strict image-to-code same-size combined comparison not completed.

# Interview availability request QA — 2026-09-20

- Scope: annotated alternate-timeslot card and submission feedback only; existing fixed slots preserved.
- Source: user's additional reference screenshot in this conversation (1015 × 927 px); no local source path supplied.
- Implementation: in-app browser tab 8, `/apply/dashboard`, inline screenshots at 884 × 859 CSS px. Local screenshot path and capture density unavailable.
- States inspected: alternate request selected, empty textarea, submission success dialog, pending-confirmation dashboard.
- Typography: existing system font and PRIZM form typography retained; readable label, helper and multiline placeholder.
- Layout: white bordered rounded card, right-aligned radio, full-width textarea, persistent footer. Existing sheet dimensions retained; source viewport differs.
- Colors: semantic surface, border, muted text, danger required marker and accent radio; blue card fill removed.
- Assets: no new raster assets required for this scoped form; existing library radio/icon retained.
- Copy: reference label, explanatory copy and helper implemented. CTA intentionally changed to Submit Request to distinguish requesting from confirming a fixed slot.
- Functional evidence: whitespace-only submission disabled; valid text enabled submission; success dialog displayed exact entered availability and explicitly said interview not confirmed. Done returned to pending dashboard showing exact entered availability and awaiting team response.
- TypeScript check passed. Fixed-slot confirmation was not submitted during QA to avoid changing the applicant to confirmed.
- Full-view/focused comparison: source and rendered card reviewed separately, not normalized into a combined image. Strict same-viewport comparison unavailable in this run; mobile untested.
- Comparison history: first rendered card shows requested white surface and textarea, and success flow reaches pending state without navigating to proposed-timeslot route.
- final result: blocked
- Blocker: strict image-to-code combined, density-normalized visual comparison remains incomplete. Functional checks above are not a substitute for that gate.

# Student programme entry visual QA — 2026-09-20

- Source visual truth: `/Users/jiangxiaoming/Downloads/image 3139.jpg`, user attachment, 2048 × 1117 pixels.
- Implementation: `/join-us/student`; in-app browser tab 4, inline screenshot at 1292 × 994. Screenshot file path unavailable.
- State: initial four-card entry page. Full-view evidence inspected against the supplied image, but not combined at identical viewport/density; strict image-to-code comparison remains blocked.
- Fonts/typography: repository system font; large two-line heading and lighter card headings. Reduced card text at the inspected width to prevent excessive wrapping.
- Spacing/layout: four equal desktop columns, two columns at smaller widths and one at mobile widths in code; mobile not browser verified.
- Colors/tokens: semantic cream page, white cards, warning accent and dark header. Header uses the existing foreground token, not the reference charcoal.
- Image quality: existing local DSTA white logo; library icons rather than generated or hand-drawn assets.
- Copy/content: supplied heading, descriptions and all four programme names retained. Only the internship card is a link; other Explore More labels are presentation only as requested.
- Interaction evidence: accessibility tree shows exactly one link; clicking it navigated to `/join-us/student/internships` with heading `Choose an internship that fits`. Returned to entry page for preview.
- Checks: TypeScript and whitespace checks passed.
- Comparison history: first capture showed white page background and cramped card text; changed to bg-bg and reduced the desktop card type scale. Second capture confirms cream background and readable cards.
- Findings: no observed functional blocker. Pixel-normalized combined comparison and mobile browser verification remain unperformed.
- final result: blocked

Strict fidelity sign-off is blocked by missing same-viewport combined capture. Entry implementation and primary navigation are available for review.

---

# Education HTML visual QA

- Source visual truth: `/private/tmp/education-base.png` (Figma `2777:52339`, 1440 × 900) and `/private/tmp/education-manual.png` (Figma `2780:58602`, 1440 × 1524); the browser-comment screenshots of the existing `/apply/education` page are the layout baseline.
- Implementation: `http://127.0.0.1:3000/apply-education.html`; in-app browser tab `5`, screenshot captured inline at 1108 × 858 CSS pixels. The browser screenshot was not materialized as a local file by the available capture tool. Device pixel ratio was not reported, so pixel-density normalization was not possible.
- States inspected: empty upload form and expanded manual education details. The submitted/file-extraction state was compared structurally against the Figma reference; no real document was uploaded during QA.
- Full-view comparison: the existing page's top bar, six-step rail, heading, two upload cards, manual-entry affordance, and sticky footer remain in the same hierarchy. The HTML reflects the current page's copy rather than the older Figma's programme banner and upload-button labels.
- Focused region comparison: the transcript upload icon uses the exported Figma SVG; the qualification/details grid and grades table use the second Figma node. Required field markers were checked after the initial pass and completed for every field gating Next.
- Fonts and typography: system/Inter fallback, hierarchy and line wrapping are consistent with the existing page at the inspected viewport.
- Spacing/layout: both upload cards and persistent footer fit at 1108 × 858. The manual fields extend below the fold and remain scrollable.
- Colors/tokens: local enterprise-light variables mirror the existing DSTA page. No external font or CDN is loaded.
- Image quality: DSTA logo, completed-step icon, and upload icon use existing or Figma-exported local assets.
- Copy/content: the upload constraints, manual-entry CTA, and education fields are present. An uploaded transcript prefill is explicitly marked as example prototype data, not a parsed real document.
- Interactions: manual-entry expansion, required-field gating, draft persistence, file type/size validation, and Next's prototype-only feedback were inspected. Chrome console error log was empty. The standalone HTML does not submit to the React application.
- Comparison history: the first empty-state inspection revealed the cards extended beyond the 858px viewport; vertical card/zone spacing was reduced. A subsequent manual-state inspection exposed missing required markers; those markers were added. The revised empty and manual views were inspected in the in-app browser.
- Findings: no remaining observed P0/P1/P2 visual or interaction issue at the inspected desktop viewport. A same-viewport saved image comparison and a real document-upload interaction remain unverified.
- Implementation checklist: if pixel-level Figma sign-off is required, export a browser screenshot at 1440 × 900 and repeat side-by-side comparison; optionally validate a real PDF/DOC upload.
- final result: blocked

Blocker: the browser capture is viewable inline but could not be saved to a local screenshot path, and the source/implementation viewport and density could not be fully normalized for the prescribed visual comparison.
