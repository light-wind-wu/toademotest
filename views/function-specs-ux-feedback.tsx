"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  ClipboardCheck,
  FileInput,
  GraduationCap,
  MessagesSquare,
  Send,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";

type LifecycleArea = {
  id: string;
  phase: "Preparation" | "Programme" | "Post Internship";
  title: string;
  icon: ComponentType<{ className?: string }>;
  keys: string[];
  edgeTitle?: string;
  edgeCases?: string[];
};

const AREAS: LifecycleArea[] = [
  {
    id: "project-creation",
    phase: "Preparation",
    title: "Project request collection",
    icon: FileInput,
    keys: [
      "IO Admin creates the request by selecting Programme Centre, Programme, Intake, target, deadline, and required fields.",
      "IO Admin sends the request to AD (P&C), with optional PC Head visibility.",
      "System sends transactional email and in-system notification with the submission link.",
      "AD (P&C) adds or updates project items under the linked Project Request Submission page.",
      "IO Admin reviews submitted project items and decides whether to approve, reject, extend, or close.",
      "System records sent email, system notice, submission updates, comments, and decisions in audit history.",
      "If the deadline expires, System marks the request as Expired and prompts IO Admin to extend, close, or cancel.",
      "If extended, System notifies AD (P&C) again and reopens submission editing.",
      "If rejected, AD (P&C) modifies project items using IO Admin comments and resubmits.",
      "If needed, AD (P&C) withdraws a project item; approved items require reason and IO Admin confirmation.",
      "IO Admin ends the request by marking it Completed, Closed, or Cancelled.",
      "After closure, AD (P&C) can no longer edit or submit project items.",
    ],
    edgeTitle: "Decision points",
    edgeCases: [
      "Approve: accepted project items enter the approved project pool for matching / allocation.",
      "Reject / Revision required: not a final closure state; AD (P&C) can modify and resubmit.",
      "Extend deadline: use when target is not met or request expired but collection should continue.",
      "Close / Complete / Cancel: only IO Admin can end the overall request.",
    ],
  },
  {
    id: "programme-creation",
    phase: "Preparation",
    title: "Programme creation",
    icon: GraduationCap,
    keys: [
      "Set up the programme eligibility criteria.",
      "Set up the intake.",
      "Attach projects.",
    ],
    edgeCases: ["Projects spanning across programme intakes."],
  },
  {
    id: "application",
    phase: "Programme",
    title: "Application",
    icon: ClipboardCheck,
    keys: [
      "Application journey.",
      "Suitable projects are surfaced from the CV and responses, matched on discipline, interests and more.",
      "Rank up to five preferred projects.",
    ],
    edgeCases: ["SCI applicants."],
  },
  {
    id: "screening",
    phase: "Programme",
    title: "Applicant shortlisting",
    icon: Sparkles,
    keys: [
      "Auto screened against the programme's eligibility criteria.",
      "Automatically scored for suitability against each project.",
      "Rich context surfaced for the IO at a glance, including prior DSTA touchpoints, achievements and leadership roles.",
      "IO shortlists the applicant for interview with a project mentor.",
    ],
    edgeTitle: "Considerations",
    edgeCases: [
      "Suitability scoring normalises across qualifications: IB, IP, NUS High, Poly and University.",
      "It weighs discipline, grades and, for JC, STEM subjects.",
      "Schools name subjects differently, so subjects must be mapped.",
    ],
  },
  {
    id: "interview",
    phase: "Programme",
    title: "Interview",
    icon: MessagesSquare,
    keys: [
      "Mentor receives the applicant profile with a summary, similar to what the IO sees at shortlisting.",
      "Schedule the interview.",
      "Evaluate the applicant based on the interview and submit a decision to the IO.",
    ],
    edgeTitle: "Considerations",
    edgeCases: [
      "Transcript uploaded to the system after the interview.",
      "Or interview conducted via an integrated comms channel, with the transcript captured immediately.",
    ],
  },
  {
    id: "offer",
    phase: "Programme",
    title: "Offer",
    icon: Send,
    keys: [
      "IO extends an offer to the chosen applicant.",
      "Applicant accepts and the placement is confirmed.",
    ],
    edgeCases: ["Applicant requests a change in start date."],
  },
  {
    id: "onboard",
    phase: "Programme",
    title: "Onboard",
    icon: GraduationCap,
    keys: ["Send welcome letter.", "Internship begins."],
  },
  {
    id: "offboard",
    phase: "Post Internship",
    title: "Offboard",
    icon: ClipboardCheck,
    keys: [
      "Start exit clearance.",
      "Mentor submits evaluation.",
      "Intern provides feedback, used to generate sentiment analysis across calibration, mentorship and work environment.",
      "Complete.",
      "Certificate of completion sent.",
    ],
    edgeCases: [
      "Withdrawal.",
      "Request for extension.",
      "Dismissed.",
      "Early completion.",
    ],
  },
];

