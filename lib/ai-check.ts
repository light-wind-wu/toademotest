import type { AiCheckResult } from '@/lib/types';

/* ── Level groups ─────────────────────────────────────────────────────────────
   Intern Categories are collapsed into four generational groups so AI title/scope
   suggestions pitch at the right level. YDSP interns are secondary-school students,
   so they get the most introductory expectations — distinct from (pre-university) JC.
   Post-JC/Post-Poly students are diploma-level, grouped with poly. */
const SECONDARY_CATEGORIES = ['Young Defence Scientist Programme'];
const JC_CATEGORIES        = ['Junior College Scholar/Junior College Student'];
const POLY_CATEGORIES      = ['Polytechnic Scholar/Polytechnic Student', 'Post Junior College/Post Polytechnic Student'];
const UG_CATEGORIES        = ['Undergraduate Scholar/Merit Scholar', 'Tech UP', 'Undergraduate Student'];

function levelGroup(category: string): 'secondary' | 'jc' | 'poly' | 'ug' | 'unknown' {
  if (SECONDARY_CATEGORIES.includes(category)) return 'secondary';
  if (JC_CATEGORIES.includes(category))        return 'jc';
  if (POLY_CATEGORIES.includes(category))      return 'poly';
  if (UG_CATEGORIES.includes(category))        return 'ug';
  return 'unknown';
}

