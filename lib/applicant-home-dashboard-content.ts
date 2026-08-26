import dashboardData from '@/data/applicant-home-dashboard-scenarios.json';
import type {
  ApplicantHomeDashboardData,
  ApplicantHomeScenario,
  ApplicantHomeScenarioContent,
} from '@/lib/types';

export const APPLICANT_HOME_DASHBOARD_DATA =
  dashboardData as unknown as ApplicantHomeDashboardData;

export const APPLICANT_HOME_DASHBOARD_ASSETS =
  APPLICANT_HOME_DASHBOARD_DATA.assets;

export const APPLICANT_HOME_DASHBOARD_CONTENT =
  APPLICANT_HOME_DASHBOARD_DATA.scenarios;

export function getApplicantHomeDashboardContent(
  scenario: ApplicantHomeScenario,
): ApplicantHomeScenarioContent {
  return APPLICANT_HOME_DASHBOARD_CONTENT[scenario];
}
