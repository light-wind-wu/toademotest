import type { Programme, IntakeWindow } from './types';
import { deriveAppStatus } from './utils';

/** A programme intake, normalised so every programme exposes at least one. Programmes
 *  created before the multi-intake wizard carry only a single legacy application
 *  window (appOpen/appDeadline + start/end) — we surface that as one synthesised
 *  intake so the UI can treat every programme uniformly. */
export interface NormalisedIntake {
  id:       string;
  appOpen:  string;
  appClose: string;
  start:    string;
  end:      string;
}

/** Stable id for a programme's intake by position (back-compat when IntakeWindow.id
 *  is absent — the same scheme used to bucket untagged applications onto intake 0). */
function intakeId(p: Programme, w: IntakeWindow, i: number): string {
  return w.id ?? `${p.id}::intake-${i}`;
}

/** Normalised intakes for a programme: `intakeWindows` when present, otherwise a
 *  single synthesised intake from the legacy programme-level window. Always ≥ 1. */
export function programmeIntakes(p: Programme): NormalisedIntake[] {
  if (p.intakeWindows && p.intakeWindows.length > 0) {
    return p.intakeWindows.map((w, i) => ({
      id: intakeId(p, w, i),
      appOpen: w.appOpen,
      appClose: w.appClose,
      start: w.start,
      end: w.end,
    }));
  }
  return [
    {
      id: `${p.id}::intake-0`,
      appOpen: p.appOpen,
      appClose: p.appDeadline,
      start: p.start,
      end: p.end,
    },
  ];
}

/** The intake a new application should attach to when applying now: the intake whose
 *  application window is currently open, otherwise the programme's first intake. */
export function currentIntakeId(p: Programme): string {
  const intakes = programmeIntakes(p);
  const open = intakes.find((i) => deriveAppStatus(i.appOpen, i.appClose) === 'Open');
  return (open ?? intakes[0]).id;
}
