import type { Programme, ReqTypeDef, ReqTier, ProjectRequest, ProjectEntry, ProjectSubmissionBatch, Contact, EducationLevel } from './types';
import { SEED_VERSION as SEED_VERSION_REF } from './utils';
import { DISCIPLINE_OPTIONS } from './disciplines';
import { monthYearOptions } from './internship-period';

import programmesJson    from '@/data/programmes.json';
import projectsJson      from '@/data/projects.json';
import requestsJson      from '@/data/requests.json';
import submissionsJson   from '@/data/project-submissions.json';
import contactsJson      from '@/data/contacts.json';

export const DEFAULT_PROGRAMMES = programmesJson  as unknown as Programme[];
export const ALL_PROJECTS        = projectsJson   as unknown as ProjectEntry[];
export const ALL_REQUESTS        = requestsJson   as unknown as ProjectRequest[];
export const SUBMISSION_SEED     = submissionsJson as unknown as ProjectSubmissionBatch[];

/** Address book — DSTA people available in the To / Cc recipient autocomplete.
   Each contact carries `pc` + `department`, so the project-request form derives the
   PC Head (To) and AD (P&C) (Cc) directly from the chosen Programme Centre. */
export const CONTACTS            = contactsJson    as unknown as Contact[];

export type ColumnSection = 'Overview' | 'Classification' | 'Academic Requirements' | 'Logistics' | 'Mentor Information';

export const COLUMN_SECTIONS: ColumnSection[] = [
  'Overview',
  'Classification',
  'Academic Requirements',
  'Logistics',
  'Mentor Information',
];

export interface ProjectSubmissionColumn {
  name:            string;
  required:        boolean;
  usedForMatching: boolean;
  description:     string;
  example:         string;
  fieldType:       'text' | 'dropdown';
  dropdownValues?: string[];
  section:         ColumnSection;
}

/* Status badge colours (shared between request and project status badges). These
   exact bg/text pairs are used by the product prototypes in requests.tsx. */
export const STATUS_COLOURS = {
  draft:      'bg-[rgba(244,242,236,1)] text-[rgba(69,85,108,1)]',
  pending:    'bg-[rgba(254,154,0,0.15)] text-[rgba(187,77,0,1)]',
  incomplete: 'bg-[rgba(254,154,0,0.15)] text-[rgba(187,77,0,1)]',
  fulfilled:  'bg-[rgba(0,201,80,0.15)] text-[rgba(0,130,54,1)]',
  closed:     'bg-[rgba(244,242,236,1)] text-[rgba(69,85,108,1)]',
  withdrawn:  'bg-[rgba(251,44,54,0.15)] text-[rgba(193,0,7,1)]',
  expired:    'bg-[rgba(251,44,54,0.15)] text-[rgba(193,0,7,1)]',
  // Project-only statuses that map to the same semantic colours
  approved:        'bg-[rgba(0,201,80,0.15)] text-[rgba(0,130,54,1)]',
  rejected:        'bg-[rgba(251,44,54,0.15)] text-[rgba(193,0,7,1)]',
  returnedForUpdate: 'bg-[rgba(251,44,54,0.15)] text-[rgba(193,0,7,1)]',
  frozen:          'bg-[rgba(254,154,0,0.15)] text-[rgba(187,77,0,1)]',
} as const;

function textOnly(cls: string) {
  return cls.split(' ').filter(c => c.startsWith('text-')).join(' ') || cls;
}

/* Project item status text colours (no badge background) — used for sub rows in request tables. */
export const ITEM_STATUS_COLOURS = {
  notSubmitted:      'text-[rgba(69,85,108,1)]',
  pendingReview:     textOnly(STATUS_COLOURS.pending),
  returnedForUpdate: textOnly(STATUS_COLOURS.returnedForUpdate),
  pendingDceApproval: textOnly(STATUS_COLOURS.frozen),
  approved:          textOnly(STATUS_COLOURS.approved),
  rejected:          textOnly(STATUS_COLOURS.rejected),
} as const;

/* Competency Domains (from SDP) — the approved Tech Competency list used by the
   project templates and the project forms. Column B of the SDP source list. */
