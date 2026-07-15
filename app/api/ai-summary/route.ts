import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Fields already surfaced in the structured profile — skip them in formValues to avoid duplication
const SKIP_FIELDS = new Set([
  'name', 'email', 'name_of_institution', 'course_of_study', 'year_of_study',
  'gpa_cap_rank_points', 'achievements',
]);

// Human-readable labels for known form field IDs
const FIELD_LABELS: Record<string, string> = {
  skills:                        'Skills',
  technical_skills:              'Technical skills',
  programming_languages:         'Programming languages',
  work_experience:               'Work experience',
  internship_experience:         'Internship experience',
  personal_statement:            'Personal statement',
  motivation:                    'Motivation',
  why_dsta:                      'Why DSTA',
  fun_question:                  'Fun question answer',
  fun_answer:                    'Fun question answer',
  extracurricular:               'Extracurricular activities',
  leadership:                    'Leadership experience',
  projects:                      'Projects',
  research:                      'Research experience',
  awards:                        'Awards & honours',
  languages:                     'Languages spoken',
  relevant_modules:              'Relevant modules',
  dissertation:                  'Dissertation / FYP',
};

function formatFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export async function POST(req: NextRequest) {
  const { scores, notes, transcript, applicant, project } = await req.json();

  const scoreLines = [
    `- Technical Knowledge: ${scores.technicalKnowledge}/10`,
    `- Problem Solving: ${scores.problemSolving}/10`,
    `- Communication: ${scores.communication}/10`,
    `- Initiative & Drive: ${scores.initiativeDrive}/10`,
  ].join('\n');

  const cvHi    = applicant.cvHighlights ?? {};
  const dstaEng = applicant.dstaEngagement ?? {};
  const engBits = [
    dstaEng.internships   ? `${dstaEng.internships} prior DSTA internship${dstaEng.internships > 1 ? 's' : ''}` : null,
    dstaEng.techupCourses ? `${dstaEng.techupCourses} TechUp course${dstaEng.techupCourses > 1 ? 's' : ''}` : null,
  ].filter(Boolean);

  const profileLines = [
    `Name: ${applicant.name}`,
    applicant.year > 0    ? `Year of study: Year ${applicant.year}` : null,
    applicant.course      ? `Course: ${applicant.course}` : null,
    applicant.school      ? `School: ${applicant.school}` : null,
    applicant.gpa > 0     ? `GPA: ${applicant.gpa.toFixed(2)}` : null,
    applicant.achievements?.length > 0
      ? `Achievements: ${applicant.achievements.join('; ')}` : null,
    cvHi.leadership?.length > 0
      ? `Leadership (detected from CV): ${cvHi.leadership.join('; ')}` : null,
    cvHi.activities?.length > 0
      ? `Co-curricular activities (detected from CV): ${cvHi.activities.join('; ')}` : null,
    engBits.length > 0
      ? `DSTA track record: ${engBits.join(' and ')}`
      : applicant.previousDSTA
        ? `Prior DSTA experience: Yes${applicant.previousDSTADetails ? ` — ${applicant.previousDSTADetails}` : ''}` : null,
  ].filter(Boolean).join('\n');

  // Application form values — CV/transcript parsed fields + motivation answers
  const formValues: Record<string, string | string[]> = applicant.formValues ?? {};
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

  const projectLines = project
    ? [
        `Title: ${project.title}`,
        project.description ? `Scope: ${project.description}` : null,
        project.skills?.length > 0 ? `Required skills: ${project.skills.join(', ')}` : null,
      ].filter(Boolean).join('\n')
    : 'No project information provided.';

  const userPrompt = `
Candidate profile:
${profileLines}
${formLines ? `\nApplication details (from CV, transcript, and form responses):\n${formLines}` : ''}

Interview scores (out of 10):
${scoreLines}

Interview notes from mentor:
${notes.trim() || '(No notes provided)'}
${transcript?.trim() ? `\nInterview transcript:\n${transcript.trim()}` : ''}

Project being evaluated for:
${projectLines}
`.trim();

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          system: `You are an internship evaluation assistant for DSTA (Defence Science and Technology Agency), Singapore.
A mentor has just completed an interview and wants a concise written summary of the candidate.

You have access to the candidate's full application — including CV-parsed fields, transcript data, and their written responses — as well as interview scores and the mentor's notes. Synthesise all of this into a holistic picture.

IMPORTANT: Do not make any accept or reject recommendations. Do not include phrases like "recommend for offer", "does not meet threshold", "strong candidate for hiring", or any similar language. Present observations only — the hiring decision belongs to the mentor.

Write exactly 3 short paragraphs separated by a blank line:
1. Candidate background — academic standing, relevant skills or experience from their application, notable achievements, any prior DSTA exposure.
2. Interview performance — reference the scores, highlight the strongest and weakest dimension, and note whether the mentor's notes and application materials are consistent with the scores.
3. Project fit — how the candidate's background and interview performance relate to the project's specific skill requirements. State alignment or gaps factually, without a recommendation.

Be direct and professional. Draw on specific details from the application where relevant. No bullet points. No headers. Total: 140–200 words.`,
          messages: [{ role: 'user', content: userPrompt }],
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
          ? 'AI summary unavailable — API key not configured. Add a valid ANTHROPIC_API_KEY to .env.local and restart the dev server.'
          : 'Unable to generate summary. Please try again.';
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
