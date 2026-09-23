# My Profile Documents Verification

Date: 2026-09-22

## Follow-up: Photo and Unified Document List

- Documents now has one upload entry and an ordered list. Legacy category-based attachments migrate in upload-date order. New uploads append; replacing a file keeps its ID and list position. Same-name uploads remain separate files.
- Profile photos support JPG/PNG selection, circular crop, drag, zoom, save, removal, and topbar synchronization. Photo saves do not submit or discard the personal-information draft.
- 102 unit tests pass, including migration, duplicate filenames, replacement order, invalid targets, independent photo persistence and failure rollback.
- Browser verification: photo selection, drag, zoom, 512 x 512 output, immediate topbar synchronization, persistence after reload, removal, and a 390 x 844 mobile crop dialog. Test photo removed afterwards.
- Browser verification of the unified document list covered its single entry and empty state; ordering and replacement are covered by unit tests. Earlier download/OS drag-and-drop limitations below remain.
- Personal information subsequently restored: Name, NRIC / FIN, Nationality, Country of birth, Date of birth, Sex, Mobile number, account Email (read-only), Residential status, and Registered address. Tests cover persistence, NRIC/date validation, legacy date normalization, and identity-scoped backfill that preserves explicit blanks. Total: 106 tests passed.

The remaining sections record the preceding categorized-document implementation and its tests.

## Scope

- Documents panel at the upper right on desktop; after Personal information on mobile.
- File selection and drop target, replacement, download and confirmed deletion.
- Optional automatic profile update followed by a full page reload.
- Browser-only file persistence. Security checks and extraction use explicitly labelled demo fixtures, not real scanning or document parsing.
- Existing submitted applications remain unchanged.

## Passed

- 97 Node tests in `tests/applicant-profile.test.cjs`.
- TypeScript: `tsc --noEmit --incremental false`.
- `git diff --check`.
- Browser: choose a PNG, upload, observe checking state and persisted filename.
- Browser: replace a file; original remains visible until successful replacement.
- Browser: opt-in transcript update changes the demo GPA from 4.6 to 4.7 and automatically reloads the page; new value appears after reload.
- Browser: unsaved profile changes show a warning and prevent automatic profile replacement.
- Browser: delete confirmation removes only the selected file.
- Desktop screenshot confirms the upper-right document panel. A 390 x 844 screenshot confirms readable, contained mobile dialog content and controls.
- Unit tests verify original download bytes and filename, metadata-only file rejection, file limits, failed replacement rollback, identity isolation, independent document saves, and preservation of unrelated fields and applications.

## Verification Limits

- The in-app browser did not report a download completion event. Actual file delivery to the browser's downloads location remains unverified; byte construction and download triggering passed unit tests.
- The drop handler is implemented with the same validation path as file selection, but an OS-to-browser drag-and-drop was not exercised.
- No production malware scanning, OCR or document extraction is implemented. The fixture applies only to the matching demo identity; unsupported identities retain their profile details.
- Maximum file size is 2 MB. Browser storage quota errors retain the previous document and profile.

## Cleanup

Uploaded test files were deleted and the demo GPA restored to 4.6. No application records were changed. No commit or push was performed.
