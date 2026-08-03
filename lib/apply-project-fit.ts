/* Session 2 mock data — interests, project matches, archetype quiz (6 Qs). */

export const INTEREST_OPTIONS = [
  'AI & Data Analytics',
  'Cybersecurity',
  'Robotics & Autonomous',
  'Sensors & Guided Weapons',
  'C3 Systems',
  'Software Development',
  'Simulation & Immersive Tech',
  'Networks & Infrastructure',
] as const;

export interface ProjectMatch {
  id: string;
  name: string;
  area: string;
  lead: string;
  description: string;
  greatMatch?: boolean;
}

export const PROJECT_MATCHES: ProjectMatch[] = [
  {
    id: 'ai-threat-detection',
    name: 'AI Threat Detection',
    area: 'Cybersecurity',
    lead: 'DR Tan Wei Ming',
    description: 'Train models that flag intrusions before they happen.',
    greatMatch: true,
  },
  {
    id: 'intelligence-data-pipeline',
    name: 'Intelligence Data Pipeline',
    area: 'AI & Data Analytics',
    lead: 'Arjun Menon',
    description: 'Turn messy operational data into decision-ready signal.',
    greatMatch: true,
  },
  {
    id: 'red-team-toolkit',
    name: 'Red-Team Toolkit',
    area: 'Cybersecurity',
    lead: 'Haziq Rahman',
    description: 'Build the tools that stress-test our own defences.',
    greatMatch: true,
  },
  {
    id: 'med-team-toolkit',
    name: 'Med-Team Toolkit',
    area: 'Software Development',
    lead: 'Priya Nair',
    description: 'Prototype clinical decision support for field medical teams.',
    greatMatch: true,
  },
  {
    id: 'autonomous-systems-lab',
    name: 'Autonomous Systems Lab',
    area: 'Robotics & Autonomous',
    lead: 'Mei Lin Koh',
    description: 'Prototype navigation behaviours for autonomous ground systems.',
  },
  {
    id: 'secure-mission-network',
    name: 'Secure Mission Network',
    area: 'Networks & Infrastructure',
    lead: 'Aaron Lim',
    description: 'Improve the resilience of communications in contested environments.',
  },
];

/** Comps-aligned ids (not HTML demo names). */
export type ArchetypeId = 'pioneer' | 'pathfinder' | 'sentinel' | 'architect';

export interface QuizOption {
  title: string;
  detail: string;
  archetype: ArchetypeId;
}

export interface QuizQuestion {
  question: string;
  options: QuizOption[];
}

export interface ArchetypeInfo {
  id: ArchetypeId;
  name: string;
  tagline: string;
  description: string;
  fits: string[];
}