export const COMPETENCY_DOMAINS = [
  'Asset Accounting (AESP)',
  'BI Geospatial Information Management & Application (AESP)',
  'BIM/ CAD Applications (AESP)',
  'Construction Contract Management (AESP)',
  'Construction Quality Management (AESP)',
  'Construction Safety Management (AESP)',
  'Estates Management (AESP)',
  'Facilities Management (AESP)',
  'Land Surveying (AESP)',
  'Naval Construction Quality Management (AESP)',
  'O&S Safety & Quality (AESP)',
  'O&S System Support (AESP)',
  'Quality Assurance (AESP)',
  'Structural Supervision (AESP)',
  'Business Planning and Organisational Performance Monitoring and Analysis',
  'Corporate Administration',
  'Corporate Branding',
  'Corporate Governance',
  'Customer Management and Experience',
  'Engaging Staff',
  'Finance Controls, Processes and Execution',
  'Financial Accounting and Reporting',
  'Financial Planning, Budget Management and Financial Analysis',
  'HR Business Partnership',
  'HR Career Development',
  'HR Competency Development',
  'HR Employee Engagement',
  'HR Employer Branding',
  'HR Ethics and Conduct Management',
  'HR Learning and Development',
  'HR Performance Management',
  'HR Planning',
  'HR Policies, Process and Legislation',
  'HR Recruitment',
  'HR Systems',
  'HR Talent Management and Succession Planning',
  'HR Total Rewards',
  'Information Resource Management and Research',
  'Learning Technology and Services',
  'Legal Services',
  'Operational Audit',
  'PRM Building and Infrastructure',
  'PRM Cataloguing Policy and Processes',
  'PRM Digital Technology',
  'PRM General Products and Services',
  'PRM Logistics Support',
  'PRM Rapid Acquisition',
  'PRM Specialised Services and Equipment',
  'PRM Sustainment',
  'PRM Weapon System Acquisition',
  'Procurement Governance',
  'Procurement Operations',
  'Security Governance',
  'Security Operations',
  'Service Planning, Processes and Execution',
  'Strategy, Planning and Management',
  'System Process Design and Improvement',
  'Technology Audit',
  'Training Design and Development',
  'UX Design',
  'Additive Manufacturing (3DP)',
  'Agile',
  'Air Bases Design and Integration',
  'Air Vehicle Design and Integration',
  'Airborne Mission Systems Integration',
  'Application Platform',
  'Architecture',
  'Armament Quality and Safety Assurance',
  'Army Camps Design and Integration',
  'Artificial Intelligence',
  'Biodiversity and Environmental Management',
  'Cellular Networks',
  'Chemical Biological Radiological and Nuclear',
  'Civil and Structural Engineering',
  'Client and IT Service Management',
  'Cloud Infrastructure',
  'Cognitive Systems Engineering',
  'Collaboration Application Development',
  'Command and Control Development',
  'Communications',
  'Communications Electronic Warfare',
  'Cyber Defence',
  'Cyber Developments',
  'Data Engineering',
  'Data Science',
  'Design Innovation',
  'Electrical Engineering',
  'Electronic Warfare',
  'Electro-Optics',
  'Environmental Sustainability',
  'ERP (SAP) Application Development',
  'Estates Management',
  'Extended Reality (XR)',
  'Facilities Management',
  'Guided Weapon',
  'Gun Systems',
  'Information Assurance',
  'Information Defence',
  'IoT',
  'IT Management',
  'IT System Architecture and Development',
  'Land Combat Systems Design and Integration',
  'Land Platform Protection',
  'Land Vehicles',
  'Life Cycle Management',
  'Logistics Support Analysis',
  'Mechanical Engineering',
  'Mobility / Counter-Mobility Systems',
  'Modelling and Simulation Development',
  'Munitions',
  'Naval Architecture (Submarines)',
  'Naval Architecture (Surface)',
  'Naval Bases Design and Integration',
  'Naval Combat Systems Integration',
  'Naval Platform Systems (Submarines)',
  'Naval Platform Systems (Surface)',
  'Networked Systems Integration',
  'New Space',
  'Operations and Support Engineering',
  'Operations Research',
  'Protective Engineering',
  'Quality Assurance',
  'Quantity Surveying',
  'Radar',
  'Range, Storage and Explosives Safety',
  'Reliability, Availability and Maintainability',
  'Rock Engineering',
  'Simulation Systems',
  'Software Development',
  'Software Quality',
  'Software Safety',
  'Soldier Systems',
  'Space',
  'System Safety',
  'Systems Architecting',
  'Systems Resiliency',
  'Transmission Networks',
  'Underwater Sensors',
  'Underwater Weapons',
  'Unmanned Aircraft System',
  'Unmanned Ground Vehicles',
  'Unmanned Maritime Systems',
];

