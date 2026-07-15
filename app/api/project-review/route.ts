import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

/* Real-LLM review assistant for an IO admin reviewing a mentor-submitted
   internship project before approving it for applicants. */
export async function POST(req: NextRequest) {
  const { project } = await req.json();
  const p = project ?? {};

  const lines = [
    `Title: ${p.title ?? '(untitled)'}`,
    p.techDomain ? `Tech domain: ${p.techDomain}` : null,
    p.emergingArea ? `Emerging area: ${p.emergingArea}` : null,
    p.internCategory ? `Intern category: ${p.internCategory}` : null,
    p.discipline ? `Preferred discipline: ${p.discipline}` : null,
    p.skills?.length ? `Skills / knowledge required: ${p.skills.join(', ')}` : null,
    p.preferredEducation ? `Preferred education: ${p.preferredEducation}` : null,
    p.minGpa ? `Minimum GPA: ${p.minGpa}` : null,
    p.slots != null ? `Placements: ${p.slots}` : null,
    p.internshipDuration ? `Internship duration: ${p.internshipDuration}` : null,
    p.workingLocation ? `Working location: ${p.workingLocation}` : null,
    p.additionalRequirements ? `Additional requirements: ${p.additionalRequirements}` : null,
    p.mentorBio ? `Mentor bio: ${p.mentorBio}` : null,
    `\nProject scope / description:\n${p.description?.trim() || '(none provided)'}`,
  ].filter(Boolean).join('\n');

  const userPrompt = `Internship project submission to review:\n${lines}`;
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          system: `You are a project-submission review assistant for DSTA's Internship Office (Singapore). An IO admin is reviewing a mentor-submitted internship project BEFORE approving it for student applicants. Assess the submission from the perspective of an intern audience and programme quality.

Output exactly these three labelled sections, each on its own line, separated by a blank line:

Summary: one sentence on what the project is and who it would suit.
Strengths: 2–3 brief points on what is well specified.
Gaps to address: 2–3 specific, actionable points (e.g. scope too vague, learning outcomes or deliverables missing, language too advanced/jargon-heavy for interns, skills list misaligned with the scope, mentor bio thin, placements/duration unclear). If the submission is genuinely complete, say so plainly.

IMPORTANT: Do NOT approve or reject the project — that decision belongs to the IO admin. Be concrete, constructive and concise. Around 120–170 words total. No preamble.`,
          messages: [{ role: 'user', content: userPrompt }],
        });
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const isAuth = err instanceof Error && (
          err.message.includes('401') || err.message.includes('authentication') ||
          err.message.includes('API key') || err.message.includes('api_key')
        );
        controller.enqueue(encoder.encode(isAuth
          ? 'AI review unavailable — API key not configured. Add a valid ANTHROPIC_API_KEY to .env.local and restart the dev server.'
          : 'Unable to generate the AI review. Please try again.'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