const PHASES: LifecycleArea["phase"][] = [
  "Preparation",
  "Programme",
  "Post Internship",
];

export default function FunctionSpecsUxFeedbackPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = AREAS.find((area) => area.id === selectedId) ?? null;

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-black text-[#f5f5f7]">
      <div aria-hidden className="pointer-events-none fixed inset-[-25%] opacity-85 blur-[80px]">
        <div className="absolute left-[-6vw] top-[-10vw] h-[48vw] w-[48vw] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(46,86,196,.55),transparent_70%)] mix-blend-screen" />
        <div className="absolute right-[-10vw] top-[2vw] h-[44vw] w-[44vw] rounded-full bg-[radial-gradient(circle_at_60%_40%,rgba(245,166,35,.32),transparent_70%)] mix-blend-screen" />
        <div className="absolute bottom-[-20vw] left-[16vw] h-[54vw] w-[54vw] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(60,110,230,.4),transparent_70%)] mix-blend-screen" />
      </div>

      <section
        className={cn(
          "relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-[clamp(24px,6vw,92px)] py-16 text-center transition duration-500",
          selected && "scale-[.97] opacity-20 blur-md",
        )}
      >
        <div className="rounded-full border border-[rgba(245,166,35,.3)] bg-[rgba(245,166,35,.12)] px-4 py-2 text-[13px] font-bold uppercase tracking-[.16em] text-[#ffc266]">
          Lifecycle
        </div>
        <h1 className="mt-7 text-[clamp(34px,5.4vw,72px)] font-bold leading-[1.04] tracking-[-.022em]">
          Function Specs and{" "}
          <span className="bg-gradient-to-r from-[#ffc266] to-[#ffd591] bg-clip-text text-transparent">
            UX Feedback.
          </span>
        </h1>
        <p className="mt-6 max-w-[54ch] text-[clamp(15px,1.8vw,20px)] leading-7 text-[#aeaeb4]">
          The internship lifecycle, reduced to the functional steps, decision
          points, and UX considerations that matter.
        </p>

        <div className="mt-10 grid w-full max-w-[1080px] grid-cols-1 gap-[clamp(14px,1.8vw,22px)] text-left md:grid-cols-3">
            {PHASES.map((phase) => {
              const areas = AREAS.filter((area) => area.phase === phase);
              return (
                <div
                  key={phase}
                  className="rounded-[26px] border border-white/10 bg-white/[.055] p-6 shadow-[0_24px_70px_-34px_rgba(0,0,0,.85)] backdrop-blur-2xl"
                >
                  <div className="border-b border-white/10 pb-4 text-[clamp(16px,1.8vw,21px)] font-bold tracking-[-.01em]">
                    {phase}
                  </div>
                  <div className="mt-4 flex flex-col gap-3">
                    {areas.map((area) => {
                      const Icon = area.icon;
                      return (
                        <button
                          key={area.id}
                          type="button"
                          onClick={() => setSelectedId(area.id)}
                          className={cn(
                            "group flex min-h-[58px] items-center gap-3 rounded-[14px] border border-[rgba(255,194,102,.26)]",
                            "bg-[linear-gradient(135deg,rgba(245,166,35,.12),rgba(245,166,35,.035))] px-4 py-3",
                            "transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,194,102,.6)] hover:bg-[linear-gradient(135deg,rgba(245,166,35,.22),rgba(245,166,35,.07))] hover:shadow-[0_16px_34px_-22px_rgba(245,166,35,.7)]",
                            "focus:outline-none focus:ring-2 focus:ring-[rgba(255,194,102,.35)]",
                          )}
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[rgba(245,166,35,.16)] text-[#ffc266]">
                            <Icon className="h-5 w-5 [stroke-width:1.7]" />
                          </span>
                          <span className="min-w-0 flex-1 text-[clamp(14px,1.5vw,16.5px)] font-semibold tracking-[-.01em] text-[#f5f5f7]">
                            {area.title}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-[#ffc266] opacity-60 transition group-hover:translate-x-1 group-hover:opacity-100" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
      </section>

      {selected ? (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center px-[clamp(24px,6vw,80px)] py-10"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="flex w-full max-w-[1040px] flex-col items-start gap-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,640px)_320px]">
              <article className="max-h-[74vh] overflow-auto rounded-[26px] border border-white/10 bg-white/[.055] p-[clamp(26px,3.4vw,42px)] text-left shadow-[0_24px_70px_-34px_rgba(0,0,0,.85)] backdrop-blur-2xl">
                <div className="text-[13px] font-extrabold uppercase tracking-[.2em] text-[#ffc266]">
                  {selected.phase}
                </div>
                <h2 className="mt-4 text-[clamp(27px,4vw,44px)] font-bold leading-[1.05] tracking-[-.02em] text-[#f5f5f7]">
                  {selected.title}
                </h2>
                <ol className="mt-8">
                  {selected.keys.map((item, index) => (
                    <li
                      key={item}
                      className="relative flex gap-4 pb-5 text-[clamp(14px,1.6vw,17px)] leading-6 text-[#f5f5f7] last:pb-0"
                    >
                      {index < selected.keys.length - 1 ? (
                        <span className="absolute bottom-0 left-[15px] top-[31px] w-0.5 -translate-x-1/2 bg-gradient-to-b from-[rgba(245,166,35,.55)] to-[rgba(245,166,35,.12)]" />
                      ) : null}
                      <span className="relative z-10 grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ffd591] to-[#ffc266] text-[13px] font-bold text-[#2a1800] shadow-[0_4px_12px_-4px_rgba(245,166,35,.7)]">
                        {index + 1}
                      </span>
                      <span className="pt-1">{item}</span>
                    </li>
                  ))}
                </ol>
              </article>

              <aside className="rounded-[26px] border border-[rgba(255,194,102,.28)] bg-[linear-gradient(135deg,rgba(245,166,35,.1),rgba(245,166,35,.03))] p-[clamp(22px,2.6vw,30px)] text-left shadow-[0_24px_70px_-34px_rgba(0,0,0,.85)] backdrop-blur-2xl">
                <div className="flex items-center gap-2 text-[12.5px] font-extrabold uppercase tracking-[.14em] text-[#ffc266]">
                  <AlertTriangle className="h-4 w-4 [stroke-width:2]" />
                  {selected.edgeTitle ?? "Edge cases"}
                </div>
                {selected.edgeCases?.length ? (
                  <ul className="mt-5 flex flex-col gap-4">
                    {selected.edgeCases.map((edgeCase) => (
                      <li
                        key={edgeCase}
                        className="flex items-start gap-3 text-[clamp(13px,1.45vw,15px)] leading-[1.42] text-[#aeaeb4]"
                      >
                        <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-lg bg-[rgba(245,166,35,.18)] text-[13px] font-extrabold text-[#ffc266]">
                          !
                        </span>
                        <span>{edgeCase}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 text-[15px] leading-6 text-[#aeaeb4]">
                    No specific edge cases captured for this step.
                  </p>
                )}
              </aside>
            </div>

            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.055] px-5 py-3 text-sm font-bold text-[#aeaeb4] backdrop-blur-2xl transition hover:border-[rgba(255,194,102,.4)] hover:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[rgba(255,194,102,.35)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