export const PROJECT_SUBMISSION_COLUMNS: ProjectSubmissionColumn[] = [
  // Projects are submitted against an Intern Category, not a programme. Programme
  // tagging happens later, when an IO creates a programme and attaches approved
  // projects of the matching Intern Category.
  { name: 'Project Title',               section: 'Overview',              required: true,  usedForMatching: false, fieldType: 'text',                                                                                                                                                                                                                                                       description: 'Title of the internship project (max 255 characters).',                                                                      example: 'AI-Driven Threat Detection System' },
  { name: 'Project Scope',               section: 'Overview',              required: true,  usedForMatching: false, fieldType: 'text',                                                                                                                                                                                                                                                       description: 'Project overview including (1) Project Overview/Preamble, (2) Learning Outcomes, and (3) Expected Deliverables (max 500 characters).', example: 'Interns will develop ML models for anomaly detection in network traffic…' },
  { name: 'PC',                          section: 'Classification',        required: true,  usedForMatching: false, fieldType: 'dropdown', dropdownValues: ['AS', 'CIO', 'Cyber', 'DH', 'EDS', 'Info', 'MDS', 'PC3', 'PC4', 'PC5', 'PC6', 'PC8', 'PC9', 'PC10', 'PC11', 'SECC', 'STSH'],                                                                                                                                                                                      description: 'Programme Centre code. Select from the approved list of PC codes.',                                                          example: 'PC3' },
  { name: 'Intern Category',             section: 'Classification',        required: true,  usedForMatching: true,  fieldType: 'dropdown', dropdownValues: ['Undergraduate Scholar/Merit Scholar', 'Tech UP', 'Undergraduate Student', 'Junior College Scholar/Junior College Student', 'Polytechnic Scholar/Polytechnic Student', 'Post Junior College/Post Polytechnic Student', 'Young Defence Scientist Programme'], description: 'Target intern category. Select one from the approved list.',                                                                  example: 'Undergraduate Student' },
  { name: 'Tech Domain',                 section: 'Classification',        required: true,  usedForMatching: true,  fieldType: 'dropdown', dropdownValues: COMPETENCY_DOMAINS,        description: 'Primary competency domain. Select one from the approved list.',                                                              example: 'Cyber Defence' },
  { name: 'Emerging Area',               section: 'Classification',        required: true,  usedForMatching: true,  fieldType: 'dropdown', dropdownValues: ['Artificial Intelligence', 'Cellular Networks', 'Environmental Sustainability', 'Extended Reality', 'Internet of Things', 'New Space', 'Unmanned Aircraft Systems', 'Unmanned Ground Vehicles', 'Unmanned Maritime Systems'],           description: 'Emerging technology area the project touches on. Select one from the approved list.',                                        example: 'Artificial Intelligence' },
  { name: 'Discipline of Study 1',       section: 'Academic Requirements', required: true,  usedForMatching: true,  fieldType: 'dropdown', dropdownValues: DISCIPLINE_OPTIONS,                                                                                                                                                                                                              description: 'Primary academic discipline required. Pick one from the approved list.',                                                    example: 'Computer Science' },
  { name: 'Discipline of Study 2',       section: 'Academic Requirements', required: false, usedForMatching: false, fieldType: 'dropdown', dropdownValues: DISCIPLINE_OPTIONS,                                                                                                                                                                                                              description: 'Optional second discipline, if the project suits more than one. Leave blank if not needed.',                                example: 'Electrical Engineering' },
  { name: 'Discipline of Study 3',       section: 'Academic Requirements', required: false, usedForMatching: false, fieldType: 'dropdown', dropdownValues: DISCIPLINE_OPTIONS,                                                                                                                                                                                                              description: 'Optional third discipline. Leave blank if not needed.',                                                                     example: '' },
  { name: 'Skills / Knowledge Required', section: 'Academic Requirements', required: true,  usedForMatching: true,  fieldType: 'text',                                                                                                                                                                                                                                                       description: 'Key skills or knowledge required. Assess according to the respective intern category.',                                      example: 'Python, Machine Learning, Network Security' },
  { name: 'No. of Placements',           section: 'Logistics',             required: true,  usedForMatching: false, fieldType: 'text',                                                                                                                                                                                                                                                       description: 'Total number of intern slots available (integer).',                                                                          example: '2' },
  { name: 'Project Duration',            section: 'Logistics',             required: true,  usedForMatching: false, fieldType: 'dropdown', dropdownValues: ['1 Month', '2 Months', '3 Months', '4 Months', '6 Months', '12 Months'],                                                                                                                                                       description: 'Length of the project. Select from the approved list.',                                                                       example: '3 Months' },
  { name: 'Internship Start Month',      section: 'Logistics',             required: true,  usedForMatching: true,  fieldType: 'dropdown', dropdownValues: monthYearOptions(2025, 2028),                                                                                                                                                                                                              description: 'Month the internship starts. Together with the end month this is the project internship period, matched against the programme intake window.', example: 'Jan 2026' },
  { name: 'Internship End Month',        section: 'Logistics',             required: true,  usedForMatching: true,  fieldType: 'dropdown', dropdownValues: monthYearOptions(2025, 2028),                                                                                                                                                                                                              description: 'Month the internship ends. Must be on or after the start month.',                                                            example: 'Jun 2026' },
  { name: 'Full Name of Main Mentor',    section: 'Mentor Information',    required: true,  usedForMatching: false, fieldType: 'text',                                                                                                                                                                                                                                                       description: 'Full name of the supervising mentor.',                                                                                       example: 'Dr James Tan' },
  { name: 'Main Mentor Appointment',     section: 'Mentor Information',    required: true,  usedForMatching: false, fieldType: 'text',                                                                                                                                                                                                                                                       description: 'Official appointment/designation of the main mentor (e.g. Principal Engineer, Senior Manager).',                             example: 'Principal Engineer' },
  { name: 'Main Mentor Email',            section: 'Mentor Information',    required: true,  usedForMatching: false, fieldType: 'text',                                                                                                                                                                                                                                                       description: 'DSTA email address of the main mentor. Used to link the mentor to their portal account.',                                   example: 'james_tan@dsta.gov.sg' },
  { name: 'Main Mentor Write-up',        section: 'Mentor Information',    required: true,  usedForMatching: false, fieldType: 'text',                                                                                                                                                                                                                                                       description: 'Brief professional background of the main mentor (max 300 characters). Include designation, years of experience, and relevant expertise. This is displayed on the project detail page.', example: 'Senior Engineer with 10 years in cybersecurity. PhD from NUS. Led national-level cyber incident response exercises.' },
];

/** Static fallback: Active + Draft programmes from seed data */
export const PROGRAMMES_LIST = DEFAULT_PROGRAMMES
  .filter(p => p.status === 'Active' || p.status === 'Draft')
  .map(p => ({ value: p.id, label: p.title }));

/** Read live programme list from localStorage, Active + Draft. Falls back to seed. */
export function loadLiveProgrammeOptions(): { value: string; label: string }[] {
  if (typeof window === 'undefined') return PROGRAMMES_LIST;
  try {
    const storedVer = localStorage.getItem('dsta_programmes_ver');
    const raw = localStorage.getItem('dsta_programmes');
    let progs: Programme[];
    if (storedVer !== SEED_VERSION_REF) {
      // Prefer existing data (cloud hydrate) over wiping with seed.
      if (raw) {
        progs = JSON.parse(raw) as Programme[];
        localStorage.setItem('dsta_programmes_ver', SEED_VERSION_REF);
      } else {
        progs = DEFAULT_PROGRAMMES;
        localStorage.setItem('dsta_programmes', JSON.stringify(DEFAULT_PROGRAMMES));
        localStorage.setItem('dsta_programmes_ver', SEED_VERSION_REF);
      }
    } else {
      progs = raw ? JSON.parse(raw) : DEFAULT_PROGRAMMES;
    }
    return progs
      .filter(p => p.status === 'Active' || p.status === 'Draft')
      .map(p => ({ value: p.id, label: p.title }));
  } catch { return PROGRAMMES_LIST; }
}

