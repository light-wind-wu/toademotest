import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

/* Real-LLM CV summary for a candidate (Candidate 360 + mentor + shortlist).
   On any failure it emits the __FALLBACK__ sentinel so the client can fall back
   to the local templated summary. */
export async function POST(req: NextRequest) {
  const { applicant, engagements } = await req.json();
  const a = applicant ?? {};
  const eng: { kind?: string }[] = Array.isArray(engagements) ? engagements : [];
  const interns = eng.filter(e => e.kind === 'internship').length;
  const courses = eng.filter(e => e.kind === 'techup-course').length;
  const cvHi = a.cvHighlights ?? {};

  const profileLines = [
    `Name: ${a.name}`,
    a.year > 0   ? `Year of study: Year ${a.year}` : null,
    a.course     ? `Course: ${a.course}` : null,
    a.school     ? `School: ${a.school}` : null,
    a.gpa > 0    ? `GPA: ${Number(a.gpa).toFixed(2)}` : null,
    a.achievements?.length ? `Achievements: ${a.achievements.join('; ')}` : null,
    cvHi.leadership?.length ? `Leadership (detected from CV): ${cvHi.leadership.join('; ')}` : null,
    cvHi.activities?.length ? `Co-curricular activities (detected from CV): ${cvHi.activities.join('; ')}` : null,
    (interns || courses)
      ? `Prior DSTA engagement: ${[interns ? `${interns} internship${interns > 1 ? 's' : ''}` : null, courses ? `${courses} TechUp course${courses > 1 ? 's' : ''}` : null].filter(Boolean).join(', ')}`
      : a.previousDSTA ? `Prior DSTA exposure: Yes${a.previousDSTADetails ? ` — ${a.previousDSTADetails}` : ''}` : null,
    a.topReasoning ? `Project-fit note: ${a.topReasoning}` : null,
  ].filter(Boolean).join('\n');

  const userPrompt = `Candidate to summarise:\n${profileLines}`;
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 240,
          system: `You are a talent-acquisition assistant for DSTA (Defence Science and Technology Agency, Singapore). Write ONE concise paragraph (55–95 words) summarising this candidate for an internal reviewer (IO or mentor): academic standing, standout strengths or relevant experience, leadership/co-curriculars, and any prior DSTA engagement. Be factual, specific, and professional. Do NOT make accept/reject recommendations and do NOT assign a score. No headings, no bullet points — a single flowing paragraph.`,
          messages: [{ role: 'user', content: userPrompt }],
        });
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch {
        controller.enqueue(encoder.encode('__FALLBACK__'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
