/**
 * Unified usability-test scenario reset types.
 *
 * The context is resolved from /catlog (catalog path) and the task card the
 * participant clicks. Each handler owns only the records and transient UI
 * state for its scenario.
 */

import type { UtCatalogPath, UtApplicantVariant } from '@/lib/ut-track';

export type { UtCatalogPath, UtApplicantVariant };

export type UtTaskId = number;

export type UtScenarioContext = {
  /** Catalog row selected by the facilitator in /catlog. */
  path: UtCatalogPath;
  /** 1-based task id from the briefing panel. */
  taskId: UtTaskId;
  /** Applicant intern flavour when path === 'applicant'. */
  applicantVariant?: UtApplicantVariant | null;
};

export type UtResetHandler = (context: UtScenarioContext) => void;