/** Prepopulated nationality (country) list for the eligibility Nationality field.
 *  Singapore first, then common ASEAN + major countries, with an Other catch-all. */
export const NATIONALITY_OPTIONS: string[] = [
  'Singapore',
  'Malaysia', 'Indonesia', 'Thailand', 'Vietnam', 'Philippines', 'Myanmar', 'Brunei', 'Cambodia', 'Laos',
  'China', 'India', 'Japan', 'South Korea', 'Taiwan', 'Hong Kong',
  'United Kingdom', 'United States', 'Australia', 'Canada', 'Germany', 'France',
  'Other',
];

export const REQ_TYPES: ReqTypeDef[] = [
  { key: 'citizenship', label: 'Nationality',         tier: 'basic', kind: 'select', opts: NATIONALITY_OPTIONS },
  {
    key: 'institution', label: 'Name of Institution', tier: 'additional', kind: 'multiselect', searchable: true,
    groups: [
      {
        label: 'Junior Colleges',
        opts: [
          'Anderson Serangoon Junior College (ASRJC)',
          'Anglo-Chinese Junior College (ACJC)',
          'Catholic Junior College (CJC)',
          'Eunoia Junior College (EJC)',
          'Innova Junior College (IJC)',
          'Jurong Pioneer Junior College (JPJC)',
          'Millennia Institute (MI)',
          'Nanyang Junior College (NYJC)',
          'National Junior College (NJC)',
          'St Andrew\'s Junior College (SAJC)',
          'Tampines Meridian Junior College (TMJC)',
          'Temasek Junior College (TJC)',
          'Victoria Junior College (VJC)',
        ],
      },
      {
        label: 'IP / Independent Schools',
        opts: [
          'Anglo-Chinese School (Independent)',
          'Dunman High School',
          'Hwa Chong Institution (HCI)',
          'Nanyang Girls\' High School (NYGH)',
          'NUS High School of Mathematics and Science',
          'Raffles Girls\' School (RGS)',
          'Raffles Institution (RI)',
          'River Valley High School (RVHS)',
          'Singapore Chinese Girls\' School (SCGS)',
          'St Joseph\'s Institution (SJI)',
        ],
      },
      {
        label: 'SAP Secondary Schools',
        opts: [
          'Anglo-Chinese School (Barker Road)',
          'Catholic High School',
          'CHIJ St Nicholas Girls\' School',
          'Chung Cheng High School (Main)',
          'Chung Cheng High School (Yishun)',
          'Geylang Methodist School (Secondary)',
          'Maris Stella High School',
          'Nan Chiau High School',
          'Paya Lebar Methodist Girls\' School (Secondary)',
          'St Hilda\'s Secondary School',
          'Tanjong Katong Girls\' School',
        ],
      },
      {
        label: 'Government & Government-aided Secondary Schools',
        opts: [
          'Ahmad Ibrahim Secondary School',
          'Anderson Secondary School',
          'Anglican High School',
          'Ang Mo Kio Secondary School',
          'Assumption English School',
          'Balestier Hill Secondary School',
          'Bartley Secondary School',
          'Beatty Secondary School',
          'Bedok Green Secondary School',
          'Bedok North Secondary School',
          'Bedok View Secondary School',
          'Bendemeer Secondary School',
          'Bishan Park Secondary School',
          'Bowen Secondary School',
          'Broadrick Secondary School',
          'Bukit Batok Secondary School',
          'Bukit Merah Secondary School',
          'Bukit Panjang Government High School',
          'Bukit View Secondary School',
          'Canberra Secondary School',
          'Cedar Girls\' Secondary School',
          'Changkat Changi Secondary School',
          'CHIJ Secondary (Toa Payoh)',
          'CHIJ St Joseph\'s Convent',
          'CHIJ St Theresa\'s Convent',
          'Chong Boon Secondary School',
          'Clementi Town Secondary School',
          'Commonwealth Secondary School',
          'Compassvale Secondary School',
          'Coral Secondary School',
          'Crescent Girls\' School',
          'Damai Secondary School',
          'Deyi Secondary School',
          'Dunman Secondary School',
          'East Spring Secondary School',
          'East View Secondary School',
          'Edgefield Secondary School',
          'Evergreen Secondary School',
          'Fairfield Methodist School (Secondary)',
          'Fuchun Secondary School',
          'Fuhua Secondary School',
          'Gan Eng Seng School',
          'Greendale Secondary School',
          'Greenridge Secondary School',
          'Greenview Secondary School',
          'Hillgrove Secondary School',
          'Holy Innocents\' High School',
          'Hong Kah Secondary School',
          'Hougang Secondary School',
          'Junyuan Secondary School',
          'Jurongville Secondary School',
          'Jurong Secondary School',
          'Kranji Secondary School',
          'Kuo Chuan Presbyterian Secondary School',
          'Loyang View Secondary School',
          'Marsiling Secondary School',
          'Mayflower Secondary School',
          'Meridian Secondary School',
          'Methodist Girls\' School (Secondary)',
          'Montfort Secondary School',
          'Nan Hua High School',
          'New Town Secondary School',
          'Ngee Ann Secondary School',
          'North Vista Secondary School',
          'Northbrooks Secondary School',
          'Northland Secondary School',
          'Orchid Park Secondary School',
          'Pasir Ris Crest Secondary School',
          'Pasir Ris Secondary School',
          'Peirce Secondary School',
          'Ping Yi Secondary School',
          'Pioneer Secondary School',
          'Punggol Secondary School',
          'Queenstown Secondary School',
          'Queensway Secondary School',
          'Regent Secondary School',
          'Sembawang Secondary School',
          'Seng Kang Secondary School',
          'Shuqun Secondary School',
          'Siglap Secondary School',
          'Springfield Secondary School',
          'St Anthony\'s Canossian Secondary School',
          'St Gabriel\'s Secondary School',
          'St Margaret\'s Secondary School',
          'St Patrick\'s School',
          'Swiss Cottage Secondary School',
          'Tampines Secondary School',
          'Tanglin Secondary School',
          'Tanjong Katong Secondary School',
          'Teck Ghee Secondary School',
          'Unity Secondary School',
          'Victoria School',
          'West Spring Secondary School',
          'Westwood Secondary School',
          'Whitley Secondary School',
          'Woodgrove Secondary School',
          'Woodlands Ring Secondary School',
          'Woodlands Secondary School',
          'Xinmin Secondary School',
          'Yio Chu Kang Secondary School',
          'Yishun Secondary School',
          'Yishun Town Secondary School',
          'Yuan Ching Secondary School',
          'Yuhua Secondary School',
          'Yuying Secondary School',
          'Zhenghua Secondary School',
          'Zhonghua Secondary School',
        ],
      },
      {
        label: 'Polytechnics',
        opts: [
          'Nanyang Polytechnic (NYP)',
          'Ngee Ann Polytechnic (NP)',
          'Republic Polytechnic (RP)',
          'Singapore Polytechnic (SP)',
          'Temasek Polytechnic (TP)',
        ],
      },
      {
        label: 'ITE Colleges',
        opts: [
          'ITE College Central',
          'ITE College East',
          'ITE College West',
        ],
      },
      {
        label: 'Universities',
        opts: [
          'National University of Singapore (NUS)',
          'Nanyang Technological University (NTU)',
          'Singapore Management University (SMU)',
          'Singapore University of Technology and Design (SUTD)',
          'Singapore Institute of Technology (SIT)',
          'Singapore University of Social Sciences (SUSS)',
        ],
      },
    ],
  },
  { key: 'education',   label: 'Education Level',    tier: 'basic', kind: 'select',      opts: ['Secondary School', 'Junior College', 'IB Diploma', 'Polytechnic', 'University', 'University (Year 1)', 'University (Year 2)', 'University (Year 3)', 'University (Year 4)'] },
  { key: 'race',        label: 'Race',               tier: 'basic', kind: 'multiselect', opts: ['Chinese', 'Malay', 'Indian', 'Others'] },
  { key: 'gpa',         label: 'Minimum GPA',        tier: 'academic', kind: 'number',      placeholder: 'e.g. 3.5', step: '0.1' },
  { key: 'major',       label: 'Course / Major',     tier: 'additional', kind: 'text',        placeholder: 'e.g. Computer Science' },
  {
    key: 'alevel_subject_grade', label: 'A-Level Subject & Grade', tier: 'academic', kind: 'subject-grade',
    opts: [
      // Mathematics
      'General Paper (H1)',
      'Mathematics (H1)', 'Mathematics (H2)', 'Further Mathematics (H2)', 'Mathematics (H3)',
      // Sciences
      'Physics (H1)', 'Physics (H2)', 'Physics (H3)',
      'Chemistry (H1)', 'Chemistry (H2)', 'Chemistry (H3)',
      'Biology (H1)', 'Biology (H2)', 'Biology (H3)',
      'Computing (H2)',
      // Humanities & Social Sciences
      'Economics (H1)', 'Economics (H2)', 'Economics (H3)',
      'History (H1)', 'History (H2)',
      'Geography (H1)', 'Geography (H2)',
      'Literature in English (H1)', 'Literature in English (H2)',
      'Knowledge & Inquiry (H2)',
      // Business & Accounting
      'Management of Business (H2)',
      'Principles of Accounting (H2)',
      // Languages
      'Chinese Language (H1)', 'Chinese Language (H2)', 'Chinese Language & Literature (H2)',
      'Malay Language (H1)', 'Malay Language (H2)',
      'Tamil Language (H1)', 'Tamil Language (H2)',
      // Arts
      'Art (H1)', 'Art (H2)', 'Music (H2)', 'Theatre Studies and Drama (H2)',
    ],
    gradeOpts: ['A', 'B', 'C', 'D', 'E', 'S', 'U'],
  },
  {
    key: 'ib_subject_grade', label: 'IB Subject & Grade', tier: 'academic', kind: 'subject-grade',
    opts: [
      // Group 5 – Mathematics
      'Mathematics: Analysis & Approaches (HL)', 'Mathematics: Analysis & Approaches (SL)',
      'Mathematics: Applications & Interpretation (HL)', 'Mathematics: Applications & Interpretation (SL)',
      // Group 4 – Sciences
      'Physics (HL)', 'Physics (SL)',
      'Chemistry (HL)', 'Chemistry (SL)',
      'Biology (HL)', 'Biology (SL)',
      'Computer Science (HL)', 'Computer Science (SL)',
      'Design Technology (HL)', 'Design Technology (SL)',
      'Environmental Systems & Societies (SL)',
      // Group 3 – Individuals & Societies
      'Economics (HL)', 'Economics (SL)',
      'Business Management (HL)', 'Business Management (SL)',
      'History (HL)', 'History (SL)',
      'Geography (HL)', 'Geography (SL)',
      'Psychology (HL)', 'Psychology (SL)',
      'Global Politics (HL)', 'Global Politics (SL)',
      'Information Technology in a Global Society (HL)', 'Information Technology in a Global Society (SL)',
      // Group 1 – Language & Literature
      'Language A: Literature (HL)', 'Language A: Literature (SL)',
      'Language A: Language & Literature (HL)', 'Language A: Language & Literature (SL)',
      // Group 2 – Language Acquisition
      'Language B (HL)', 'Language B (SL)', 'Language Ab Initio (SL)',
      // Group 6 – Arts
      'Visual Arts (HL)', 'Visual Arts (SL)',
      'Music (HL)', 'Music (SL)',
      'Theatre (HL)', 'Theatre (SL)',
      'Film (HL)', 'Film (SL)',
    ],
    gradeOpts: ['7', '6', '5', '4', '3', '2', '1'],
  },
  { key: 'ib_score', label: 'IB Total Score (min)', tier: 'academic', kind: 'number', placeholder: 'e.g. 35', step: '1' },
  {
    key: 'olevel_subject_grade', label: 'O-Level Subject & Grade', tier: 'academic', kind: 'subject-grade',
    opts: [
      // Languages
      'English Language', 'Higher Chinese', 'Higher Malay', 'Higher Tamil',
      'Chinese Language', 'Malay Language', 'Tamil Language',
      'French', 'German', 'Japanese', 'Hindi',
      // Humanities
      'Social Studies', 'Combined Humanities', 'History', 'Geography',
      'Literature in English', 'Literature in Chinese', 'Literature in Malay', 'Literature in Tamil',
      // Mathematics
      'Mathematics', 'Additional Mathematics',
      // Sciences
      'Physics', 'Chemistry', 'Biology',
      'Combined Science (Physics/Chemistry)', 'Combined Science (Chemistry/Biology)', 'Combined Science (Physics/Biology)',
      // Technical & Applied
      'Principles of Accounts', 'Computer Applications', 'Design & Technology',
      'Food & Nutrition', 'Elements of Business Skills', 'Nutrition & Food Science',
      // Arts
      'Art', 'Music',
    ],
    gradeOpts: ['A1', 'A2', 'B3', 'B4', 'C5', 'C6', 'D7', 'E8', 'F9'],
  },
  {
    key: 'ip_subject_grade', label: 'IP Subject & Grade', tier: 'academic', kind: 'subject-grade',
    opts: [
      // Mathematics
      'Mathematics', 'Additional Mathematics', 'Further Mathematics',
      // Sciences
      'Physics', 'Chemistry', 'Biology', 'Combined Science',
      // Computing
      'Computing', 'Computer Science',
      // Humanities & Social Sciences
      'History', 'Geography', 'Economics', 'Literature in English',
      'Social Studies', 'Combined Humanities',
      // Languages
      'English Language', 'Chinese Language', 'Higher Chinese',
      'Malay Language', 'Higher Malay', 'Tamil Language', 'Higher Tamil',
      // Arts
      'Art', 'Music', 'Design & Technology',
    ],
    gradeOpts: ['A1', 'A2', 'B3', 'B4', 'C5', 'C6', 'D7', 'E8', 'F9'],
  },
  {
    key: 'nushigh_subject_grade', label: 'NUS High Subject & Grade', tier: 'academic', kind: 'subject-grade',
    opts: [
      // Mathematics
      'Mathematics I', 'Mathematics II', 'Mathematics III', 'Mathematics IV', 'Mathematics V', 'Mathematics VI',
      // Sciences
      'Physics I', 'Physics II', 'Physics III', 'Physics IV', 'Physics V', 'Physics VI',
      'Chemistry I', 'Chemistry II', 'Chemistry III', 'Chemistry IV', 'Chemistry V', 'Chemistry VI',
      'Biology I', 'Biology II', 'Biology III', 'Biology IV', 'Biology V', 'Biology VI',
      // Computing
      'Computing & Information Technology I', 'Computing & Information Technology II',
      'Computing & Information Technology III', 'Computing & Information Technology IV',
      // Humanities
      'Humanities & Social Sciences I', 'Humanities & Social Sciences II',
      'Humanities & Social Sciences III', 'Humanities & Social Sciences IV',
      // Languages
      'English Language Arts I', 'English Language Arts II', 'English Language Arts III',
      'Chinese Language I', 'Chinese Language II', 'Chinese Language III',
      // Arts
      'Arts I', 'Arts II', 'Arts III',
    ],
    gradeOpts: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'],
  },
  { key: 'nushigh_cap', label: 'NUS High CAP (min)', tier: 'academic', kind: 'number', placeholder: 'e.g. 3.5', step: '0.1' },
  { key: 'age',         label: 'Maximum Age',        tier: 'additional', kind: 'number',      placeholder: 'e.g. 26', step: '1' },
];