/* ── Regex patterns ───────────────────────────────────────────────────────── */
const ADVANCED_TERMS = /\b(stochastic|heterogeneous|eigenvalue|bayesian inference|markov chain|convex optimization|fourier transform|propagation matrix|differential equation|tensor decomposition|backpropagation|variational inference|gaussian process|adversarial training|transformer architecture)\b/i;
const DELIVERABLE    = /\b(deliver|report|prototype|model|system|tool|dashboard|analysis|present|produce|build|develop|implement|document|code|paper|artefact|artifact)\b/i;
const INTERN_FACING  = /\b(intern|you will|you'll|student|applicant|candidate|participant)\b/i;

/* ── Title suggestion ─────────────────────────────────────────────────────── */
export function generateTitleSuggestion(
  title: string,
  internCategory: string,
  techDomain: string,
): string {
  const clean = title.trim().replace(/\.$/, '').replace(/\s+/g, ' ');
  if (!clean) return '';

  const group = levelGroup(internCategory);
  const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
  const hasActionVerb = /^(develop|build|design|implement|research|explore|analyse|analyze|investigate|create|deploy|evaluate|study|build)/i.test(clean);

  if (group === 'secondary') {
    // IP — secondary school: the gentlest, most exploratory framing.
    if (hasActionVerb) {
      return capitalized
        .replace(/^Develop(ment of|ing)?\s*/i, 'Discovering ')
        .replace(/^Build(ing)?\s*/i, 'Getting Started with ')
        .replace(/^Implement(ation of|ing)?\s*/i, 'Exploring ')
        .replace(/^Research(ing)?\s*/i, 'Discovering ');
    }
    return `Discovering ${capitalized}`;
  }

  if (group === 'jc') {
    if (hasActionVerb) {
      return capitalized
        .replace(/^Develop(ment of|ing)?\s*/i, 'Exploring ')
        .replace(/^Build(ing)?\s*/i, 'Introduction to Building ')
        .replace(/^Implement(ation of|ing)?\s*/i, 'Understanding and Implementing ')
        .replace(/^Research(ing)?\s*/i, 'Introduction to Research in ');
    }
    return `Introduction to ${capitalized}`;
  }

  if (group === 'poly') {
    if (hasActionVerb) return capitalized;
    return `Developing ${capitalized}`;
  }

  // UG / unknown
  if (hasActionVerb) return capitalized;
  return `Design and Development of ${capitalized}`;
}

/* ── Scope suggestion ─────────────────────────────────────────────────────── */
export function generateScopeSuggestion(
  title: string,
  _description: string,
  internCategory: string,
  skills: string[],
  techDomain: string,
): string {
  const group      = levelGroup(internCategory);
  const skillList  = skills.slice(0, 4).join(', ') || techDomain || 'relevant tools and technologies';
  const cleanTitle = title.replace(/\.$/, '').trim().toLowerCase();
  const domain     = techDomain || 'technology';

  if (group === 'secondary') {
    return [
      'Overview',
      `This attachment gives you a friendly, hands-on introduction to ${cleanTitle}. As a secondary school (IP) student, you will learn the basic ideas step by step, with close guidance and support from your mentor at every stage — no prior experience is needed.`,
      '',
      'Key Activities',
      `You will take part in simple, guided activities and fun hands-on exercises to explore ${skillList}. Your mentor will explain each concept in plain language, and you will keep a short learning log of what you discover each day.`,
      '',
      'Expected Deliverables',
      `By the end of the attachment, you will share a short, simple presentation about what you learnt and a small demonstration of a basic activity you completed. The focus is on curiosity, exposure, and building confidence — not on advanced or independent work.`,
    ].join('\n');
  }

  if (group === 'jc') {
    return [
      'Overview',
      `In this internship, you will be introduced to the fundamentals of ${cleanTitle}. Under close guidance from your mentor, you will explore real-world applications of ${skillList} in a structured and supportive environment.`,
      '',
      'Key Activities',
      `You will participate in guided hands-on exercises, attend knowledge-sharing sessions, and contribute to a small-scale project. Daily activities include reading relevant documentation, running supervised experiments, and presenting progress weekly to your mentor.`,
      '',
      'Expected Deliverables',
      `By the end of the internship, you will present a short report and a working demonstration of a basic ${cleanTitle.replace(/^(introduction to |developing |design and development of )/i, '')} prototype, highlighting key concepts learnt and your personal learning journey.`,
    ].join('\n');
  }

  if (group === 'poly') {
    return [
      'Overview',
      `Interns will work on practical aspects of ${cleanTitle}, contributing directly to ongoing projects within the ${domain} team. You will apply your knowledge of ${skillList} to solve real engineering challenges in a professional environment.`,
      '',
      'Key Activities',
      `You will be involved in designing, testing, and iterating on ${cleanTitle.replace(/^(developing |design and development of )/i, '')} solutions. This includes writing code or building models, conducting experiments, documenting findings, and participating in regular team stand-ups and code reviews.`,
      '',
      'Expected Deliverables',
      `At the end of the internship, you are expected to deliver a functional module or component, accompanied by technical documentation and a final presentation summarising your approach, results, and recommendations for future improvement.`,
    ].join('\n');
  }

  // UG / Uni / unknown
  return [
    'Overview',
    `This internship involves research and development in ${cleanTitle}. Interns will contribute to substantive work within the ${domain} domain, applying advanced knowledge of ${skillList} to address real technical challenges faced by the organisation.`,
    '',
    'Key Activities',
    `You will undertake a structured research or engineering task encompassing literature review, experiment design or system architecture, implementation, and rigorous analysis of results. Weekly check-ins with your mentor ensure alignment, learning progression, and quality of output.`,
    '',
    'Expected Deliverables',
    `Interns are expected to produce a technical report, a working prototype or trained model, and a formal presentation to the team. Exceptional work may contribute to internal publications or provide a foundation for further project development.`,
  ].join('\n');
}

/* ── Spelling & grammar fixers ─────────────────────────────────────────────── */
/** Light-touch grammar pass for a title: collapse spaces, drop trailing full
 *  stop, capitalise the first letter. No rewrite of wording. */
export function fixTitleGrammar(title: string): string {
  let t = title.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  t = t.replace(/[.\s]+$/, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Light-touch grammar pass for a scope: tidy whitespace (line breaks kept),
 *  fix spacing around punctuation, capitalise sentence starts. */
export function fixScopeGrammar(text: string): string {
  if (!text.trim()) return '';
  let out = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim();
  out = out.replace(/\s+([,.;:!?])/g, '$1');            // no space before punctuation
  out = out.replace(/([,.;:!?])(?=[A-Za-z])/g, '$1 ');  // ensure space after punctuation
  // Capitalise first character overall, after sentence terminators, and after line breaks.
  out = out.replace(/(^|[.!?]\s+|\n)([a-z])/g, (_m, lead, ch) => lead + ch.toUpperCase());
  return out;
}

/** Fresh sample title built purely from project context (used when the user
 *  wants an example rather than a refinement of what they typed). */
export function generateSampleTitle(
  internCategory: string,
  techDomain: string,
  discipline: string,
): string {
  const focus = techDomain || discipline || 'Emerging Technology';
  return generateTitleSuggestion(`Development of ${focus} Capabilities`, internCategory, techDomain);
}

/* ── Full AI check ────────────────────────────────────────────────────────── */
export function runAiCheck(
  title:          string,
  description:    string,
  internCategory: string,
  skills:         string[],
  techDomain:     string,
): AiCheckResult {
  const grammarNotes: string[] = [];
  const levelNotes:   string[] = [];

  /* ── Grammar: title ───────────────────────────────────────────────────── */
  const cleanTitle = title.trim();
  const titleWords = cleanTitle.split(/\s+/).filter(Boolean);

  if (!cleanTitle) {
    grammarNotes.push('Project title is empty.');
  } else {
    if (titleWords.length < 3)
      grammarNotes.push('Project title is too short — aim for 4–10 words that clearly describe the project.');
    if (titleWords.length > 14)
      grammarNotes.push('Project title is too long — shorten to 4–12 words for clarity.');
    if (/[a-z]/.test(cleanTitle[0] ?? ''))
      grammarNotes.push('Project title does not begin with a capital letter.');
    if (cleanTitle.endsWith('.'))
      grammarNotes.push('Project title should not end with a full stop.');
    if (/^(the |a |an )/i.test(cleanTitle))
      grammarNotes.push('Avoid starting the project title with an article ("The", "A", "An") — begin with a noun or action verb instead.');
  }

  /* ── Grammar: scope ───────────────────────────────────────────────────── */
  const cleanDesc = description.trim();
  const wordCount = cleanDesc.split(/\s+/).filter(Boolean).length;
  let grammar: 'pass' | 'warn' | 'fail' = 'pass';

  if (wordCount < 20) {
    grammar = 'fail';
    grammarNotes.push(`Project scope is too brief (${wordCount} words). Expand to at least 40 words covering tasks, learning outcomes, and expected deliverables.`);
  } else if (wordCount < 40) {
    grammar = 'warn';
    grammarNotes.push(`Project scope is short (${wordCount} words). Consider expanding with specific tasks and expected outcomes (recommended minimum: 40 words).`);
  }

  if (cleanDesc && /[a-z]/.test(cleanDesc[0]))
    grammarNotes.push('Project scope does not begin with a capital letter.');

  if (!INTERN_FACING.test(cleanDesc))
    grammarNotes.push('Scope does not use intern-facing language. Rewrite to address the intern directly (e.g., "Interns will…", "You will…").');

  if (!DELIVERABLE.test(cleanDesc))
    grammarNotes.push('No expected deliverables identified in the scope. State what the intern will produce, build, or present by the end of the internship.');

  if (grammarNotes.length > 0 && grammar === 'pass') grammar = 'warn';

  /* ── Level: category-appropriate language ─────────────────────────────── */
  let level: 'pass' | 'warn' | 'fail' = 'pass';
  const group = levelGroup(internCategory);

  if (group === 'secondary') {
    if (ADVANCED_TERMS.test(description)) {
      level = 'warn';
      levelNotes.push(`"${internCategory}" interns are secondary school students. Advanced technical terms were detected — rewrite in simple, age-appropriate language and explain any necessary concepts from scratch.`);
    }
    if (!/\b(guided|supervised|introduction|introductory|fundamentals|basic|hands.on|explore|overview|learn|exposure|simple|step.by.step|discover)\b/i.test(description)) {
      if (level === 'pass') level = 'warn';
      levelNotes.push('For IP (secondary school) interns, emphasise hands-on exposure, simple guided activities, and foundational concepts. Avoid independent research, advanced methods, or complex deliverables.');
    }
  }

  if (group === 'jc') {
    if (ADVANCED_TERMS.test(description)) {
      level = 'warn';
      levelNotes.push(`Category "${internCategory}" targets pre-university students. Advanced technical terms were detected — simplify the language and provide context for complex concepts.`);
    }
    if (!/\b(guided|supervised|introduction|introductory|fundamentals|basic|hands.on|explore|overview|learn)\b/i.test(description)) {
      if (level === 'pass') level = 'warn';
      levelNotes.push('For JC-level interns, emphasise guided learning, structured activities, and foundational concepts in the scope.');
    }
  }

  if (group === 'poly') {
    if (ADVANCED_TERMS.test(description)) {
      level = 'warn';
      levelNotes.push(`Category "${internCategory}" targets polytechnic students. Some advanced terms detected — ensure practical context is clearly provided.`);
    }
    if (!/\b(practical|applied|hands.on|real.world|implement|build|test|develop|project)\b/i.test(description)) {
      if (level === 'pass') level = 'warn';
      levelNotes.push('For Poly-level interns, emphasise practical, applied work and real-world problem-solving in the scope.');
    }
  }

  if (group === 'ug' && wordCount > 0 && wordCount < 40) {
    if (level === 'pass') level = 'warn';
    levelNotes.push('UG/University-level scopes should be comprehensive. Expand the description to detail the research or engineering challenge, methodology, and expected depth of work.');
  }

  if (skills.length > 0) {
    const lower     = description.toLowerCase();
    const mentioned = skills.filter(s => lower.includes(s.toLowerCase()));
    if (mentioned.length === 0) {
      if (level === 'pass') level = 'warn';
      levelNotes.push('None of the required skills appear in the project scope. Ensure the scope reflects how listed skills will be applied or developed by the intern.');
    }
  }

  /* ── Generate suggestions ─────────────────────────────────────────────── */
  const suggestedTitle = generateTitleSuggestion(title, internCategory, techDomain);
  const suggestedScope = generateScopeSuggestion(title, description, internCategory, skills, techDomain);

  return {
    grammar,
    level,
    notes: [...grammarNotes, ...levelNotes],
    suggestedTitle,
    suggestedScope,
  };
}

export function runPublicProjectCheck(
  title: string,
  description: string,
  internCategory: string,
  skills: string[],
  techDomain: string,
): AiCheckResult {
  const notes: string[] = [];
  const text = `${title}\n${description}`.trim();
  const words = description.trim().split(/\s+/).filter(Boolean);

  let grammar: 'pass' | 'warn' | 'fail' = 'pass';
  if (!title.trim() || !description.trim()) {
    grammar = 'fail';
    notes.push('Project title and scope are required before AI checks can pass.');
  } else if (words.length < 20) {
    grammar = 'warn';
    notes.push('Project scope is very short. Add enough context for applicants to understand the work and expected outcomes.');
  }
  if (/[a-z]/.test(title.trim()[0] ?? '')) {
    if (grammar === 'pass') grammar = 'warn';
    notes.push('Project title should start with a capital letter.');
  }
  if (/\s+[,.!?;:]/.test(text) || /[,.!?;:](?=[A-Za-z])/.test(text)) {
    if (grammar === 'pass') grammar = 'warn';
    notes.push('Check punctuation spacing in the title or scope.');
  }

  let spelling: 'pass' | 'warn' | 'fail' = 'pass';
  const spellingPatterns = [
    /\bteh\b/i,
    /\brecieve\b/i,
    /\bseperate\b/i,
    /\boccured\b/i,
    /\bdefinately\b/i,
    /\bgoverment\b/i,
    /\benviroment\b/i,
    /\bmodellingg\b/i,
  ];
  if (spellingPatterns.some(pattern => pattern.test(text))) {
    spelling = 'warn';
    notes.push('Possible spelling issue detected. Review the title and scope before publishing.');
  }

  let publicReadiness: 'pass' | 'warn' | 'fail' = 'pass';
  const sensitiveTerms = /\b(classified|confidential|secret|restricted|internal only|incident|exploit|offensive|attack|weapon|target|vulnerability|zero-day|malware|payload|breach|surveillance)\b/i;
  if (sensitiveTerms.test(text)) {
    publicReadiness = 'warn';
    notes.push('Some wording may be too sensitive or internal-facing for public applicants. Reframe the scope in broader, student-facing terms.');
  }
  if (!/\b(intern|student|applicant|you will|work on|learn|develop|build|support|contribute)\b/i.test(description)) {
    if (publicReadiness === 'pass') publicReadiness = 'warn';
    notes.push('Scope should read as applicant-facing. Explain what the intern will do, learn, or produce.');
  }

  return {
    grammar,
    level: publicReadiness,
    spelling,
    publicReadiness,
    notes,
    suggestedTitle: generateTitleSuggestion(title, internCategory, techDomain),
    suggestedScope: generateScopeSuggestion(title, description, internCategory, skills, techDomain),
  };
}
