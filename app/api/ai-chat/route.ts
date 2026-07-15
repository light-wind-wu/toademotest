import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SKIP_FIELDS = new Set([
  'name', 'email', 'name_of_institution', 'course_of_study', 'year_of_study',
  'gpa_cap_rank_points', 'achievements',
]);

const FIELD_LABELS: Record<string, string> = {
  skills:                'Skills',
  technical_skills:      'Technical skills',
  programming_languages: 'Programming languages',
  work_experience:       'Work experience',
  internship_experience: 'Internship experience',
  personal_statement:    'Personal statement',
  motivation:            'Motivation',
  why_dsta:              'Why DSTA',
  fun_question:          'Fun question answer',
  fun_answer:            'Fun question answer',
  extracurricular:       'Extracurricular activities',
  leadership:            'Leadership experience',
  projects:              'Projects',
  research:              'Research experience',
  awards:                'Awards & honours',
  relevant_modules:      'Relevant modules',
  dissertation:          'Dissertation / FYP',
};

function formatFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function buildContext(context: {
  applicant: {
    name: string; school: string; course: string; year: number; gpa: number;
    achievements: string[]; previousDSTA: boolean; previousDSTADetails?: string;
    formValues?: Record<string, string | string[]>;
  };
  scores: { technicalKnowledge: number; problemSolving: number; communication: number; initiativeDrive: number };
  notes: string;
  transcript?: string;
  project: { title: string; description?: string; skills?: string[] } | null;
}): string {
  const { applicant, scores, notes, transcript, project } = context;

  const profileLines = [
    `Name: ${applicant.name}`,
    applicant.year > 0  ? `Year of study: Year ${applicant.year}` : null,
    applicant.course    ? `Course: ${applicant.course}` : null,
    applicant.school    ? `School: ${applicant.school}` : null,
    applicant.gpa > 0   ? `GPA: ${applicant.gpa.toFixed(2)}` : null,
    applicant.achievements?.length > 0
      ? `Achievements: ${applicant.achievements.join('; ')}` : null,
    applicant.previousDSTA
      ? `Prior DSTA experience: Yes${applicant.previousDSTADetails ? ` — ${applicant.previousDSTADetails}` : ''}` : null,
  ].filter(Boolean).join('\n');

  const formValues = applicant.formValues ?? {};
  const formLines = Object.entries(formValues)
    .filter(([key, val]) => {
      if (SKIP_FIELDS.has(key)) return false;
      const str = Array.isArray(val) ? val.join(', ') : val;
      return str && str.trim().length > 0;
    })
    .map(([key, val]) => {
      const label = formatFieldLabel(key);
      const value = Array.isArray(val) ? val.join(', ') : val;
      return `- ${label}: ${value}`;
    })
    .join('\n');

  const scoreLines = [
    `Technical Knowledge: ${scores.technicalKnowledge}/10`,
    `Problem Solving: ${scores.problemSolving}/10`,
    `Communication: ${scores.communication}/10`,
    `Initiative & Drive: ${scores.initiativeDrive}/10`,
  ].join(', ');

  const projectSection = project
    ? `Project: ${project.title}${project.description ? ` — ${project.description}` : ''}${project.skills?.length ? `. Required skills: ${project.skills.join(', ')}` : ''}`
    : 'No project assigned.';

  return [
    `=== CANDIDATE PROFILE ===`,
    profileLines,
    formLines ? `\n=== APPLICATION DETAILS (CV / TRANSCRIPT / FORM RESPONSES) ===\n${formLines}` : '',
    `\n=== INTERVIEW SCORES ===`,
    scoreLines,
    `\n=== MENTOR'S INTERVIEW NOTES ===`,
    notes.trim() || '(No notes recorded)',
    transcript?.trim() ? `\n=== INTERVIEW TRANSCRIPT ===\n${transcript.trim()}` : '',
    `\n=== PROJECT ===`,
    projectSection,
  ].filter(Boolean).join('\n');
}

export async function POST(req: NextRequest) {
  const { messages, context } = await req.json();

  const contextBlock = buildContext(context);

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          system: `You are an internship evaluation assistant for DSTA (Defence Science and Technology Agency), Singapore.
You have full access to a candidate's application materials and post-interview data. Answer the mentor's questions about this candidate factually and objectively.

IMPORTANT CONSTRAINT: Do not make accept or reject recommendations under any circumstances. Do not say things like "I recommend hiring", "you should accept", "I suggest rejecting", or similar. Your role is to provide clear, factual analysis to help the mentor form their own judgement.

Be concise. Cite specific details from the candidate data when relevant. If information is not available in the provided data, say so rather than guessing.

${contextBlock}`,
          messages,
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const isAuth = err instanceof Error && (
          err.message.includes('401') || err.message.includes('authentication') ||
          err.message.includes('API key') || err.message.includes('api_key')
        );
        const msg = isAuth
          ? 'AI assistant is not available — API key not configured. Add a valid ANTHROPIC_API_KEY to .env.local and restart the dev server.'
          : 'Unable to reach AI assistant. Please try again.';
        controller.enqueue(encoder.encode(msg));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