/** Section headings for the eligibility criterion palette, in display order.
 *  `basic` is managed in its own panel, so it is intentionally omitted here. */
export const REQ_TIER_LABELS: { tier: ReqTier; label: string }[] = [
  { tier: 'academic',   label: 'Academic' },
  { tier: 'additional', label: 'Additional' },
];

/** Tier a criterion type belongs to (defaults to `academic` for unknown keys). */
export function tierOfReqType(key: string): ReqTier {
  return REQ_TYPES.find(t => t.key === key)?.tier ?? 'academic';
}

/* ── Recognised-subject taxonomy (TOA-068) ───────────────────────────────
   DSTA admins can add/remove the recognised subjects per qualification without
   NTT — the lists below default to the hardcoded REQ_TYPES options and are
   overridden (and audited) from Admin → Recognised subjects. The rule builder
   reads the live lists so criteria edits take effect immediately. */
export const SUBJECT_TAXONOMY_KEY = 'dsta_subject_taxonomy';
export const SUBJECT_TAXONOMY_DEFS: { key: string; label: string }[] = [
  { key: 'alevel_subject_grade',  label: 'GCE A-Level subjects' },
  { key: 'ib_subject_grade',      label: 'IB subjects' },
  { key: 'olevel_subject_grade',  label: 'GCE O-Level subjects' },
  { key: 'ip_subject_grade',      label: 'IP subjects' },
  { key: 'nushigh_subject_grade', label: 'NUS High subjects' },
];
export function defaultSubjectOpts(key: string): string[] {
  return REQ_TYPES.find(t => t.key === key)?.opts ?? [];
}
/** Effective recognised-subject lists: stored overrides merged over the defaults. */
export function loadSubjectTaxonomy(): Record<string, string[]> {
  let stored: Record<string, string[]> = {};
  if (typeof window !== 'undefined') {
    try { stored = JSON.parse(localStorage.getItem(SUBJECT_TAXONOMY_KEY) || '{}'); } catch {}
  }
  const out: Record<string, string[]> = {};
  for (const d of SUBJECT_TAXONOMY_DEFS) {
    out[d.key] = Array.isArray(stored[d.key]) ? stored[d.key] : defaultSubjectOpts(d.key);
  }
  return out;
}
export function saveSubjectTaxonomy(map: Record<string, string[]>): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(SUBJECT_TAXONOMY_KEY, JSON.stringify(map)); } catch {}
}
/** Live recognised subjects for one qualification (used by the rule builder). */
export function subjectOptsFor(key: string): string[] {
  return loadSubjectTaxonomy()[key] ?? defaultSubjectOpts(key);
}

