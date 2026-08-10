/* Session 2 mock data — interests, project matches, archetype quiz (6 Qs). */

export const INTEREST_OPTIONS = [
  'Advanced Systems',
  'Air Systems',
  'Building & Infrastructure',
  'Land Systems',
  'Naval Systems',
  'Simulation & Training Systems',
  'Software Development',
  'Artificial Intelligence',
  'Cloud',
  'Command & Control Systems',
  'Cybersecurity',
  'Data Science/Data Analytics',
  'Infosecurity',
  'Networks & Infrastructure',
  'UI/UX',
  'Others',
] as const;

export const INTEREST_OTHERS_LABEL = 'Others';
export const INTEREST_OTHERS_MAX = 50;

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
  /** Optional supporting line — comps cards show title + icon only. */
  detail?: string;
  archetype: ArchetypeId;
  /** Lucide icon key resolved in the quiz UI. */
  icon:
    | 'radar'
    | 'logs'
    | 'window'
    | 'shield-check'
    | 'shield-alert'
    | 'chart'
    | 'layers'
    | 'bot'
    | 'shield'
    | 'search'
    | 'network'
    | 'rocket'
    | 'crosshair'
    | 'bar-chart'
    | 'pen'
    | 'package'
    | 'swords'
    | 'file-search'
    | 'share'
    | 'zap'
    | 'bug'
    | 'filter'
    | 'workflow'
    | 'send';
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
  /** Mobile quiz-result body — hard line breaks so copy clears the corner art. */
  descriptionMobile: string;
  /** Optional mobile tagline breaks (omit = use tagline). */
  taglineMobile?: string;
  fits: string[];
  /** Title + tagline colour from C-end comps */
  color: string;
}

/** Display copy / colours / tags from C-end result comps. */
export const ARCHETYPES: Record<ArchetypeId, ArchetypeInfo> = {
  pioneer: {
    id: 'pioneer',
    name: 'The Pioneer',
    tagline: 'You turn bold ideas into real-world possibilities.',
    description:
      'You enjoy experimenting, prototyping, and exploring emerging technologies. By combining robotics, embedded systems, and hands-on problem-solving, you create solutions that push boundaries.',
    descriptionMobile:
      'You enjoy experimenting, prototyping, and\nexploring emerging technologies. By\ncombining robotics, embedded systems, and\nhands-on problem-solving, you create\nsolutions that push boundaries.',
    fits: ['Robotics & UAV', 'Rapid Prototyping', 'IoT & Embedded', 'Emerging Tech'],
    color: 'rgba(193, 0, 7, 1)',
  },
  architect: {
    id: 'architect',
    name: 'The Architect',
    tagline: 'You design the systems that bring intelligence, connectivity, and devices into one coherent whole.',
    description:
      'You think in structures, platforms, and possibilities. By shaping communications, connected devices, and AI-enabled systems together, you create the foundations that others build on. If you enjoy turning complexity into elegant solutions, this is where you belong.',
    descriptionMobile:
      'You think in structures, platforms, and\npossibilities. By shaping\ncommunications, connected devices,\nand AI-enabled systems together, you\ncreate the foundations that others build\non. If you enjoy turning complexity into\nelegant solutions, this is where you\nbelong.',
    fits: ['Cellular Networks 0.6', 'Internet of Things 0.5', 'Artificial Intelligence 0.4'],
    color: 'rgba(0, 130, 54, 1)',
  },
  pathfinder: {
    id: 'pathfinder',
    name: 'The Pathfinder',
    tagline: 'You discover new possibilities by connecting intelligence with the world around you.',
    description:
      'You explore data to uncover insights others miss. You connect smart systems and the physical world to solve real problems. You thrive on curiosity, experimentation, and learning by doing—turning possibilities into progress.',
    descriptionMobile:
      'You explore data to uncover insights\nothers miss. You connect smart systems\nand the physical world to solve real\nproblems. You thrive on curiosity\nexperimentation, and learning by doing-\nturning possibilities into progress.',
    fits: ['Artificial Intelligence 1.0', 'Internet of Things 0.4'],
    color: 'rgba(0, 105, 168, 1)',
  },
  sentinel: {
    id: 'sentinel',
    name: 'The Sentinel',
    tagline: 'You protect what matters with intelligence and precision.',
    taglineMobile:
      'You protect what matters with intelligence\nand precision.',
    description:
      'You leverage AI-enabled monitoring and resilient communications to detect threats, analyze signals and act with confidence. From the edge to the cloud, you ensure critical systems stay secure, connected, and mission-ready.',
    descriptionMobile:
      'You leverage AI-enabled monitoring and\nresilient communications to detect\nthreats, analyze signals and act with\nconfidence. From the edge to the cloud,\nyou ensure critical systems stay secure,\nconnected, and mission-ready.',
    fits: ['Artificial Intelligence 0.4', 'Cellular Networks 0.3'],
    color: 'rgba(187, 77, 0, 1)',
  },
};