/** Display copy from C-end comps / screenshots — not the HTML concept demo. */
export const ARCHETYPES: Record<ArchetypeId, ArchetypeInfo> = {
  /* Title / tagline / body / tags — exact copy from C-end comps screenshot */
  pioneer: {
    id: 'pioneer',
    name: 'The Pioneer',
    tagline: 'You build things that have never existed.',
    description:
      "Specs don't stop you — you prototype, learn, and ship. Robotics, unmanned systems, IoT, and emerging tech are your playground. If it's never been built before at DSTA, you want to be the one doing it.",
    fits: ['Robotics & UAV', 'Rapid Prototyping', 'IoT & Embedded', 'Emerging Tech'],
  },
  pathfinder: {
    id: 'pathfinder',
    name: 'The Pathfinder',
    tagline: 'You find the signal in the noise.',
    description:
      'Evidence is your compass. You turn raw data into clarity that others act on — finding patterns where others see chaos. Whether training AI models or building intelligence pipelines, you thrive when the problem is complex and the data is messy.',
    fits: ['AI & Machine Learning', 'Data Pipelines', 'Pattern Recognition', 'Decision Intelligence'],
  },
  sentinel: {
    id: 'sentinel',
    name: 'The Sentinel',
    tagline: 'You protect what others overlook.',
    description:
      "You don't just defend — you think like the attacker. Methodical, adversarial-minded, and always one step ahead. You thrive in cybersecurity, threat modelling, and hardening systems before the breach happens.",
    fits: ['Threat Intelligence', 'Red Teaming', 'Zero-Trust Mindset', 'Cyber Resilience'],
  },
  architect: {
    id: 'architect',
    name: 'The Architect',
    tagline: 'You design the scaffolding others build on.',
    description:
      "You see the whole before the parts. While others jump to solutions, you're drawing the system diagram that makes everything else possible. You gravitate toward systems integration, command platforms, and multi-layer engineering challenges.",
    fits: ['Systems Design', 'C2 Platforms', 'Integration Engineering', 'Scalability'],
  },
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: 'New intel arrives about a critical security gap. Your first move?',
    options: [
      {
        title: 'Threat simulator',
        detail: 'A tool that stress-tests how systems hold up under attack.',
        archetype: 'pioneer',
      },
      {
        title: 'Anomaly predictor',
        detail: 'An AI trained on past events to catch the next one early.',
        archetype: 'pathfinder',
      },
      {
        title: 'Redesign the system',
        detail: 'Fix the root structural weakness, not just the gap.',
        archetype: 'architect',
      },
      {
        title: 'Deploy a monitor',
        detail: 'Deploy a monitoring agent before someone exploits it.',
        archetype: 'sentinel',
      },
    ],
  },
  {
    question: 'You have a free week to build anything you want. What do you ship?',
    options: [
      {
        title: 'Threat simulator',
        detail: 'A tool that stress-tests how systems hold up under attack.',
        archetype: 'pioneer',
      },
      {
        title: 'Anomaly predictor',
        detail: 'An AI trained on past events to catch the next one early.',
        archetype: 'pathfinder',
      },
      {
        title: 'Unified platform',
        detail: 'A single layer that ties five disconnected systems into one.',
        archetype: 'architect',
      },
      {
        title: 'Autonomous robot',
        detail: "Something that operates where people can't safely go.",
        archetype: 'pioneer',
      },
    ],
  },
  {
    question: 'Which mission gets you out of bed in the morning?',
    options: [
      {
        title: 'Cyber defence',
        detail: 'Guarding critical infrastructure from digital threats.',
        archetype: 'sentinel',
      },
      {
        title: 'Intelligence analysis',
        detail: 'Turning raw data into decisions that matter.',
        archetype: 'pathfinder',
      },
      {
        title: 'Systems integration',
        detail: 'Making complex platforms seamlessly talk to each other.',
        archetype: 'architect',
      },
      {
        title: 'Frontier tech',
        detail: 'Building unmanned systems or next-gen sensors from scratch.',
        archetype: 'pioneer',
      },
    ],
  },
  {
    question: "Your team hits a critical failure at 2AM. You're the one who...",
    options: [
      {
        title: 'Traces the source',
        detail: "You've seen this pattern — you find the exact attack vector.",
        archetype: 'pioneer',
      },
      {
        title: 'Pulls the metrics',
        detail: 'You correlate logs and surface the real root cause in minutes.',
        archetype: 'pathfinder',
      },
      {
        title: 'Sketches the fix',
        detail: 'You redesign the failing component on the whiteboard in real-time.',
        archetype: 'architect',
      },
      {
        title: 'Ships a patch',
        detail: 'You code and push a working fix before sunrise.',
        archetype: 'pioneer',
      },
    ],
  },
  {
    question: 'How do you naturally approach a big, complex decision?',
    options: [
      {
        title: 'Think adversarially',
        detail: 'Imagine every way it could go wrong, then build defences.',
        archetype: 'sentinel',
      },
      {
        title: 'Follow the evidence',
        detail: 'Data first, intuition second — trust what the numbers say.',
        archetype: 'pathfinder',
      },
      {
        title: 'Map the whole system',
        detail: "Can't decide without seeing how all the parts connect.",
        archetype: 'architect',
      },
      {
        title: 'Try and learn fast',
        detail: 'Move, prototype, discover what works — iteration is your edge.',
        archetype: 'pioneer',
      },
    ],
  },
  {
    question: 'At a hackathon, your signature contribution is...',
    options: [
      {
        title: 'Red-teaming the room',
        detail: 'You poke holes until the idea is battle-ready.',
        archetype: 'sentinel',
      },
      {
        title: 'Building the working demo',
        detail: 'You ship something people can click before the deadline.',
        archetype: 'pioneer',
      },
      {
        title: 'Connecting the APIs',
        detail: 'You stitch the pieces so the whole thing actually runs.',
        archetype: 'architect',
      },
      {
        title: 'Spotting the insight',
        detail: 'You find the pattern in the data that changes the pitch.',
        archetype: 'pathfinder',
      },
    ],
  },
];

export const MAX_RANKED = 5;

/** Score quiz answers → winning archetype (ties prefer pioneer). */
export function resolveArchetype(answers: (number | null)[]): ArchetypeInfo {
  const scores: Record<ArchetypeId, number> = {
    pioneer: 0,
    pathfinder: 0,
    sentinel: 0,
    architect: 0,
  };
  answers.forEach((optIndex, qIndex) => {
    if (optIndex == null) return;
    const opt = QUIZ_QUESTIONS[qIndex]?.options[optIndex];
    if (!opt) return;
    const key = opt.archetype as ArchetypeId;
    if (key in scores) scores[key] += 1;
  });
  let best: ArchetypeId = 'pioneer';
  let bestScore = -1;
  (Object.keys(scores) as ArchetypeId[]).forEach((k) => {
    if (scores[k] > bestScore) {
      best = k;
      bestScore = scores[k];
    }
  });
  return ARCHETYPES[best];
}