export const OPS: Record<string, string[]> = {
  select:         ['is', 'is not'],
  number:         ['at least', 'at most'],
  text:           ['contains', 'is exactly'],
  multiselect:    ['is any of'],
  'subject-grade': ['with min grade'],
};

export const COHORT_DATA: Record<string, {
  funnel: { total: number; shortlisted: number; interview: number; offersMade: number; offersAccepted: number; withdrawals: number };
  kpi: { total: string; acceptance: string; response: string; headcount: string; totalTrend: [string,'pos'|'neg'|'neu']; acceptanceTrend: [string,'pos'|'neg'|'neu']; responseTrend: [string,'pos'|'neg'|'neu']; headcountSub: [string,'pos'|'neg'|'neu'] };
  schools: { name: string; count: number }[];
}> = {
  'PROG-0009': {
    funnel:  { total: 100, shortlisted: 36, interview: 15, offersMade: 8, offersAccepted: 5, withdrawals: 2 },
    kpi:     { total: '100', acceptance: '62.5%', response: '3.2d', headcount: '5/8', totalTrend: ['↑ 12% vs last cohort','pos'], acceptanceTrend: ['↑ 5% vs last cohort','pos'], responseTrend: ['↑ 0.4d slower','neg'], headcountSub: ['3 positions remaining','neu'] },
    schools: [{ name: 'NUS', count: 32 }, { name: 'NTU', count: 28 }, { name: 'SMU', count: 18 }, { name: 'SUTD', count: 12 }, { name: 'SIT', count: 10 }],
  },
  'PROG-0010': {
    funnel:  { total: 45, shortlisted: 18, interview: 8, offersMade: 4, offersAccepted: 3, withdrawals: 0 },
    kpi:     { total: '45', acceptance: '75%', response: '2.1d', headcount: '3/4', totalTrend: ['↓ 3% vs last cohort','neg'], acceptanceTrend: ['↑ 10% vs last cohort','pos'], responseTrend: ['↓ 0.5d faster','pos'], headcountSub: ['1 position remaining','neu'] },
    schools: [{ name: 'Raffles Institution', count: 12 }, { name: 'Hwa Chong Institution', count: 10 }, { name: 'Victoria JC', count: 8 }, { name: 'Anglo-Chinese JC', count: 8 }, { name: 'National JC', count: 7 }],
  },
  'PROG-0011': {
    funnel:  { total: 30, shortlisted: 12, interview: 6, offersMade: 3, offersAccepted: 2, withdrawals: 0 },
    kpi:     { total: '30', acceptance: '66.7%', response: '2.5d', headcount: '2/3', totalTrend: ['↑ 5% vs last cohort','pos'], acceptanceTrend: ['↑ 3% vs last cohort','pos'], responseTrend: ['↓ 0.3d faster','pos'], headcountSub: ['1 position remaining','neu'] },
    schools: [{ name: 'Raffles Institution', count: 8 }, { name: 'Hwa Chong Institution', count: 7 }, { name: 'Victoria JC', count: 6 }, { name: 'Anglo-Chinese JC', count: 5 }, { name: 'National JC', count: 4 }],
  },
  'PROG-0008': {
    funnel:  { total: 75, shortlisted: 28, interview: 12, offersMade: 6, offersAccepted: 4, withdrawals: 1 },
    kpi:     { total: '75', acceptance: '66.7%', response: '2.8d', headcount: '4/6', totalTrend: ['↑ 8% vs last cohort','pos'], acceptanceTrend: ['↑ 8% vs last cohort','pos'], responseTrend: ['↓ 0.2d faster','pos'], headcountSub: ['2 positions remaining','neu'] },
    schools: [{ name: 'Ngee Ann Poly', count: 22 }, { name: 'Temasek Poly', count: 20 }, { name: 'Singapore Poly', count: 18 }, { name: 'Republic Poly', count: 10 }, { name: 'Nanyang Poly', count: 5 }],
  },
};