/** Dashboard / result-card art — PC full card + mobile companion (jpg). */
export function archetypeResultImage(
  id: ArchetypeId,
  viewport: 'pc' | 'mobile' = 'pc',
): string {
  return viewport === 'mobile'
    ? `/images/test-result-${id}-m.jpg`
    : `/images/test-result-${id}.jpg`;
}

/** Six questions × four options (Sentinel → Pathfinder → Architect → Pioneer). */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: 'New intel arrives about a critical security gap. Your first move?',
    options: [
      { title: 'Map the exposure', archetype: 'sentinel', icon: 'radar' },
      { title: 'Mine the logs', archetype: 'pathfinder', icon: 'logs' },
      { title: 'Redesign the system', archetype: 'architect', icon: 'window' },
      { title: 'Automate detection', archetype: 'pioneer', icon: 'shield-check' },
    ],
  },
  {
    question: 'You have a free week to build anything you want. What do you ship?',
    options: [
      { title: 'Threat simulator', archetype: 'sentinel', icon: 'shield-alert' },
      { title: 'Anomaly predictor', archetype: 'pathfinder', icon: 'chart' },
      { title: 'Unified platform', archetype: 'architect', icon: 'layers' },
      { title: 'Autonomous robot', archetype: 'pioneer', icon: 'bot' },
    ],
  },
  {
    question: 'Which mission gets you out of bed in the morning?',
    options: [
      { title: 'Cyber defence', archetype: 'sentinel', icon: 'shield' },
      { title: 'Intelligence analysis', archetype: 'pathfinder', icon: 'search' },
      { title: 'Systems integration', archetype: 'architect', icon: 'network' },
      { title: 'Frontier tech', archetype: 'pioneer', icon: 'rocket' },
    ],
  },
  {
    question: 'Your team hits a critical failure at 2AM. You’re the one who…',
    options: [
      { title: 'Traces the source', archetype: 'sentinel', icon: 'crosshair' },
      { title: 'Pulls the metrics', archetype: 'pathfinder', icon: 'bar-chart' },
      { title: 'Sketches the fix', archetype: 'architect', icon: 'pen' },
      { title: 'Ships a patch', archetype: 'pioneer', icon: 'package' },
    ],
  },
  {
    question: 'How do you naturally approach a big, complex decision?',
    options: [
      { title: 'Think adversarially', archetype: 'sentinel', icon: 'swords' },
      { title: 'Follow the evidence', archetype: 'pathfinder', icon: 'file-search' },
      { title: 'Map the whole system', archetype: 'architect', icon: 'share' },
      { title: 'Try and learn fast', archetype: 'pioneer', icon: 'zap' },
    ],
  },
  {
    question: 'At a hackathon, your signature contribution is…',
    options: [
      { title: 'Red-teaming the room', archetype: 'sentinel', icon: 'bug' },
      { title: 'Cleaning the data', archetype: 'pathfinder', icon: 'filter' },
      { title: 'The system diagram', archetype: 'architect', icon: 'workflow' },
      { title: 'Shipping first', archetype: 'pioneer', icon: 'send' },
    ],
  },
];

export const MAX_RANKED = 5;

/** Score quiz answers → winning archetype.
   +1 per answer; ties break by fixed order: sentinel → pathfinder → architect → pioneer
   (matches docs/Defender-Profile-Quiz-Spec.docx §4–5 and apply-form.tsx). */
export function resolveArchetype(answers: (number | null)[]): ArchetypeInfo {
  const scores: Record<ArchetypeId, number> = {
    sentinel: 0,
    pathfinder: 0,
    architect: 0,
    pioneer: 0,
  };
  answers.forEach((optIndex, qIndex) => {
    if (optIndex == null) return;
    const opt = QUIZ_QUESTIONS[qIndex]?.options[optIndex];
    if (!opt) return;
    const key = opt.archetype as ArchetypeId;
    if (key in scores) scores[key] += 1;
  });
  /* Stable max: first key in insertion order wins ties */
  let best: ArchetypeId = 'sentinel';
  let bestScore = -1;
  (Object.keys(scores) as ArchetypeId[]).forEach((k) => {
    if (scores[k] > bestScore) {
      best = k;
      bestScore = scores[k];
    }
  });
  return ARCHETYPES[best];
}