/* ── Project submission dropdown lists ─────────────────────────────────── */
export const PC_CODES = [
  'PC3', 'PC4', 'PC5', 'PC6', 'PC8', 'PC9', 'PC10', 'PC11',
  'AS', 'CIO', 'Cyber', 'DH', 'EDS', 'Info', 'MDS', 'SECC', 'STSH',
];

export const TECH_DOMAINS = COMPETENCY_DOMAINS;

export const EMERGING_AREAS = [
  'New Space',
  'Artificial Intelligence',
  'Environmental Sustainability',
  'Unmanned Aircraft Systems',
  'Unmanned Maritime Systems',
  'Unmanned Ground Vehicles',
  'Cellular Networks',
  'Internet of Things',
  'Extended Reality',
];

/* The 7 canonical Intern Categories — the single key that links project requests,
   submitted/approved projects, and programmes. One value per record. Shown in every
   category dropdown, filter, and badge. (Field is still stored as `educationLevel`
   internally for back-compat; the user-facing concept is "Intern Category".) */
export const INTERN_CATEGORIES = [
  'Undergraduate Scholar/Merit Scholar',
  'Tech UP',
  'Undergraduate Student',
  'Junior College Scholar/Junior College Student',
  'Polytechnic Scholar/Polytechnic Student',
  'Post Junior College/Post Polytechnic Student',
  'Young Defence Scientist Programme',
] as const;

/** The canonical Intern Category list, typed. Alias of INTERN_CATEGORIES. */
export const EDUCATION_LEVELS: readonly EducationLevel[] = INTERN_CATEGORIES as readonly EducationLevel[];

/** Intern categories served by each legacy education level. A "University"
    programme serves the three undergraduate categories; a programme whose level
    is already an intern category serves just that one. */
export const LEVEL_INTERN_CATEGORIES: Record<string, string[]> = {
  University: ['Undergraduate Scholar/Merit Scholar', 'Undergraduate Student', 'Tech UP'],
};
export function internCategoriesForLevel(level: string): string[] {
  return LEVEL_INTERN_CATEGORIES[level] ?? [level];
}

/** Normalise any raw category/level string to a canonical Intern Category, mapping
 *  the legacy Education Level values (used before the rename) onto their nearest new
 *  category so any older localStorage data keeps matching. */
export function toEducationLevel(cat: string): EducationLevel {
  const legacy: Record<string, EducationLevel> = {
    // legacy 5-value Education Level names (pre-rename)
    'University':                              'Undergraduate Student',
    'Scholarship Candidate Interns (SCI)':     'Undergraduate Scholar/Merit Scholar',
    'Junior College':                          'Junior College Scholar/Junior College Student',
    'Polytechnic':                             'Polytechnic Scholar/Polytechnic Student',
    'Post Junior College':                     'Post Junior College/Post Polytechnic Student',
    'Post Polytechnic':                        'Post Junior College/Post Polytechnic Student',
    'Post Junior College / Post Polytechnic':  'Post Junior College/Post Polytechnic Student',
    'Integrated Programme (IP)':               'Young Defence Scientist Programme',
    'Young Defence Scientists Programme (YDSP)':'Young Defence Scientist Programme',
    'YDSP':                                    'Young Defence Scientist Programme',
    // her shorter category labels (from the request-workflow UX) → canonical 7
    'JC Scholar/JC Student':                   'Junior College Scholar/Junior College Student',
    'Poly Scholar/Poly Student':               'Polytechnic Scholar/Polytechnic Student',
    'Post JC/Post Poly Student':               'Post Junior College/Post Polytechnic Student',
  };
  return legacy[cat] ?? (cat as EducationLevel);
}

/** Build a { programmeId -> Education Level } map from the live programmes (localStorage,
   falling back to the seed). Used to link project-submission batches (keyed by programme)
   back to project requests (keyed by Education Level). Client-side. */
export function progEducationLevelMap(): Record<string, string> {
  let progs: Programme[] = DEFAULT_PROGRAMMES;
  if (typeof window !== 'undefined') {
    try { const raw = localStorage.getItem('dsta_programmes'); if (raw) progs = JSON.parse(raw) as Programme[]; } catch { /* fall back to seed */ }
  }
  const map: Record<string, string> = {};
  for (const p of progs) {
    if (p.educationLevel) map[p.id] = p.educationLevel;
  }
  return map;
}

/** The Education Level a submission batch answers — explicit field, else derived from its programme. */
export function batchEducationLevel(batch: ProjectSubmissionBatch, eduMap: Record<string, string>): string {
  return batch.educationLevel ?? eduMap[batch.programme] ?? '';
}

export const WIDGET_DEFS = [
  { id: 'kpi-cards',           label: 'KPI Summary',         desc: 'Key metrics at a glance',            defaultOn: false },
  { id: 'upcoming-interviews', label: 'Upcoming Interviews',  desc: 'Interviews scheduled this week',     defaultOn: false },
  { id: 'top-schools',         label: 'Top Schools',          desc: 'Applicant breakdown by institution', defaultOn: false },
  { id: 'recent-activity',     label: 'Recent Activity',      desc: 'Latest actions and status changes',  defaultOn: false },
];
