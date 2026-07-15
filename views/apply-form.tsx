'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import DatePicker from '@/components/ui-legacy/date-picker';
import {
  AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, GripVertical, Info,
  Loader2, Lock, Mail, MapPin, Clock, Plus, Search, Send, Shield, Sparkles, Star, Target, User, X,
  BarChart3, Construction, Bot, Brain, Settings, Cpu, Globe, Rocket, TrendingUp, Ruler, Zap,
  Puzzle, Map as MapIcon, Lightbulb, Microscope, Wrench,
} from 'lucide-react';
import { INTERN_CATEGORIES } from '@/lib/data';
import { loadProgrammes, loadProjects } from '@/lib/storage';
import { currentIntakeId } from '@/lib/intakes';
import appFormSeed from '@/data/app-form-templates.json';
import applicationsSeed from '@/data/applications.json';
import type { AppFormTemplate, Application, FormField, MyApplication, Programme, ProjectEntry } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import { addNotification } from '@/lib/notifications';
import { useSystemConfig } from '@/lib/portal-config';
import { extractHighlights } from '@/lib/cv-extract';

/* ── Storage ──────────────────────────────────────────────────────────────── */
const AFT_KEY         = 'dsta_app_form_templates';
const AFT_VER_KEY     = 'dsta_app_form_templates_seed_v';
const AFT_SEED_VER    = '23';
const MY_APPS_KEY     = 'dsta_my_applications';
const IO_APPS_KEY     = 'dsta_applications';
const IO_APPS_VER_KEY = 'dsta_applications_seed_v';
const IO_APPS_VER     = '31';

/* ── Mock data ───────────────────────────────────────────────────────────── */
const MYINFO: Record<string, string> = {
  name:             'Jenny Aw',
  nric:             'T0234567B',
  nationality:      'Singapore Citizen',
  country_of_birth: 'Singapore',
  date_of_birth:    '2002-03-15',
  sex:              'Female',
  mobile:           '9123 4567',
  email:            'jenny.aw@u.nus.edu',
};

// Fields auto-populated when CV is parsed
/* ── CV text extraction ───────────────────────────────────────────────────── */
/* ── PDF text extraction via PDF.js ──────────────────────────────────────── */
async function extractTextFromPdf(file: File): Promise<string> {
  if (typeof window === 'undefined') return '';
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const lines: string[] = [];
    let lastY: number | null = null;
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = (item as { transform: number[] }).transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) lines.push('\n');
      lines.push(item.str);
      lastY = y;
    }
    pageTexts.push(lines.join(' '));
  }
  return pageTexts.join('\n');
}

async function parseCvFile(file: File): Promise<Record<string, string>> {
  let text = '';
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    try { text = await extractTextFromPdf(file); } catch { return {}; }
  } else {
    try { text = await file.text(); } catch { return {}; }
    const printable = text.replace(/[^\x20-\x7E\n\r\t]/g, '');
    if (printable.length / Math.max(text.length, 1) < 0.55) return {};
  }
  if (!text.trim()) return {};
  const result: Record<string, string> = {};

  // ── Institution (uni → poly → JC → secondary/IP) ───────────────────────
  const INST_MAP: [RegExp, string][] = [
    // Universities
    [/\b(?:nus|national university of singapore)\b/i,               'National University of Singapore'],
    [/\b(?:ntu|nanyang technological university)\b/i,               'Nanyang Technological University'],
    [/\b(?:smu|singapore management university)\b/i,                'Singapore Management University'],
    [/\b(?:sutd|singapore university of technology and design)\b/i, 'Singapore University of Technology and Design'],
    [/\b(?:sit|singapore institute of technology)\b/i,              'Singapore Institute of Technology'],
    [/\b(?:suss|singapore university of social sciences)\b/i,       'Singapore University of Social Sciences'],
    // Polytechnics
    [/\b(?:np|ngee ann poly(?:technic)?)\b/i,  'Ngee Ann Polytechnic'],
    [/\b(?:sp|singapore poly(?:technic)?)\b/i, 'Singapore Polytechnic'],
    [/\b(?:rp|republic poly(?:technic)?)\b/i,  'Republic Polytechnic'],
    [/\b(?:tp|temasek poly(?:technic)?)\b/i,   'Temasek Polytechnic'],
    [/\b(?:nyp|nanyang poly(?:technic)?)\b/i,  'Nanyang Polytechnic'],
    // Junior Colleges / IP schools
    [/\b(?:ri|raffles institution)\b/i,                      'Raffles Institution'],
    [/\bhwa chong institution\b/i,                           'Hwa Chong Institution'],
    [/\bhwa chong junior college\b|hcjc\b/i,                 'Hwa Chong Junior College'],
    [/\bvictoria junior college\b|vjc\b/i,                   'Victoria Junior College'],
    [/\banglo.chinese junior college\b|acjc\b/i,             'Anglo-Chinese Junior College'],
    [/\bnanyang junior college\b|nyjc\b/i,                   'Nanyang Junior College'],
    [/\btampines meridian junior college\b|tmjc\b/i,         'Tampines Meridian Junior College'],
    [/\bjurong pioneer junior college\b|jpjc\b/i,            'Jurong Pioneer Junior College'],
    [/\binnova junior college\b|ijc\b/i,                     'Innova Junior College'],
    [/\btemasek junior college\b|tjc\b/i,                    'Temasek Junior College'],
    [/\bcatholic junior college\b|cjc\b/i,                   'Catholic Junior College'],
    [/\beunoia junior college\b|ejc\b/i,                     'Eunoia Junior College'],
    [/\bpioneer junior college\b|pjc\b/i,                    'Pioneer Junior College'],
    [/\bserangoon junior college\b|srjc\b/i,                 'Serangoon Junior College'],
    [/\bsaint andrew.?s junior college\b|sajc\b/i,           "Saint Andrew's Junior College"],
    [/\bst\.?\s*joseph.?s institution\b|sji\b/i,             "St Joseph's Institution"],
    // IP / Secondary schools
    [/\bdunman high school\b/i,                              'Dunman High School'],
    [/\briver valley high school\b|rvhs\b/i,                 'River Valley High School'],
    [/\bcatholic high school\b/i,                            'Catholic High School'],
    [/\bnan hua high school\b/i,                             'Nan Hua High School'],
    [/\bchung cheng high school\b/i,                         'Chung Cheng High School'],
    [/\bcedar girls.?\s+secondary\b/i,                       "Cedar Girls' Secondary School"],
    [/\bcrescent girls.?\s+school\b/i,                       "Crescent Girls' School"],
    [/\bsaint margaret.?s secondary\b/i,                     "Saint Margaret's Secondary School"],
    [/\bbukit panjang government high\b/i,                   'Bukit Panjang Government High School'],
    [/\bpresbyteriam high\b|presbyterian high/i,             'Presbyterian High School'],
  ];
  for (const [re, name] of INST_MAP) {
    if (re.test(text)) { result['name_of_institution'] = name; break; }
  }

  // ── Year of study ────────────────────────────────────────────────────────
  const jcYrMatch = text.match(/\bjc\s*([12])\b/i) ||
    text.match(/\bjunior college[, ]+year\s*([12])\b/i) ||
    text.match(/\b(?:jc|junior college)\s*year\s*([12])\b/i);
  if (jcYrMatch) {
    result['year_of_study'] = `JC${jcYrMatch[1]}`;
  } else {
    const wordYear: Record<string, string> = { first: '1', second: '2', third: '3', fourth: '4', final: '4' };
    const yrMatch =
      text.match(/\byear\s+([1-4])\b/i) ||
      text.match(/\b([1-4])(?:st|nd|rd|th)[- ]year\b/i) ||
      text.match(/\bY([1-4])\b/) ||
      text.match(/\b(first|second|third|fourth|final)[- ]year\b/i);
    if (yrMatch) {
      const raw = yrMatch[1].toLowerCase();
      result['year_of_study'] = `Year ${wordYear[raw] ?? raw}`;
    }
  }

  // ── GPA / CAP / A-Level rank points ─────────────────────────────────────
  const rpMatch =
    text.match(/\b(?:rank points?|rp)[:\s]+([0-9]{2,3}(?:\.[0-9]{1,2})?)\b/i) ||
    text.match(/\b([0-9]{2,3}(?:\.[0-9]{1,2})?)\s+rank points?\b/i);
  if (rpMatch) {
    result['gpa_cap_rank_points'] = `RP: ${rpMatch[1]}`;
  } else {
    const gpaMatch =
      text.match(/\b(?:gpa|cap|cumulative\s+average\s+point)[:\s]+([0-4]\.[0-9]{1,2})\b/i) ||
      text.match(/\b([0-4]\.[0-9]{1,2})\s*\/\s*[45]\.0\b/) ||
      text.match(/\b([0-4]\.[0-9]{1,2})\s+out\s+of\s+[45]/i);
    if (gpaMatch) {
      const gpa = parseFloat(gpaMatch[1]);
      if (gpa >= 0 && gpa <= 5) result['gpa_cap_rank_points'] = gpaMatch[1];
    }
  }

  // ── Course of study ──────────────────────────────────────────────────────
  const diplomaMatch = text.match(/diploma in ([\w\s()\/&'-]{3,60}?)(?:\n|,|\.|;|\s{2,})/i);
  if (diplomaMatch) {
    result['course_of_study'] = `Diploma in ${diplomaMatch[1].trim()}`;
  } else {
    const degreeMatch = text.match(
      /(?:bachelor\s+of|b\.?\s*eng\.?|b\.?\s*sc\.?|b\.?\s*comp\.?|b\.?\s*bus\.?|b\.?\s*acc\.?|b\.?\s*it\.?|b\.?\s*cs\.?)\s+([\w\s()&,/-]{3,60}?)(?=\n|,|\s{2,}|\.|with\s|\()/i,
    );
    if (degreeMatch) {
      result['course_of_study'] = degreeMatch[0].trim().replace(/\s+/g, ' ');
    } else {
      const knownCourses = [
        'Computer Science', 'Computer Engineering', 'Electrical Engineering',
        'Information Engineering', 'Mechanical Engineering', 'Information Systems',
        'Information Technology', 'Data Science and Analytics', 'Business Analytics',
        'Cybersecurity', 'Artificial Intelligence', 'Software Engineering',
        'Mathematics', 'Physics', 'Chemistry', 'Civil Engineering',
        'Chemical Engineering', 'Biomedical Engineering', 'Aerospace Engineering',
      ];
      for (const course of knownCourses) {
        if (new RegExp(`\\b${course}\\b`, 'i').test(text)) { result['course_of_study'] = course; break; }
      }
    }
  }

  // ── Expected graduation ──────────────────────────────────────────────────
  const gradMatch =
    text.match(/(?:expected(?:\s+graduation)?|graduating|grad\.?)[:\s]+([A-Za-z]+\s+20[2-9][0-9])/i) ||
    text.match(/\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+20[2-9][0-9])\b/i);
  if (gradMatch) {
    try {
      const d = new Date(gradMatch[1]);
      if (!isNaN(d.getTime())) result['expected_graduation'] = d.toISOString().split('T')[0];
    } catch { /* ignore */ }
  }

  // ── Subject grades (A-Level H1/H2/H3, O-Level, IP) ──────────────────────
  const subjectLines: string[] = [];

  // A-Level: H1/H2/H3 <subject> <grade A-U>
  const aLevelRe = /\b(H[123])\s+((?:[A-Za-z][A-Za-z() /&'-]{1,40}?))\s+([ABCDESU])\b/g;
  for (const m of Array.from(text.matchAll(aLevelRe))) {
    const sub = m[2].trim().replace(/\s+/g, ' ');
    if (sub.length >= 2 && sub.length <= 45) {
      subjectLines.push(`${m[1]} ${sub}: ${m[3]}`);
    }
  }

  // O-Level / IP O-Level: known subjects followed by A1-F9 grade
  if (subjectLines.length === 0) {
    const OL_SUBJECTS = [
      'english language', 'english literature', 'literature in english',
      'additional mathematics', 'mathematics', 'elementary mathematics',
      'combined science', 'pure physics', 'pure chemistry', 'pure biology',
      'physics', 'chemistry', 'biology',
      'combined humanities', 'history', 'geography', 'social studies',
      'higher chinese', 'higher malay', 'higher tamil',
      'chinese language', 'malay language', 'tamil language', 'mother tongue language',
      'design and technology', 'food and nutrition',
      'principles of accounts', 'computing', 'music', 'art',
    ];
    const olRe = new RegExp(
      `(${OL_SUBJECTS.map(s => s.replace(/[()]/g, '\\$&')).join('|')})[^,\\n]{0,25}([ABCDEF][1-9])\\b`,
      'gi',
    );
    for (const m of Array.from(text.matchAll(olRe))) {
      const sub = m[1].trim().replace(/\s+/g, ' ');
      subjectLines.push(`${sub.charAt(0).toUpperCase() + sub.slice(1)}: ${m[2]}`);
    }
  }

  if (subjectLines.length > 0) {
    result['subject_grades'] = subjectLines.slice(0, 10).join('\n');
  }

  // ── Achievements ─────────────────────────────────────────────────────────
  const achieveLines: string[] = [];
  for (const line of text.split('\n')) {
    const l = line.trim();
    if (/dean[''']?s list|honour roll|gold medal|president[''']?s|merit award|scholarship|finalist|champion|top student/i.test(l) && l.length < 120) {
      achieveLines.push(l);
    }
  }
  if (achieveLines.length > 0) result['achievements'] = achieveLines.slice(0, 5).join('; ');

  // ── Technical skills from CV text ────────────────────────────────────────
  const TECH_SKILL_PATTERNS: [RegExp, string][] = [
    [/\bpython\b/i, 'Python'],            [/\bjavascript\b/i, 'JavaScript'],
    [/\btypescript\b/i, 'TypeScript'],    [/\bc\+\+\b/i, 'C++'],
    [/\bc#\b/i, 'C#'],                   [/\bjava\b/i, 'Java'],
    [/\bmatlab\b/i, 'MATLAB'],           [/\bsql\b/i, 'SQL'],
    [/\btensorflow\b/i, 'TensorFlow'],   [/\bpytorch\b/i, 'PyTorch'],
    [/\bscikit[- ]?learn\b/i, 'scikit-learn'], [/\bopencv\b/i, 'OpenCV'],
    [/\bmachine learning\b/i, 'Machine Learning'],
    [/\bdeep learning\b/i, 'Deep Learning'],
    [/\b(?:natural language processing|nlp)\b/i, 'NLP'],
    [/\bcomputer vision\b/i, 'Computer Vision'],
    [/\bcryptography\b/i, 'Cryptography'],
    [/\bnetworking\b/i, 'Networking'],
    [/\b(?:penetration testing|pentest)\b/i, 'Penetration Testing'],
    [/\bwireshark\b/i, 'Wireshark'],     [/\bmetasploit\b/i, 'Metasploit'],
    [/\blinux\b/i, 'Linux'],             [/\bdocker\b/i, 'Docker'],
    [/\bkubernetes\b/i, 'Kubernetes'],   [/\baws\b/i, 'AWS'],
    [/\bazure\b/i, 'Azure'],
    [/\bsignal processing\b/i, 'Signal Processing'],
    [/\b(?:rf engineering|radio frequency)\b/i, 'RF Engineering'],
    [/\bfpga\b/i, 'FPGA'],              [/\bembedded\b/i, 'Embedded'],
    [/\bros\b/i, 'ROS'],                [/\barduino\b/i, 'Arduino'],
    [/\bpower bi\b/i, 'Power BI'],      [/\btableau\b/i, 'Tableau'],
    [/\bgraph theory\b/i, 'Graph Theory'],
    [/\blinear algebra\b/i, 'Linear Algebra'],
    [/\b(?:data analytics|data analysis)\b/i, 'Data Analytics'],
    [/\b(?:iot|internet of things)\b/i, 'IoT'],
    [/\bqiskit\b/i, 'Qiskit'],
    [/\bnetworkx\b/i, 'NetworkX'],
  ];
  const detectedSkills: string[] = [];
  for (const [re, skill] of TECH_SKILL_PATTERNS) {
    if (re.test(text)) detectedSkills.push(skill);
  }
  if (detectedSkills.length > 0) result['__cv_skills__'] = detectedSkills.join(',');

  return result;
}

// Academic fields that a transcript is authoritative for (overwrites CV values)
const TRANSCRIPT_FIELDS = ['name_of_institution', 'gpa_cap_rank_points'];

async function parseTranscriptFile(file: File): Promise<Record<string, string>> {
  const all = await parseCvFile(file);
  const academic: Record<string, string> = {};
  for (const key of TRANSCRIPT_FIELDS) {
    if (all[key]) academic[key] = all[key];
  }
  return academic;
}

/* ── Loaders ──────────────────────────────────────────────────────────────── */
function loadTemplates(): AppFormTemplate[] {
  try {
    const ver = localStorage.getItem(AFT_VER_KEY);
    if (ver !== AFT_SEED_VER) {
      localStorage.setItem(AFT_KEY, JSON.stringify(appFormSeed));
      localStorage.setItem(AFT_VER_KEY, AFT_SEED_VER);
      return appFormSeed as AppFormTemplate[];
    }
    const r = localStorage.getItem(AFT_KEY);
    return r ? JSON.parse(r) : (appFormSeed as AppFormTemplate[]);
  } catch { return appFormSeed as AppFormTemplate[]; }
}

function loadMyApps(): MyApplication[] {
  try { const r = localStorage.getItem(MY_APPS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}

/* ── Template resolution ─────────────────────────────────────────────────── */
function resolveTemplate(templates: AppFormTemplate[], prog: Programme): AppFormTemplate | null {
  const byId   = templates.find(t => t.id   === prog.formTemplate);
  if (byId) return byId;
  const byName = templates.find(t => t.name.toLowerCase() === (prog.formTemplate ?? '').toLowerCase());
  if (byName) return byName;
  const cats = prog.educationLevel ? [prog.educationLevel] : [];
  if (cats.some(c => c === 'Undergraduate Scholar/Merit Scholar' || c === 'Tech UP' || c === 'Undergraduate Student')) return templates.find(t => t.id === 'AFT-005') ?? null;
  if (cats.some(c => c === 'Junior College Scholar/Junior College Student'))       return templates.find(t => t.id === 'AFT-008') ?? null;
  if (cats.some(c => c === 'Polytechnic Scholar/Polytechnic Student'))             return templates.find(t => t.id === 'AFT-009') ?? null;
  if (cats.some(c => c === 'Post Junior College/Post Polytechnic Student'))        return templates.find(t => t.id === 'AFT-009') ?? null;
  if (cats.some(c => c === 'Young Defence Scientist Programme'))                   return templates.find(t => t.id === 'AFT-003') ?? null;
  return templates[0] ?? null;
}

/* ── CSS helpers ─────────────────────────────────────────────────────────── */
const INPUT_CLS  = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-body-md text-fg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-fg-muted';
const SELECT_CLS = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-body-md text-fg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all cursor-pointer';
const ERROR_CLS  = 'border-danger ring-1 ring-danger/30';

/* ── SubjectGradeTable ───────────────────────────────────────────────────── */
type SubjectGradeRow = { subject: string; grade: string };

function SubjectGradeTable({
  value, onChange, gradeOpts, error,
}: {
  value: string;
  onChange: (v: string) => void;
  gradeOpts: string[];
  error?: string;
}) {
  const rows: SubjectGradeRow[] = useMemo(() => {
    try { const p = JSON.parse(value); return Array.isArray(p) ? p : []; }
    catch { return []; }
  }, [value]);

  function setRows(next: SubjectGradeRow[]) { onChange(JSON.stringify(next)); }
  function addRow() { setRows([...rows, { subject: '', grade: '' }]); }
  function removeRow(i: number) { setRows(rows.filter((_, j) => j !== i)); }
  function updateRow(i: number, key: keyof SubjectGradeRow, val: string) {
    setRows(rows.map((r, j) => j === i ? { ...r, [key]: val } : r));
  }

  return (
    <div className={cn('space-y-2', error && 'ring-2 ring-danger/30 rounded-xl p-2')}>
      {rows.length === 0 && (
        <p className="text-body-sm text-fg-muted italic">No subjects added yet.</p>
      )}
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={row.subject}
            onChange={e => updateRow(i, 'subject', e.target.value)}
            placeholder="Subject name"
            className={cn(INPUT_CLS, 'flex-1')}
          />
          <select
            value={row.grade}
            onChange={e => updateRow(i, 'grade', e.target.value)}
            className={cn(SELECT_CLS, 'w-28 shrink-0')}
            style={{ backgroundImage: 'none' }}
          >
            <option value="">Grade</option>
            {gradeOpts.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-fg-subtle hover:bg-danger-bg hover:text-danger transition-all shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 text-body-sm font-semibold text-accent hover:underline"
      >
        <Plus size={13} />Add subject
      </button>
    </div>
  );
}

/* ── FieldLabel ──────────────────────────────────────────────────────────── */
function OptionalPill() {
  return (
    <span className="inline-flex items-center text-[12px] font-bold text-fg-muted bg-bg-subtle px-2 py-0.5 rounded-full border border-border">
      Optional
    </span>
  );
}

function FieldLabel({ field, prefilled, cvParsed, transcriptParsed }: {
  field: FormField; prefilled?: boolean; cvParsed?: boolean; transcriptParsed?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium leading-tight text-fg">
      {field.label}
      {field.mandatory && <span className="text-danger">*</span>}
      {prefilled && (
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full border border-accent/20">
          <Shield size={9} /> MyInfo
        </span>
      )}
      {transcriptParsed && (
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-info bg-info-bg px-1.5 py-0.5 rounded-full border border-info/20">
          Transcript
        </span>
      )}
      {cvParsed && !transcriptParsed && (
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded-full border border-success/20">
          CV
        </span>
      )}
    </label>
  );
}

/* ── FieldInput ──────────────────────────────────────────────────────────── */
function FieldInput({
  field, value, onChange, error, onFileUpload,
}: {
  field: FormField;
  value: string | string[];
  onChange: (v: string | string[]) => void;
  error?: string;
  onFileUpload?: (file: File) => void;
}) {
  const strValue = typeof value === 'string' ? value : '';
  const arrValue = Array.isArray(value) ? value : [];
  const [fileError, setFileError] = useState('');

  if (field.type === 'textbox') {
    return (
      <input
        type="text"
        className={cn(INPUT_CLS, error && ERROR_CLS)}
        value={strValue}
        onChange={e => onChange(e.target.value)}
        maxLength={field.maxChars}
        placeholder={field.remarks ?? `Enter ${field.label.toLowerCase()}…`}
      />
    );
  }

  if (field.type === 'dropdown') {
    if (!field.options || field.options.length === 0) {
      return (
        <input
          type="text"
          className={cn(INPUT_CLS, error && ERROR_CLS)}
          value={strValue}
          onChange={e => onChange(e.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}…`}
        />
      );
    }
    return (
      <select
        className={cn(SELECT_CLS, error && ERROR_CLS)}
        value={strValue}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (field.type === 'calendar') {
    return (
      <div className={cn(error && 'ring-2 ring-danger/40 rounded-xl')}>
        <DatePicker
          value={strValue}
          onChange={onChange}
          placeholder="Select date"
        />
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <div className="flex flex-wrap gap-4">
        {(field.options ?? []).map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer text-body-md text-fg">
            <input
              type="radio"
              name={field.id}
              value={opt}
              checked={strValue === opt}
              onChange={() => onChange(opt)}
              className="accent-accent w-4 h-4"
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div className="flex flex-wrap gap-4">
        {(field.options ?? []).map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer text-body-md text-fg">
            <input
              type="checkbox"
              value={opt}
              checked={arrValue.includes(opt)}
              onChange={e => {
                if (e.target.checked) onChange([...arrValue, opt]);
                else onChange(arrValue.filter(v => v !== opt));
              }}
              className="accent-accent w-4 h-4"
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === 'upload') {
    const filename = strValue;
    return (
      <label className="cursor-pointer block">
        <input
          type="file"
          className="hidden"
          accept={field.id === 'cv_upload' || field.id === 'transcript_upload' ? '.pdf,.doc,.docx' : '.jpg,.jpeg,.png'}
          onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            e.target.value = '';
            // Validate type + size (TOA-045/046) — the accept filter is bypassable.
            const isDoc = field.id === 'cv_upload' || field.id === 'transcript_upload';
            const allowed = isDoc ? ['pdf', 'doc', 'docx'] : ['jpg', 'jpeg', 'png'];
            const ext = (file.name.split('.').pop() ?? '').toLowerCase();
            const MAX = 5 * 1024 * 1024; // 5 MB
            if (!allowed.includes(ext)) {
              setFileError(`Unsupported file type. Please upload ${allowed.map(a => a.toUpperCase()).join(', ')}.`);
              return;
            }
            if (file.size > MAX) {
              setFileError(`File is too large (${(file.size / 1048576).toFixed(1)} MB). Maximum is 5 MB.`);
              return;
            }
            setFileError('');
            onChange(file.name);
            onFileUpload?.(file);
          }}
        />
        <div className={cn(
          'rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 py-3 text-center transition-colors',
          filename
            ? 'border-success/40 bg-success/5'
            : 'border-border hover:border-accent/50 hover:bg-accent/5',
          error && 'border-danger',
        )}>
          {filename ? (
            <>
              <CheckCircle2 size={16} className="text-success" />
              <p className="text-body-sm font-medium text-success">{filename}</p>
              <p className="text-caption text-fg-muted">Click to replace</p>
            </>
          ) : (
            <>
              <p className="text-body-sm font-medium text-fg-muted">Click to upload</p>
              <p className="text-caption text-fg-subtle">{field.remarks ?? 'JPG or PNG · max 5 MB'}</p>
            </>
          )}
        </div>
        {fileError && <p className="mt-1.5 text-caption text-danger">{fileError}</p>}
      </label>
    );
  }

  if (field.type === 'subject-grade-table') {
    return <SubjectGradeTable value={strValue} onChange={onChange} gradeOpts={field.options ?? []} error={error} />;
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        className={cn(INPUT_CLS, error && ERROR_CLS)}
        value={strValue}
        onChange={e => onChange(e.target.value)}
        placeholder={field.remarks ?? `Enter ${field.label.toLowerCase()}…`}
        step="0.01"
        min="0"
      />
    );
  }

  return null;
}

/* ── ProjectCard ─────────────────────────────────────────────────────────── */
function ProjectCard({
  project, rank, onAdd, onRemove, canAdd, aiRecommended, onViewDetails,
  isDragging, isDragOver,
}: {
  project:        ProjectEntry;
  rank?:          number;
  onAdd?:         () => void;
  onRemove?:      () => void;
  canAdd:         boolean;
  aiRecommended?: boolean;
  onViewDetails?: () => void;
  isDragging?:    boolean;
  isDragOver?:    boolean;
}) {
  const ranked = rank !== undefined;

  return (
    <div
      onClick={onViewDetails}
      className={cn(
        'card p-4 flex gap-3 transition-all',
        onViewDetails && 'cursor-pointer hover:border-accent/40',
        ranked && 'border-accent/30 bg-accent/5',
        isDragging && 'opacity-40 scale-[0.98]',
        isDragOver && !isDragging && 'border-accent shadow-md',
      )}
    >
      {/* Drag handle (ranked only) */}
      {ranked && (
        <div className="shrink-0 flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <div className="cursor-grab active:cursor-grabbing text-fg-subtle hover:text-fg-muted transition-colors mt-0.5">
            <GripVertical size={16} />
          </div>
          <div className="w-6 h-6 rounded-full bg-accent text-white text-[12px] font-black flex items-center justify-center">
            {rank}
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-body-md font-semibold text-fg leading-snug text-left hover:text-accent transition-colors">
            {project.title}
          </span>
          {aiRecommended && (
            <span className="inline-flex items-center gap-1 text-[12px] font-bold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 shrink-0">
              <Star size={8} /> For You
            </span>
          )}
        </div>
        <p className="text-body-sm text-fg-muted mt-0.5">{project.mentor}</p>
        {(project.skills ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(project.skills ?? []).slice(0, 4).map(s => (
              <span key={s} className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-bg-subtle border border-border text-fg-muted">
                {s}
              </span>
            ))}
          </div>
        )}
        {project.description && (
          <p className="text-body-sm text-fg-muted mt-2 line-clamp-2">{project.description}</p>
        )}
      </div>

      <div className="shrink-0 flex flex-col gap-1.5 items-end justify-start">
        {ranked ? (
          <button onClick={(e) => { e.stopPropagation(); onRemove?.(); }} className="p-1 rounded hover:bg-danger/10 text-danger transition-colors"><X size={14} /></button>
        ) : (
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onAdd?.(); }} disabled={!canAdd}>
            <Plus size={12} /> Add
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Shared dropdown options injected at render time ─────────────────────── */
const FIELD_OPTIONS_OVERRIDE: Record<string, string[]> = {
  internship_category: [...INTERN_CATEGORIES],
};

/* ── Full-width heuristic ─────────────────────────────────────────────────── */
function isFullWidth(field: FormField): boolean {
  if (field.fullWidth) return true;
  if (field.type === 'checkbox') return true;
  return false;
}

/* ── Defender Profile Quiz ───────────────────────────────────────────────── */
const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    question: 'New intel arrives about a critical security gap. Your first move?',
    answers: [
      { archetype: 'sentinel',   icon: Search,       label: 'Map the exposure',      description: 'Methodically trace every possible attack surface.' },
      { archetype: 'pathfinder', icon: BarChart3,    label: 'Mine the logs',          description: 'Dig into the data to understand how it was missed.' },
      { archetype: 'architect',  icon: Construction, label: 'Redesign the system',    description: 'Fix the root structural weakness, not just the gap.' },
      { archetype: 'pioneer',    icon: Bot,          label: 'Automate detection',      description: 'Deploy a monitoring agent before someone exploits it.' },
    ],
  },
  {
    id: 'q2',
    question: "You have a free week to build anything you want. What do you ship?",
    answers: [
      { archetype: 'sentinel',   icon: Shield,   label: 'Threat simulator',      description: 'A tool that stress-tests how systems hold up under attack.' },
      { archetype: 'pathfinder', icon: Brain,    label: 'Anomaly predictor',      description: 'An AI trained on past events to catch the next one early.' },
      { archetype: 'architect',  icon: Settings, label: 'Unified platform',       description: 'A single layer that ties five disconnected systems into one.' },
      { archetype: 'pioneer',    icon: Cpu,      label: 'Autonomous robot',       description: "Something that operates where people can't safely go." },
    ],
  },
  {
    id: 'q3',
    question: 'Which mission gets you out of bed in the morning?',
    answers: [
      { archetype: 'sentinel',   icon: Lock,   label: 'Cyber defence',          description: 'Guarding critical infrastructure from digital threats.' },
      { archetype: 'pathfinder', icon: Target, label: 'Intelligence analysis',  description: 'Turning raw data into decisions that matter.' },
      { archetype: 'architect',  icon: Globe,  label: 'Systems integration',    description: 'Making complex platforms seamlessly talk to each other.' },
      { archetype: 'pioneer',    icon: Rocket, label: 'Frontier tech',          description: 'Building unmanned systems or next-gen sensors from scratch.' },
    ],
  },
  {
    id: 'q4',
    question: "Your team hits a critical failure at 2AM. You're the one who…",
    answers: [
      { archetype: 'sentinel',   icon: Search,     label: 'Traces the source',      description: "You've seen this pattern — you find the exact attack vector." },
      { archetype: 'pathfinder', icon: TrendingUp, label: 'Pulls the metrics',      description: 'You correlate logs and surface the real root cause in minutes.' },
      { archetype: 'architect',  icon: Ruler,      label: 'Sketches the fix',       description: 'You redesign the failing component on the whiteboard in real-time.' },
      { archetype: 'pioneer',    icon: Zap,        label: 'Ships a patch',          description: 'You code and push a working fix before sunrise.' },
    ],
  },
  {
    id: 'q5',
    question: 'How do you naturally approach a big, complex decision?',
    answers: [
      { archetype: 'sentinel',   icon: Puzzle,    label: 'Think adversarially',    description: 'Imagine every way it could go wrong, then build defences.' },
      { archetype: 'pathfinder', icon: BarChart3, label: 'Follow the evidence',    description: 'Data first, intuition second — trust what the numbers say.' },
      { archetype: 'architect',  icon: MapIcon,   label: 'Map the whole system',  description: "Can't decide without seeing how all the parts connect." },
      { archetype: 'pioneer',    icon: Lightbulb, label: 'Try and learn fast',     description: 'Move, prototype, discover what works — iteration is your edge.' },
    ],
  },
  {
    id: 'q6',
    question: 'At a hackathon, your signature contribution is…',
    answers: [
      { archetype: 'sentinel',   icon: Shield,       label: 'Red-teaming the room',  description: "You find critical flaws in everyone's solutions before demo day." },
      { archetype: 'pathfinder', icon: Microscope,   label: 'Cleaning the data',      description: 'Good output starts with good input — you make sure foundations hold.' },
      { archetype: 'architect',  icon: Construction, label: 'The system diagram',    description: "You're whiteboarding the architecture while everyone else argues." },
      { archetype: 'pioneer',    icon: Wrench,       label: 'Shipping first',         description: 'Working demo before anyone else — momentum over perfection.' },
    ],
  },
];

/* ── Archetype illustrations (inline SVG) ─────────────────────────────── */
function SentinelIllustration() {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Outer glow ring */}
      <circle cx="100" cy="100" r="88" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.4"/>
      {/* Shield body */}
      <path d="M100 24 L148 46 L148 96 C148 128 126 150 100 162 C74 150 52 128 52 96 L52 46 Z" fill="#f59e0b" fillOpacity="0.12" stroke="#f59e0b" strokeWidth="2"/>
      {/* Inner shield detail */}
      <path d="M100 40 L136 58 L136 94 C136 118 120 136 100 146 C80 136 64 118 64 94 L64 58 Z" fill="#f59e0b" fillOpacity="0.08" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2"/>
      {/* Eye of the sentinel */}
      <ellipse cx="100" cy="96" rx="22" ry="14" fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeWidth="1.5"/>
      <circle cx="100" cy="96" r="7" fill="#f59e0b" fillOpacity="0.4"/>
      <circle cx="100" cy="96" r="3" fill="#f59e0b"/>
      {/* Radar sweep lines */}
      <line x1="100" y1="82" x2="100" y2="64" stroke="#f59e0b" strokeWidth="1" opacity="0.5"/>
      <line x1="114" y1="86" x2="126" y2="72" stroke="#f59e0b" strokeWidth="1" opacity="0.5"/>
      <line x1="86" y1="86" x2="74" y2="72" stroke="#f59e0b" strokeWidth="1" opacity="0.5"/>
      {/* Corner accent marks */}
      <circle cx="56" cy="60" r="2.5" fill="#f59e0b" opacity="0.6"/>
      <circle cx="144" cy="60" r="2.5" fill="#f59e0b" opacity="0.6"/>
      <circle cx="100" cy="26" r="2.5" fill="#f59e0b" opacity="0.8"/>
    </svg>
  );
}

function PathfinderIllustration() {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Outer orbit ring */}
      <circle cx="100" cy="100" r="86" stroke="#00328a" strokeWidth="1.5" opacity="0.25"/>
      {/* Data constellation lines */}
      <line x1="100" y1="30" x2="155" y2="68" stroke="#00328a" strokeWidth="1" opacity="0.3"/>
      <line x1="155" y1="68" x2="140" y2="140" stroke="#00328a" strokeWidth="1" opacity="0.3"/>
      <line x1="140" y1="140" x2="62" y2="148" stroke="#00328a" strokeWidth="1" opacity="0.3"/>
      <line x1="62" y1="148" x2="42" y2="78" stroke="#00328a" strokeWidth="1" opacity="0.3"/>
      <line x1="42" y1="78" x2="100" y2="30" stroke="#00328a" strokeWidth="1" opacity="0.3"/>
      {/* Cross-constellation */}
      <line x1="100" y1="30" x2="140" y2="140" stroke="#00328a" strokeWidth="1" opacity="0.15"/>
      <line x1="155" y1="68" x2="42" y2="78" stroke="#00328a" strokeWidth="1" opacity="0.15"/>
      {/* Central compass rose */}
      <circle cx="100" cy="100" r="28" fill="#00328a" fillOpacity="0.1" stroke="#00328a" strokeWidth="2"/>
      <circle cx="100" cy="100" r="5" fill="#00328a" fillOpacity="0.6"/>
      {/* Compass needles */}
      <path d="M100 72 L104 98 L100 96 L96 98 Z" fill="#00328a"/>
      <path d="M100 128 L104 102 L100 104 L96 102 Z" fill="#00328a" fillOpacity="0.3"/>
      <path d="M72 100 L98 96 L96 100 L98 104 Z" fill="#00328a" fillOpacity="0.3"/>
      <path d="M128 100 L102 96 L104 100 L102 104 Z" fill="#00328a"/>
      {/* Data node dots */}
      <circle cx="100" cy="30"  r="4" fill="#00328a" opacity="0.8"/>
      <circle cx="155" cy="68"  r="3" fill="#00328a" opacity="0.6"/>
      <circle cx="140" cy="140" r="3" fill="#00328a" opacity="0.6"/>
      <circle cx="62"  cy="148" r="3" fill="#00328a" opacity="0.6"/>
      <circle cx="42"  cy="78"  r="3" fill="#00328a" opacity="0.6"/>
      {/* Signal rings */}
      <circle cx="100" cy="100" r="46" stroke="#00328a" strokeWidth="0.75" strokeDasharray="2 6" opacity="0.4"/>
      <circle cx="100" cy="100" r="64" stroke="#00328a" strokeWidth="0.75" strokeDasharray="2 8" opacity="0.25"/>
    </svg>
  );
}

function ArchitectIllustration() {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Outer hex ring */}
      <polygon points="100,18 168,58 168,138 100,178 32,138 32,58" stroke="#16a34a" strokeWidth="1.5" fill="none" opacity="0.3"/>
      {/* Inner hex */}
      <polygon points="100,42 148,68 148,122 100,148 52,122 52,68" stroke="#16a34a" strokeWidth="1.5" fill="#16a34a" fillOpacity="0.08"/>
      {/* Circuit grid lines */}
      <line x1="100" y1="42" x2="100" y2="148" stroke="#16a34a" strokeWidth="0.75" opacity="0.4"/>
      <line x1="52" y1="68" x2="148" y2="122" stroke="#16a34a" strokeWidth="0.75" opacity="0.4"/>
      <line x1="148" y1="68" x2="52" y2="122" stroke="#16a34a" strokeWidth="0.75" opacity="0.4"/>
      {/* Central node */}
      <circle cx="100" cy="95" r="18" fill="#16a34a" fillOpacity="0.15" stroke="#16a34a" strokeWidth="2"/>
      <circle cx="100" cy="95" r="7" fill="#16a34a" fillOpacity="0.5"/>
      <circle cx="100" cy="95" r="2.5" fill="#16a34a"/>
      {/* Vertex nodes */}
      <circle cx="100" cy="42"  r="4.5" fill="#16a34a" opacity="0.8"/>
      <circle cx="148" cy="68"  r="4"   fill="#16a34a" opacity="0.7"/>
      <circle cx="148" cy="122" r="4"   fill="#16a34a" opacity="0.7"/>
      <circle cx="100" cy="148" r="4.5" fill="#16a34a" opacity="0.8"/>
      <circle cx="52"  cy="122" r="4"   fill="#16a34a" opacity="0.7"/>
      <circle cx="52"  cy="68"  r="4"   fill="#16a34a" opacity="0.7"/>
      {/* Blueprint tick marks on outer hex */}
      <line x1="100" y1="18" x2="100" y2="28" stroke="#16a34a" strokeWidth="2" opacity="0.7"/>
      <line x1="100" y1="178" x2="100" y2="168" stroke="#16a34a" strokeWidth="2" opacity="0.7"/>
    </svg>
  );
}

function PioneerIllustration() {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Launch trail */}
      <path d="M100 170 Q90 150 88 130 Q86 110 100 88" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" opacity="0.2"/>
      <path d="M88 165 Q80 148 80 130 Q80 112 90 95" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" opacity="0.15"/>
      <path d="M112 165 Q120 148 120 130 Q120 112 110 95" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" opacity="0.15"/>
      {/* Rocket body */}
      <path d="M100 36 C100 36 120 56 122 84 L122 120 L100 130 L78 120 L78 84 C80 56 100 36 100 36 Z" fill="#dc2626" fillOpacity="0.15" stroke="#dc2626" strokeWidth="2"/>
      {/* Nose cone accent */}
      <path d="M100 36 C100 36 112 56 114 72 L100 68 L86 72 C88 56 100 36 100 36 Z" fill="#dc2626" fillOpacity="0.3"/>
      {/* Window porthole */}
      <circle cx="100" cy="88" r="12" fill="#dc2626" fillOpacity="0.12" stroke="#dc2626" strokeWidth="1.5"/>
      <circle cx="100" cy="88" r="5" fill="#dc2626" fillOpacity="0.4"/>
      {/* Engine nozzles */}
      <path d="M86 120 L82 136 L92 130 Z" fill="#dc2626" fillOpacity="0.5"/>
      <path d="M114 120 L118 136 L108 130 Z" fill="#dc2626" fillOpacity="0.5"/>
      <path d="M93 122 L90 140 L100 134 L110 140 L107 122 Z" fill="#dc2626" fillOpacity="0.3" stroke="#dc2626" strokeWidth="1"/>
      {/* Side fins */}
      <path d="M78 96 L60 116 L78 112 Z" fill="#dc2626" fillOpacity="0.4" stroke="#dc2626" strokeWidth="1"/>
      <path d="M122 96 L140 116 L122 112 Z" fill="#dc2626" fillOpacity="0.4" stroke="#dc2626" strokeWidth="1"/>
      {/* Stars / sparks */}
      <circle cx="48"  cy="52"  r="2"   fill="#dc2626" opacity="0.5"/>
      <circle cx="152" cy="46"  r="2.5" fill="#dc2626" opacity="0.6"/>
      <circle cx="42"  cy="136" r="1.5" fill="#dc2626" opacity="0.4"/>
      <circle cx="158" cy="128" r="2"   fill="#dc2626" opacity="0.5"/>
      <circle cx="60"  cy="42"  r="1.5" fill="#dc2626" opacity="0.3"/>
      {/* Orbit ring */}
      <ellipse cx="100" cy="160" rx="40" ry="8" stroke="#dc2626" strokeWidth="1" opacity="0.2" strokeDasharray="4 4"/>
    </svg>
  );
}

const ARCHETYPE_ILLUSTRATIONS: Record<string, () => JSX.Element> = {
  sentinel:  SentinelIllustration,
  pathfinder: PathfinderIllustration,
  architect:  ArchitectIllustration,
  pioneer:    PioneerIllustration,
};

const ARCHETYPE_META: Record<string, {
  name: string; tagline: string; description: string;
  textClass: string; borderClass: string; bgClass: string;
  accentHex: string; traits: string[];
}> = {
  sentinel: {
    name:        'The Sentinel',
    tagline:     'You protect what others overlook.',
    description: "You don't just defend — you think like the attacker. Methodical, adversarial-minded, and always one step ahead. You thrive in cybersecurity, threat modelling, and hardening systems before the breach happens.",
    textClass:   'text-warning',
    borderClass: 'border-warning/30',
    bgClass:     'bg-warning/5',
    accentHex:   '#f59e0b',
    traits:      ['Threat Intelligence', 'Red Teaming', 'Zero-Trust Mindset', 'Cyber Resilience'],
  },
  pathfinder: {
    name:        'The Pathfinder',
    tagline:     'You find the signal in the noise.',
    description: "Evidence is your compass. You turn raw data into clarity that others act on — finding patterns where others see chaos. Whether training AI models or building intelligence pipelines, you thrive when the problem is complex and the data is messy.",
    textClass:   'text-accent',
    borderClass: 'border-accent/30',
    bgClass:     'bg-accent/5',
    accentHex:   '#00328a',
    traits:      ['AI & Machine Learning', 'Data Pipelines', 'Pattern Recognition', 'Decision Intelligence'],
  },
  architect: {
    name:        'The Architect',
    tagline:     'You design the scaffolding others build on.',
    description: "You see the whole before the parts. While others jump to solutions, you're drawing the system diagram that makes everything else possible. You gravitate toward systems integration, command platforms, and multi-layer engineering challenges.",
    textClass:   'text-success',
    borderClass: 'border-success/30',
    bgClass:     'bg-success/5',
    accentHex:   '#16a34a',
    traits:      ['Systems Design', 'C2 Platforms', 'Integration Engineering', 'Scalability'],
  },
  pioneer: {
    name:        'The Pioneer',
    tagline:     'You build things that have never existed.',
    description: "Specs don't stop you — you prototype, learn, and ship. Robotics, unmanned systems, IoT, and emerging tech are your playground. If it's never been built before at DSTA, you want to be the one doing it.",
    textClass:   'text-danger',
    borderClass: 'border-danger/30',
    bgClass:     'bg-danger/5',
    accentHex:   '#dc2626',
    traits:      ['Robotics & UAV', 'Rapid Prototyping', 'IoT & Embedded', 'Emerging Tech'],
  },
};

// Exact strings from projects.json
const ARCHETYPE_DOMAIN_WEIGHTS: Record<string, Record<string, number>> = {
  sentinel: {
    'Cybersecurity':                                    1.0,
    'Command, Control, and Communication (C3) Systems': 0.5,
    'Artificial Intelligence and Data Analytics':       0.3,
    'Sensors and Guided Weapon Systems':                0.2,
  },
  pathfinder: {
    'Artificial Intelligence and Data Analytics':       1.0,
    'Cybersecurity':                                    0.3,
    'Command, Control, and Communication (C3) Systems': 0.2,
    'Simulation and Immersive Technologies':            0.2,
  },
  architect: {
    'Command, Control, and Communication (C3) Systems': 1.0,
    'Artificial Intelligence and Data Analytics':       0.5,
    'Cybersecurity':                                    0.4,
    'Simulation and Immersive Technologies':            0.4,
    'Robotics and Autonomous Systems':                  0.3,
  },
  pioneer: {
    'Robotics and Autonomous Systems':                  1.0,
    'Sensors and Guided Weapon Systems':                0.9,
    'Simulation and Immersive Technologies':            0.6,
    'Artificial Intelligence and Data Analytics':       0.4,
    'Command, Control, and Communication (C3) Systems': 0.2,
  },
};

const ARCHETYPE_EMERGING_WEIGHTS: Record<string, Record<string, number>> = {
  sentinel:   { 'Artificial Intelligence': 0.4, 'Cellular Networks': 0.3 },
  pathfinder: { 'Artificial Intelligence': 1.0, 'Internet of Things': 0.4 },
  architect:  { 'Cellular Networks': 0.6, 'Internet of Things': 0.5, 'Artificial Intelligence': 0.4 },
  pioneer:    { 'Unmanned Aircraft Systems': 1.0, 'Internet of Things': 0.8, 'Artificial Intelligence': 0.3 },
};

// Maps applicant area-of-interest choices to project techDomain scores
const INTEREST_DOMAIN_SCORE: Record<string, Record<string, number>> = {
  'Artificial Intelligence': {
    'Artificial Intelligence and Data Analytics':       1.0,
    'Cybersecurity':                                    0.2,
  },
  'Data Science/Data Analytics': {
    'Artificial Intelligence and Data Analytics':       1.0,
    'Command, Control, and Communication (C3) Systems': 0.2,
  },
  'Cybersecurity': {
    'Cybersecurity':                                    1.0,
    'Command, Control, and Communication (C3) Systems': 0.3,
  },
  'Infosecurity': {
    'Cybersecurity':                                    0.9,
    'Command, Control, and Communication (C3) Systems': 0.2,
  },
  'Command & Control Systems': {
    'Command, Control, and Communication (C3) Systems': 1.0,
    'Cybersecurity':                                    0.3,
    'Artificial Intelligence and Data Analytics':       0.3,
  },
  'Networks & Infrastructure': {
    'Command, Control, and Communication (C3) Systems': 0.6,
    'Cybersecurity':                                    0.4,
  },
  'Advanced Systems': {
    'Robotics and Autonomous Systems':                  0.6,
    'Sensors and Guided Weapon Systems':                0.6,
    'Command, Control, and Communication (C3) Systems': 0.3,
  },
  'Air Systems': {
    'Robotics and Autonomous Systems':                  0.7,
    'Sensors and Guided Weapon Systems':                0.8,
  },
  'Naval Systems': {
    'Sensors and Guided Weapon Systems':                0.7,
    'Robotics and Autonomous Systems':                  0.5,
  },
  'Land Systems': {
    'Robotics and Autonomous Systems':                  0.8,
    'Sensors and Guided Weapon Systems':                0.6,
  },
  'Simulation & Training Systems': {
    'Simulation and Immersive Technologies':            1.0,
    'Artificial Intelligence and Data Analytics':       0.2,
  },
  'Software Development': {
    'Artificial Intelligence and Data Analytics':       0.4,
    'Command, Control, and Communication (C3) Systems': 0.4,
    'Cybersecurity':                                    0.3,
    'Simulation and Immersive Technologies':            0.3,
  },
  'Cloud': {
    'Command, Control, and Communication (C3) Systems': 0.5,
    'Artificial Intelligence and Data Analytics':       0.4,
    'Cybersecurity':                                    0.3,
  },
  'UI/UX': {
    'Simulation and Immersive Technologies':            0.6,
    'Artificial Intelligence and Data Analytics':       0.2,
  },
};

// Maps area-of-interest choices to project emergingArea scores
const INTEREST_EMERGING_SCORE: Record<string, Record<string, number>> = {
  'Artificial Intelligence':    { 'Artificial Intelligence': 1.0 },
  'Data Science/Data Analytics':{ 'Artificial Intelligence': 0.7 },
  'Networks & Infrastructure':  { 'Cellular Networks': 0.8, 'Internet of Things': 0.4 },
  'Air Systems':                { 'Unmanned Aircraft Systems': 0.9 },
  'Advanced Systems':           { 'Internet of Things': 0.5, 'Unmanned Aircraft Systems': 0.4 },
  'Naval Systems':              { 'Unmanned Aircraft Systems': 0.5 },
  'Land Systems':               { 'Unmanned Aircraft Systems': 0.3 },
};

/* Detailed match breakdown — the score plus the human-readable reasons behind it.
   Every signal is optional; the score is normalised over whichever signals are present,
   so it works for a uni student with a CV, a sec-school applicant who only picked
   interests, or anyone who additionally took the quiz. */
interface MatchResult {
  score:   number;
  reasons: string[];
}

function getProjectMatch(
  project:    ProjectEntry,
  archetype:  string | null,
  formValues: Record<string, string | string[]>,
  cvSkills:   string[],
): MatchResult {
  let score = 0;
  let weightSum = 0;
  const reasons: string[] = [];

  // ── Interest component (35%) — selected tech domains vs project tech domain ──
  const selectedDomains = Array.isArray(formValues['tech_domain']) ? formValues['tech_domain'] as string[] : [];
  if (selectedDomains.length > 0) {
    const hit = project.techDomain && selectedDomains.includes(project.techDomain);
    score += (hit ? 1 : 0) * 0.35; weightSum += 0.35;
    if (hit) reasons.push(`Matches your interest in ${project.techDomain}`);
  }

  // ── Discipline component (25%) — course of study vs project.discipline ───
  const courseRaw = typeof formValues['course_of_study'] === 'string' ? formValues['course_of_study'] : '';
  const course = courseRaw.toLowerCase();
  const projDisciplines = (project.discipline ?? '').split(/[/,]/).map(d => d.trim().toLowerCase()).filter(Boolean);
  if (course && projDisciplines.length > 0) {
    const courseTokens = course.split(/\s+/).filter(t => t.length > 3);
    const matches = projDisciplines.filter(d => courseTokens.some(t => d.includes(t) || t.includes(d)));
    const disciplineScore = Math.min(matches.length / projDisciplines.length, 1);
    score += disciplineScore * 0.25; weightSum += 0.25;
    if (disciplineScore > 0) reasons.push(`Fits your ${courseRaw.trim()} background`);
  }

  // ── Skills component (20%) — CV-extracted skills vs project.skills ───────
  const projSkills = (project.skills ?? []);
  if (cvSkills.length > 0 && projSkills.length > 0) {
    const cvSkillsLower = cvSkills.map(s => s.toLowerCase());
    const matched = projSkills.filter(s => cvSkillsLower.some(c => c.includes(s.toLowerCase()) || s.toLowerCase().includes(c)));
    const skillsScore = Math.min(matched.length / projSkills.length, 1);
    score += skillsScore * 0.20; weightSum += 0.20;
    if (matched.length > 0) reasons.push(`Uses ${matched.slice(0, 2).join(' & ')} from your CV`);
  }

  // ── Archetype component (20%) — booster from the optional About You quiz ──
  if (archetype) {
    const aDomain   = ARCHETYPE_DOMAIN_WEIGHTS[archetype]   ?? {};
    const aEmerging = ARCHETYPE_EMERGING_WEIGHTS[archetype] ?? {};
    const archetypeScore = Math.max(
      aDomain[project.techDomain ?? '']      ?? 0,
      (aEmerging[project.emergingArea ?? ''] ?? 0) * 0.9,
    );
    score += archetypeScore * 0.20; weightSum += 0.20;
    if (archetypeScore >= 0.5 && ARCHETYPE_META[archetype]) {
      reasons.push(`Suits your ${ARCHETYPE_META[archetype].name} style`);
    }
  }

  return { score: weightSum > 0 ? score / weightSum : 0, reasons };
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function ApplyFormPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { maxProjectRanks } = useSystemConfig(); // Admin → System config global parameter

  const [programme,       setProgramme]       = useState<Programme | null>(null);
  const [template,        setTemplate]        = useState<AppFormTemplate | null>(null);
  const [projects,        setProjects]        = useState<ProjectEntry[]>([]);
  const [values,          setValues]          = useState<Record<string, string | string[]>>({});
  const [errors,          setErrors]          = useState<Record<string, string>>({});
  const [prefs,           setPrefs]           = useState<string[]>([]);
  const [step,            setStep]            = useState(0);
  const [submitted,       setSubmitted]       = useState(false);
  const [myInfoState,     setMyInfoState]     = useState<'login' | 'consent' | 'retrieving' | 'form'>('login');
  const [myInfoPrefilled, setMyInfoPrefilled] = useState<string[]>([]);
  const [loginEmail,      setLoginEmail]      = useState('');
  const [loginPassword,   setLoginPassword]   = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [loginLoading,    setLoginLoading]    = useState(false);
  const [quizAnswers,     setQuizAnswers]     = useState<Record<string, string>>({});
  const [quizStep,        setQuizStep]        = useState(0);
  const [cvParseLoading,         setCvParseLoading]         = useState(false);
  const [cvParsedFields,         setCvParsedFields]         = useState<string[]>([]);
  const [cvExtractedSkills,      setCvExtractedSkills]      = useState<string[]>([]);
  const [transcriptParseLoading, setTranscriptParseLoading] = useState(false);
  const [transcriptParsedFields, setTranscriptParsedFields] = useState<string[]>([]);
  const [cvFile,         setCvFile]         = useState<{ name: string; data: string } | null>(null);
  const [transcriptFile, setTranscriptFile] = useState<{ name: string; data: string } | null>(null);
  const [cvHighlights,   setCvHighlights]   = useState<{ leadership: string[]; activities: string[] } | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectEntry | null>(null);
  const [dragIndex,       setDragIndex]       = useState<number | null>(null);
  const [dragOverIndex,   setDragOverIndex]   = useState<number | null>(null);
  const { toast: toastMsg, showToast } = useToast();
  const [quizIntroSeen,       setQuizIntroSeen]       = useState(false);
  const [quizSkipped,         setQuizSkipped]          = useState(false);
  const [pendingAnswer,       setPendingAnswer]        = useState<string | null>(null);
  const [projectSearch,       setProjectSearch]        = useState('');
  const [projectDomainFilter, setProjectDomainFilter]  = useState('');
  const [showRecommendedOnly, setShowRecommendedOnly]  = useState(true);
  const [draftRestored,       setDraftRestored]        = useState(false);

  /* ── Bootstrap ────────────────────────────────────────────────────────── */
  useEffect(() => {
    const id   = params.id;
    const prog = loadProgrammes().find(p => p.id === id) ?? null;
    if (!prog) { router.replace('/apply'); return; }
    setProgramme(prog);

    const tpls = loadTemplates();
    const tpl  = resolveTemplate(tpls, prog);
    setTemplate(tpl);

    const projList = loadProjects().filter(
      p => p.programme === id && !p.archived && (p.status === 'open' || p.status === 'in-progress'),
    );
    setProjects(projList);

    const draftRaw = localStorage.getItem(`dsta_apply_draft_${id}`);
    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw);
        if (draft.values)                      setValues(draft.values);
        if (draft.prefs)                       setPrefs(draft.prefs);
        if (draft.quizAnswers)                 setQuizAnswers(draft.quizAnswers);
        if (typeof draft.quizStep === 'number') setQuizStep(draft.quizStep);
        if (draft.quizIntroSeen)               setQuizIntroSeen(true);
        if (draft.quizSkipped)                 setQuizSkipped(true);
        if (typeof draft.step === 'number')    setStep(draft.step);
        setDraftRestored(true);
        setMyInfoState('form'); // skip login when resuming a saved draft
      } catch {}
    }
  }, [params.id, router]);

  useEffect(() => { setPendingAnswer(null); }, [quizStep]);

  /* ── Singpass MyInfo retrieval ────────────────────────────────────────── */
  function handleRetrieveMyInfo() {
    setMyInfoState('retrieving');
    setTimeout(() => {
      if (template?.fields) {
        const initial: Record<string, string | string[]> = {};
        const filled: string[] = [];
        for (const f of template.fields) {
          if (MYINFO[f.id]) { initial[f.id] = MYINFO[f.id]; filled.push(f.id); }
        }
        setValues(initial);
        setMyInfoPrefilled(filled);
      }
      setMyInfoState('form');
    }, 1400);
  }

  function handleSkipMyInfo() { setMyInfoState('form'); }

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file); });
  }

  async function handleCvUpload(file: File) {
    setCvParseLoading(true);
    setCvParsedFields([]);
    readAsDataUrl(file).then(data => setCvFile({ name: file.name, data })).catch(() => {});
    // Detect leadership / CCA from the CV text (heuristic stand-in for an LLM)
    try {
      const cvText = (file.type === 'application/pdf' || file.name.endsWith('.pdf')) ? await extractTextFromPdf(file) : await file.text();
      setCvHighlights(extractHighlights(cvText));
    } catch {}
    const extracted = await parseCvFile(file);
    // Pull out internal skills key — not a form field
    const skillsRaw = extracted['__cv_skills__'];
    delete extracted['__cv_skills__'];
    if (skillsRaw) setCvExtractedSkills(skillsRaw.split(','));
    const filled = Object.keys(extracted);
    if (filled.length > 0) {
      setValues(prev => ({ ...prev, ...extracted }));
      setCvParsedFields(filled);
    } else {
      setCvParsedFields(['__none__']); // sentinel: parse attempted but nothing found
    }
    setCvParseLoading(false);
  }

  async function handleTranscriptUpload(file: File) {
    setTranscriptParseLoading(true);
    setTranscriptParsedFields([]);
    readAsDataUrl(file).then(data => setTranscriptFile({ name: file.name, data })).catch(() => {});
    const extracted = await parseTranscriptFile(file);
    const filled = Object.keys(extracted);
    if (filled.length > 0) {
      setValues(prev => ({ ...prev, ...extracted }));
      setTranscriptParsedFields(filled);
      // Remove these fields from CV-sourced list — transcript is now authoritative
      setCvParsedFields(prev => prev.filter(f => !filled.includes(f)));
    } else {
      setTranscriptParsedFields(['__none__']);
    }
    setTranscriptParseLoading(false);
  }

  function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setTimeout(() => { setLoginLoading(false); setMyInfoState('form'); }, 1000);
  }

  /* ── Steps derived from template sections ─────────────────────────────── */
  const sections = useMemo((): string[] => {
    if (!template?.fields) return [];
    const seen: string[] = [];
    for (const f of template.fields) {
      if (!seen.includes(f.section)) seen.push(f.section);
    }
    return seen;
  }, [template]);

  /* ── Defender type from quiz answers ──────────────────────────────────── */
  const defenderType = useMemo((): string | null => {
    if (Object.keys(quizAnswers).length < QUIZ_QUESTIONS.length) return null;
    const counts: Record<string, number> = { sentinel: 0, pathfinder: 0, architect: 0, pioneer: 0 };
    Object.values(quizAnswers).forEach(a => { if (counts[a] !== undefined) counts[a]++; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [quizAnswers]);

  const totalSteps = sections.length + 1; // form sections (quiz folded into last) + project preferences
  const isLastStep = step === totalSteps - 1;

  const currentFields = useMemo((): FormField[] => {
    if (step >= sections.length) return [];
    return (template?.fields ?? []).filter(f => {
      if (f.section !== sections[step] || f.hidden) return false;
      if (f.showWhen) {
        const trigger = values[f.showWhen.fieldId];
        return typeof trigger === 'string' && trigger === f.showWhen.value;
      }
      return true;
    });
  }, [template, sections, step, values]);

  // The document extraction banners belong only on whichever section holds the upload fields.
  const showCvBanners         = currentFields.some(f => f.id === 'cv_upload');
  const showTranscriptBanners = currentFields.some(f => f.id === 'transcript_upload');

  // The last section splits into an optional "Personalise your recommendations" panel
  // (Tech Domain + the About You quiz) and the remaining required fields (e.g. scholarship).
  const isPersonalisationSection = currentFields.some(f => f.id === 'tech_domain');
  const personalisationFields    = currentFields.filter(f => f.id === 'tech_domain');
  const requiredSectionFields    = currentFields.filter(f => f.id !== 'tech_domain');

  const renderField = (rawField: FormField) => {
    const field = FIELD_OPTIONS_OVERRIDE[rawField.id]
      ? { ...rawField, options: FIELD_OPTIONS_OVERRIDE[rawField.id] }
      : rawField;
    return (
      <div key={field.id} className={isFullWidth(field) ? 'col-span-full' : ''}>
        <FieldLabel
          field={field}
          prefilled={myInfoPrefilled.includes(field.id)}
          cvParsed={cvParsedFields.includes(field.id)}
          transcriptParsed={transcriptParsedFields.includes(field.id)}
        />
        <FieldInput
          field={field}
          value={values[field.id] ?? (field.type === 'checkbox' ? [] : '')}
          onChange={v => setField(field.id, v)}
          error={errors[field.id]}
          onFileUpload={
            field.id === 'cv_upload' ? handleCvUpload :
            field.id === 'transcript_upload' ? handleTranscriptUpload :
            undefined
          }
        />
        {errors[field.id] && (
          <p className="mt-1 text-caption text-danger">{errors[field.id]}</p>
        )}
        {field.remarks && !field.myInfo && (
          <p className="mt-1 text-caption text-fg-muted">{field.remarks}</p>
        )}
      </div>
    );
  };

  /* ── Validation ───────────────────────────────────────────────────────── */
  function validateStep(): boolean {
    const e: Record<string, string> = {};
    if (step < sections.length) {
      for (const f of currentFields) {
        if (!f.mandatory) continue;
        const v = values[f.id];
        const empty = !v || (Array.isArray(v) ? v.length === 0 : !v.toString().trim());
        if (empty) e[f.id] = `${f.label} is required.`;
      }
      // The About You quiz lives on the last section step but is optional — no gate.
    } else {
      if (prefs.length === 0) e.prefs = 'Please rank at least one project.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function setField(id: string, val: string | string[]) {
    setValues(prev => ({ ...prev, [id]: val }));
    setErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  /* ── Navigation ───────────────────────────────────────────────────────── */
  function goNext() {
    if (!validateStep()) return;
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBack() {
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Submit ───────────────────────────────────────────────────────────── */
  function handleSubmit() {
    if (!validateStep() || !programme) return;
    const appId = `APP-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    const app: MyApplication = {
      id:                 appId,
      programmeId:        programme.id,
      programmeName:      programme.title,
      submittedAt:        new Date().toISOString(),
      status:             'Pending Screening',
      formValues:         values,
      projectPreferences: prefs,
    };
    const existing = loadMyApps();
    localStorage.setItem(MY_APPS_KEY, JSON.stringify([...existing, app]));

    // Bridge into IO Applications tab
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    const yearRaw = str(values.year_of_study);
    const yearMatch = yearRaw.match(/\d+/);
    const ioApp: Application = {
      id:               appId,
      programmeId:      programme.id,
      // Attach to the programme's open intake so per-intake counts are accurate.
      intakeId:         currentIntakeId(programme),
      programmeName:    programme.title,
      status:           'Pending Screening',
      appliedDate:      today,
      name:             str(values.name),
      email:            str(values.email),
      school:           str(values.name_of_institution),
      course:           str(values.course_of_study),
      year:             yearMatch ? parseInt(yearMatch[0], 10) : 0,
      gpa:              parseFloat(str(values.gpa_cap_rank_points)) || 0,
      eligibilityPass:  false,
      failedCriteria:   [],
      projectRankings:  prefs,
      suitabilityScores: [],
      previousDSTA:     false,
      achievements:     str(values.achievements) ? [str(values.achievements)] : [],
      funAnswer:        str(values.fun_question ?? values.fun_answer ?? ''),
      formValues:       values,
      ...(cvFile         ? { cvFileName: cvFile.name, cvFileData: cvFile.data } : {}),
      ...(transcriptFile ? { transcriptFileName: transcriptFile.name, transcriptFileData: transcriptFile.data } : {}),
      ...(cvHighlights && (cvHighlights.leadership.length || cvHighlights.activities.length)
        ? { cvLeadership: cvHighlights.leadership, cvActivities: cvHighlights.activities } : {}),
    };
    const ioVer = localStorage.getItem(IO_APPS_VER_KEY);
    const ioRaw = localStorage.getItem(IO_APPS_KEY);
    const ioExisting: Application[] = ioVer === IO_APPS_VER && ioRaw
      ? (JSON.parse(ioRaw) as Application[])
      : (applicationsSeed as Application[]);
    localStorage.setItem(IO_APPS_KEY, JSON.stringify([...ioExisting, ioApp]));
    localStorage.setItem(IO_APPS_VER_KEY, IO_APPS_VER);

    // Remove draft now that submission is complete
    localStorage.removeItem(`dsta_apply_draft_${programme.id}`);

    // Notifications
    const applicantName = str(values.name) || 'An applicant';
    addNotification({ forRole: 'io', title: `New application — ${programme.title}`, body: `${applicantName} has submitted a new application.`, href: '/applications', tier: 'action' });
    addNotification({ forRole: 'applicant', forEmail: str(values.email), title: 'Application received', body: `Your application to ${programme.title} has been submitted successfully.`, href: '/apply/applications', tier: 'info' });

    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Project preference helpers ───────────────────────────────────────── */
  function addPref(id: string) {
    if (prefs.length >= maxProjectRanks || prefs.includes(id)) return;
    setPrefs(p => [...p, id]);
    setErrors(prev => { const n = { ...prev }; delete n.prefs; return n; });
  }

  function removePref(id: string) { setPrefs(p => p.filter(x => x !== id)); }

  function handleDragStart(index: number) { setDragIndex(index); }
  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }
  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null); setDragOverIndex(null); return;
    }
    setPrefs(p => {
      const arr = [...p];
      const [moved] = arr.splice(dragIndex, 1);
      arr.splice(targetIndex, 0, moved);
      return arr;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  }
  function handleDragEnd() { setDragIndex(null); setDragOverIndex(null); }

  function handleSaveDraft() {
    try {
      const draft = { programmeId: programme?.id, step, prefs, values, quizAnswers, quizStep, quizIntroSeen, quizSkipped, savedAt: new Date().toISOString() };
      localStorage.setItem(`dsta_apply_draft_${programme?.id}`, JSON.stringify(draft));
      router.push('/apply');
    } catch {}
  }

  const prefProjects  = prefs.map(id => projects.find(p => p.id === id)!).filter(Boolean);
  const availProjects = projects.filter(p => !prefs.includes(p.id));
  const canAddMore    = prefs.length < 5;

  // Which personalisation signals does the applicant actually have? The engine runs
  // on ANY of these — the quiz is just one optional booster, not the on/off switch.
  const hasInterestSignal = Array.isArray(values['tech_domain']) && (values['tech_domain'] as string[]).length > 0;
  const hasCourseSignal   = typeof values['course_of_study'] === 'string' && values['course_of_study'].trim().length > 0;
  const hasCvSignal       = cvExtractedSkills.length > 0;
  const hasRecoSignals    = hasInterestSignal || hasCourseSignal || hasCvSignal || defenderType !== null;

  // Per-project match (score + reasons), computed once across the available set.
  const projectMatches = useMemo(() => {
    const m = new Map<string, MatchResult>();
    if (hasRecoSignals) {
      availProjects.forEach(p => m.set(p.id, getProjectMatch(p, defenderType, values, cvExtractedSkills)));
    }
    return m;
  }, [availProjects, hasRecoSignals, defenderType, values, cvExtractedSkills]);

  // The recommended set: clearly-relevant projects (absolute floor or top ~40% by score).
  const recommendedIds = useMemo(() => {
    const ids = new Set<string>();
    if (!hasRecoSignals) return ids;
    const vals = Array.from(projectMatches.values()).map(r => r.score).sort((a, b) => b - a);
    const topN   = Math.max(1, Math.ceil(vals.length * 0.4));
    const relCut = vals[topN - 1] ?? 0;
    availProjects.forEach(p => {
      const s = projectMatches.get(p.id)?.score ?? 0;
      if (s > 0.05 && (s >= 0.5 || s >= relCut)) ids.add(p.id);
    });
    return ids;
  }, [availProjects, projectMatches, hasRecoSignals]);

  const sortedAvailProjects = hasRecoSignals
    ? [...availProjects].sort((a, b) =>
        (projectMatches.get(b.id)?.score ?? 0) - (projectMatches.get(a.id)?.score ?? 0))
    : availProjects;

  const availDomains = useMemo(() =>
    Array.from(new Set(availProjects.map(p => p.techDomain).filter((d): d is string => Boolean(d)))).sort()
  , [availProjects]);

  const recommendedOnly = hasRecoSignals && showRecommendedOnly && recommendedIds.size > 0;

  const filteredAvailProjects = useMemo(() => {
    let list = sortedAvailProjects;
    if (recommendedOnly) {
      list = list.filter(p => recommendedIds.has(p.id));
    }
    if (projectSearch.trim()) {
      const q = projectSearch.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.techDomain ?? '').toLowerCase().includes(q) ||
        (p.emergingArea ?? '').toLowerCase().includes(q) ||
        (p.skills ?? []).some(s => s.toLowerCase().includes(q)),
      );
    }
    if (projectDomainFilter) {
      list = list.filter(p => p.techDomain === projectDomainFilter);
    }
    return list;
  }, [sortedAvailProjects, projectSearch, projectDomainFilter, recommendedOnly, recommendedIds]);

  /* ── Success screen ───────────────────────────────────────────────────── */
  if (submitted) {
    return (
      <Shell activeRoute="/apply">
        <div className="max-w-lg mx-auto mt-8 space-y-4">
          {/* Confirmation banner */}
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} className="text-success" />
            </div>
            <div>
              <p className="text-body-md font-semibold text-fg">Application Submitted!</p>
              <p className="text-body-sm text-fg-muted">
                {programme?.title} — we will notify you of updates by email.
              </p>
            </div>
          </div>

          <div className="card p-8 text-center">
            <p className="text-body-md text-fg-muted">Your application has been received. We will be in touch soon.</p>
          </div>

          <Button className="w-full justify-center" onClick={() => router.push('/apply')}>
            View My Applications
          </Button>
        </div>
      </Shell>
    );
  }

  if (!programme || !template) {
    return (
      <Shell activeRoute="/apply">
        <div className="card p-10 text-center text-body-md text-fg-muted">Loading…</div>
      </Shell>
    );
  }

  /* ── Login screen ────────────────────────────────────────────────────── */
  if (myInfoState === 'login') {
    return (
      <Shell activeRoute="/apply">
        <nav className="flex items-center gap-2 mb-3 text-label-md">
          <span className="text-fg-muted cursor-pointer hover:text-accent transition-colors" onClick={() => router.push('/apply')}>Programmes</span>
          <ChevronRight size={16} className="text-fg-subtle" />
          <span className="text-fg">{programme?.title ?? '…'}</span>
        </nav>

        <div className="mb-5 px-4 py-3 rounded-lg border border-border bg-bg-subtle">
          <p className="text-[13px] text-fg-muted leading-relaxed">
            <span className="font-semibold text-fg">Prototype note:</span> This login screen is for demonstration only. In production, applicants would access this via the DSTA public website with actual authentication.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="card p-7">
            <h1 className="text-headline-md text-fg mb-1">Sign in to apply</h1>
            <p className="text-body-sm text-fg-muted mb-6">You need an account to submit an application.</p>

            <button
              onClick={() => setMyInfoState('consent')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-left mb-4 group"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #c0392b 0%, #8e0000 100%)' }}>
                <Shield size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-md font-semibold text-fg">Login with Singpass</p>
                <p className="text-body-sm text-fg-muted">Use your Singpass ID to sign in and auto-fill your details via MyInfo</p>
              </div>
              <ChevronRight size={16} className="text-fg-subtle group-hover:text-accent transition-colors shrink-0" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 border-t border-border" />
              <span className="text-caption text-fg-subtle">or</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div>
                <label className="block text-label-sm text-fg mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-surface text-body-md text-fg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-fg-muted"
                  />
                </div>
              </div>
              <div>
                <label className="block text-label-sm text-fg mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 rounded-lg border border-border bg-surface text-body-md text-fg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-fg-muted"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? <><Loader2 size={14} className="animate-spin" /> Signing in…</> : 'Sign In'}
              </Button>
            </form>
          </div>
        </div>
      </Shell>
    );
  }

  /* ── MyInfo consent / retrieval screen ──────────────────────────────────── */
  if (myInfoState !== 'form') {
    const retrieving = myInfoState === 'retrieving';
    const myInfoFields = (template.fields ?? []).filter(f => MYINFO[f.id]);
    return (
      <Shell activeRoute="/apply">
        <nav className="flex items-center gap-2 mb-3 text-label-md">
          <span className="text-fg-muted cursor-pointer hover:text-accent transition-colors" onClick={() => router.push('/apply')}>Programmes</span>
          <ChevronRight size={16} className="text-fg-subtle" />
          <span className="text-fg">{programme.title}</span>
        </nav>

        <div className="mb-5 px-4 py-3 rounded-lg border border-border bg-bg-subtle">
          <p className="text-[13px] text-fg-muted leading-relaxed">
            <span className="font-semibold text-fg">Prototype note:</span> This screen simulates the Singpass MyInfo consent flow for demonstration purposes.
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="card overflow-hidden">
            <div className="px-6 py-5 border-b border-border" style={{ background: 'linear-gradient(135deg, #c0392b 0%, #8e0000 100%)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Shield size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-black text-[15px] tracking-tight">Singpass</p>
                  <p className="text-white/70 text-[13px]">MyInfo — Personal Data Retrieval</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-body-md text-fg mb-1">
                <span className="font-semibold">{programme.title}</span> would like to access your Singpass MyInfo to pre-fill your application.
              </p>
              <p className="text-body-sm text-fg-muted mb-5">The following data will be retrieved. You can edit any field after retrieval.</p>

              <div className="space-y-1.5 mb-6">
                {myInfoFields.map(f => (
                  <div key={f.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg-subtle">
                    <CheckCircle2 size={14} className="text-success shrink-0" />
                    <span className="text-body-sm text-fg">{f.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2.5">
                <Button className="w-full" onClick={handleRetrieveMyInfo} disabled={retrieving}>
                  {retrieving ? <><Loader2 size={14} className="animate-spin" /> Retrieving from Singpass…</> : <><Shield size={14} /> Retrieve via Singpass</>}
                </Button>
                <Button variant="outline" className="w-full" onClick={handleSkipMyInfo} disabled={retrieving}>
                  Fill in manually
                </Button>
              </div>

              <p className="mt-4 text-caption text-fg-subtle text-center">
                Your data is protected under the Personal Data Protection Act (PDPA).
              </p>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  /* ── Step labels ──────────────────────────────────────────────────────── */
  const stepLabels = [...sections, 'Project Preferences'];

  return (
    <Shell activeRoute="/apply">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-4 text-label-md">
        <span className="text-fg-muted cursor-pointer hover:text-accent transition-colors" onClick={() => router.push('/apply')}>Programmes</span>
        <ChevronRight size={16} className="text-fg-subtle" />
        <span className="text-fg-muted truncate max-w-[200px]">{programme.title}</span>
        <ChevronRight size={16} className="text-fg-subtle" />
        <span className="text-fg">Apply</span>
      </nav>

      {/* Horizontal stepper */}
      <div className="mb-5">
        <div className="flex items-start">
          {stepLabels.map((label, i) => (
            <Fragment key={label}>
              <div className="flex flex-col items-center shrink-0">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black transition-colors',
                  i < step  ? 'bg-success text-white'  : '',
                  i === step ? 'bg-accent text-white'   : '',
                  i > step  ? 'bg-border text-fg-muted' : '',
                )}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={cn(
                  'text-[13px] font-semibold mt-1.5 text-center leading-tight',
                  i < step  ? 'text-success'  : '',
                  i === step ? 'text-accent'   : '',
                  i > step  ? 'text-fg-muted'  : '',
                  stepLabels.length <= 4 ? 'max-w-[72px]' : 'max-w-[60px]',
                )}>
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mt-4 mx-1 transition-colors',
                  i < step ? 'bg-success' : 'bg-border',
                )} />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Form content */}
      <div>

        {/* Draft restored banner */}
        {draftRestored && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-info-bg border border-info/25">
            <Info size={15} className="text-info shrink-0" />
            <p className="text-body-sm text-info font-medium flex-1">Draft restored — pick up where you left off.</p>
            <button onClick={() => setDraftRestored(false)} className="text-info hover:text-fg transition-colors shrink-0">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Up-front AI disclosure — shown at the start of the application */}
        {step === 0 && (
          <div className="mb-4 flex items-start gap-2.5 px-4 py-2.5 rounded-lg bg-bg-subtle border border-border">
            <Sparkles size={14} className="text-fg-muted shrink-0 mt-0.5" />
            <p className="text-[13px] text-fg-muted">
              Parts of this application use AI to help personalise your project suggestions. AI output may not always be accurate, and the final choice is always yours.
            </p>
          </div>
        )}

        {/* Form section steps (standard sections) */}
        {step < sections.length && !isPersonalisationSection && (
          <div className="card p-5">
            <h2 className="text-headline-md text-fg mb-4">{sections[step]}</h2>

            {step === 0 && myInfoPrefilled.length > 0 && (
              <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg bg-success/10 border border-success/25">
                <CheckCircle2 size={15} className="text-success shrink-0" />
                <p className="text-body-sm text-success font-medium">
                  {myInfoPrefilled.length} fields pre-filled from Singpass MyInfo. You can edit them if needed.
                </p>
              </div>
            )}

            {showCvBanners && cvParseLoading && (
              <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg bg-accent/10 border border-accent/25">
                <Loader2 size={15} className="text-accent animate-spin shrink-0" />
                <p className="text-body-sm text-accent font-medium">Parsing your CV…</p>
              </div>
            )}
            {showCvBanners && !cvParseLoading && cvParsedFields.includes('__none__') && (
              <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg bg-warning-bg border border-warning/30">
                <AlertTriangle size={15} className="text-warning shrink-0" />
                <p className="text-body-sm text-warning font-medium">
                  Could not extract text from this file — it may be an image-based or encrypted PDF. Please fill in your details manually.
                </p>
              </div>
            )}
            {showCvBanners && !cvParseLoading && cvParsedFields.length > 0 && !cvParsedFields.includes('__none__') && (
              <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg bg-success/10 border border-success/25">
                <CheckCircle2 size={15} className="text-success shrink-0" />
                <p className="text-body-sm text-success font-medium">
                  {cvParsedFields.length} field{cvParsedFields.length !== 1 ? 's' : ''} extracted from your CV. Review and edit if needed.
                </p>
              </div>
            )}

            {showTranscriptBanners && transcriptParseLoading && (
              <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg bg-info-bg border border-info/25">
                <Loader2 size={15} className="text-info animate-spin shrink-0" />
                <p className="text-body-sm text-info font-medium">Parsing your transcript…</p>
              </div>
            )}
            {showTranscriptBanners && !transcriptParseLoading && transcriptParsedFields.includes('__none__') && (
              <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg bg-warning-bg border border-warning/30">
                <AlertTriangle size={15} className="text-warning shrink-0" />
                <p className="text-body-sm text-warning font-medium">
                  Could not extract text from your transcript — it may be an image-based or encrypted PDF. Please fill in your academic details manually.
                </p>
              </div>
            )}
            {showTranscriptBanners && !transcriptParseLoading && transcriptParsedFields.length > 0 && !transcriptParsedFields.includes('__none__') && (
              <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg bg-info-bg border border-info/25">
                <CheckCircle2 size={15} className="text-info shrink-0" />
                <p className="text-body-sm text-info font-medium">
                  {transcriptParsedFields.length} field{transcriptParsedFields.length !== 1 ? 's' : ''} extracted from your transcript. Review and edit if needed.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              {currentFields.map(renderField)}
            </div>
          </div>
        )}

        {/* Optional personalisation — interests + the About You quiz, one cohesive card */}
        {step < sections.length && isPersonalisationSection && (
          <div className="card p-5">
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Sparkles size={20} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-headline-md text-fg flex items-center gap-2">
                  Personalise your recommendations <OptionalPill />
                </h2>
                <p className="text-body-sm text-fg-muted mt-0.5">
                  Pick the tech domains you&apos;re drawn to and we&apos;ll highlight projects that fit.
                </p>
              </div>
            </div>

            {/* Part 1 — tech domain interests */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              {personalisationFields.map(renderField)}
            </div>

            {/* Divider into part 2 */}
            <div className="border-t border-border my-5" />

            {/* Part 2 — About You quiz, inline */}
            {!quizIntroSeen && !quizSkipped && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-body-lg font-semibold text-fg">…and how do you like to work?</h3>
                  <p className="text-body-sm text-fg-muted mt-0.5">
                    Answer 6 quick scenario questions — there are no right answers. It sharpens your matches to projects that suit how you think.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => { setQuizSkipped(false); setQuizIntroSeen(true); }}>
                    Start the 2-min quiz <ChevronRight size={14} />
                  </Button>
                  <Button variant="ghost" onClick={() => { setQuizSkipped(true); setErrors(prev => { const n = { ...prev }; delete n.quiz; return n; }); }}>
                    Skip
                  </Button>
                </div>
              </div>
            )}

            {quizSkipped && !quizIntroSeen && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg-subtle">
                <Target size={16} className="text-fg-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-semibold text-fg">Quiz skipped</p>
                  <p className="text-[13px] text-fg-muted">You can still take it to sharpen your recommendations.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setQuizSkipped(false); setQuizIntroSeen(true); }}>Take the quiz</Button>
              </div>
            )}

            {quizIntroSeen && (
              <div className="space-y-3">
                {/* Current question (one at a time) */}
                {quizStep < QUIZ_QUESTIONS.length && (
                  <div>
                    {/* Progress header */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-body-sm font-semibold text-fg">A few quick questions</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex gap-1">
                          {QUIZ_QUESTIONS.map((q, i) => (
                            <div key={q.id} className={cn(
                              'w-1.5 h-1.5 rounded-full transition-colors',
                              i < quizStep ? 'bg-success' : i === quizStep ? 'bg-accent' : 'bg-border',
                            )} />
                          ))}
                        </div>
                        <span className="text-caption text-fg-muted ml-1">
                          {quizStep + 1}/{QUIZ_QUESTIONS.length}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-headline-sm text-fg mb-4">{QUIZ_QUESTIONS[quizStep].question}</h3>
                    {(() => {
                  const qId = QUIZ_QUESTIONS[quizStep].id;
                  const isLocked = qId in quizAnswers;
                  const displaySelected = isLocked ? quizAnswers[qId] : pendingAnswer;
                  const pendingLabel = QUIZ_QUESTIONS[quizStep].answers.find(a => a.archetype === pendingAnswer)?.label;
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {QUIZ_QUESTIONS[quizStep].answers.map(ans => {
                          const selected = displaySelected === ans.archetype;
                          const AnsIcon = ans.icon;
                          return (
                            <button
                              key={ans.archetype}
                              type="button"
                              disabled={isLocked}
                              onClick={() => { if (!isLocked) setPendingAnswer(ans.archetype); }}
                              className={cn(
                                'p-4 rounded-xl border-2 text-left transition-all',
                                selected && !isLocked
                                  ? 'border-accent bg-accent/5 shadow-sm ring-2 ring-accent/20'
                                  : selected && isLocked
                                    ? 'border-accent bg-accent/5 shadow-sm'
                                    : isLocked
                                      ? 'border-border bg-surface opacity-40 cursor-not-allowed'
                                      : 'border-border bg-surface hover:border-accent/40 hover:bg-accent/5 cursor-pointer',
                              )}
                            >
                              <AnsIcon size={22} className={cn('mb-2', selected ? 'text-accent' : 'text-fg-muted')} aria-hidden="true" />
                              <p className={cn('text-body-sm font-semibold leading-tight', selected ? 'text-accent' : 'text-fg')}>
                                {ans.label}
                              </p>
                              <p className="text-caption text-fg-muted mt-0.5 leading-snug">{ans.description}</p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Confirm strip — shown when pending but not yet locked */}
                      {pendingAnswer !== null && !isLocked && (
                        <div className="mt-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-accent/5 border border-accent/20">
                          <p className="text-body-sm text-fg-muted">
                            Selected: <span className="font-semibold text-fg">"{pendingLabel}"</span> — confirm your choice?
                          </p>
                          <Button size="sm" onClick={() => {
                            setQuizAnswers(prev => ({ ...prev, [qId]: pendingAnswer! }));
                            setPendingAnswer(null);
                            setQuizStep(s => s + 1);
                          }}>
                            <Check size={13} /> Confirm
                          </Button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

                {/* Result — short write-up, inline */}
                {defenderType && quizStep >= QUIZ_QUESTIONS.length && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-success/5 border border-success/20">
                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <Check size={15} className="text-success" />
                    </div>
                    <div>
                      <p className="text-body-md font-semibold text-fg mb-1.5">Nice, here&apos;s the vibe we&apos;re picking up</p>
                      <p className="text-body-md text-fg leading-relaxed">{ARCHETYPE_META[defenderType].description}</p>
                      <p className="text-[12px] text-fg-subtle mt-2.5">An AI read of your answers, used only to tailor your project suggestions on the next step — it&apos;s not an assessment.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Required fields for the last section (e.g. scholarship), shown after the optional panel/quiz */}
        {step < sections.length && isPersonalisationSection && requiredSectionFields.length > 0 && (
          <div className="card p-5 mt-4">
            <h2 className="text-headline-md text-fg mb-4">{sections[step]}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              {requiredSectionFields.map(renderField)}
            </div>
          </div>
        )}

        {/* Project Preferences step */}
        {step === sections.length && (
          <div className="space-y-3">

            {/* Instruction banner */}
            <div className="card p-4 border-accent/20 bg-accent/5">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Star size={15} className="text-accent" />
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-body-md font-semibold text-fg">Build your ranked project shortlist</p>
                  <p className="text-body-sm text-fg-muted leading-relaxed">
                    Select <span className="font-semibold text-fg">up to {maxProjectRanks} project{maxProjectRanks === 1 ? '' : 's'}</span> from the list below and arrange them in order of preference.
                    Your <span className="font-semibold text-fg">Rank 1</span> choice is your top pick.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    {[
                      { icon: Plus,       text: 'Tap "Add" to shortlist a project' },
                      { icon: GripVertical, text: 'Drag cards to reorder your ranking' },
                      { icon: X,          text: 'Remove a project to swap it out' },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-1.5 text-body-sm text-fg-muted">
                        <Icon size={13} className="text-accent shrink-0" />
                        {text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Ranked list */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="text-headline-md text-fg">Your Ranked Shortlist</h2>
                  <p className="text-body-sm text-fg-muted">Rank 1 = your top choice. You must select at least 1 project.</p>
                </div>
                <span className={cn('text-label-sm font-bold shrink-0 ml-3', prefs.length >= 5 ? 'text-warning' : prefs.length > 0 ? 'text-success' : 'text-fg-muted')}>
                  {prefs.length}/5
                </span>
              </div>

              {prefs.length === 0 ? (
                <div className="mt-3 text-center py-8 text-body-sm text-fg-muted border-2 border-dashed border-border rounded-lg">
                  <Star size={20} className="mx-auto mb-2 text-border" />
                  No projects selected yet — add from the list below.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {prefProjects.map((proj, i) => (
                    <div
                      key={proj.id}
                      draggable
                      onDragStart={() => handleDragStart(i)}
                      onDragOver={e => handleDragOver(e, i)}
                      onDrop={() => handleDrop(i)}
                      onDragEnd={handleDragEnd}
                    >
                      <ProjectCard
                        project={proj}
                        rank={i + 1}
                        onRemove={() => removePref(proj.id)}
                        canAdd={canAddMore}
                        onViewDetails={() => setSelectedProject(proj)}
                        isDragging={dragIndex === i}
                        isDragOver={dragOverIndex === i && dragIndex !== i}
                      />
                    </div>
                  ))}
                </div>
              )}

              {prefs.length >= 5 && (
                <div className="mt-3 flex items-center gap-2 text-warning text-body-sm">
                  <Info size={14} />
                  Maximum of 5 projects reached. Remove one to add another.
                </div>
              )}

              {errors.prefs && (
                <p className="mt-2 text-caption text-danger">{errors.prefs}</p>
              )}
            </div>

            {/* Available projects */}
            {availProjects.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-headline-md text-fg">Available Projects</h2>
                  <span className="text-body-sm text-fg-muted">
                    {filteredAvailProjects.length}{filteredAvailProjects.length !== availProjects.length && ` of ${availProjects.length}`}
                  </span>
                </div>

                {/* Recommended / All toggle — only when we have signals to recommend on */}
                {hasRecoSignals && recommendedIds.size > 0 && (
                  <div className="mb-3 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-0.5">
                        <button
                          type="button"
                          onClick={() => setShowRecommendedOnly(true)}
                          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-sm font-semibold transition-colors',
                            showRecommendedOnly ? 'bg-surface text-accent shadow-sm' : 'text-fg-muted hover:text-fg')}
                        >
                          <Star size={13} className={showRecommendedOnly ? 'text-accent' : 'text-fg-muted'} />
                          Recommended {recommendedIds.size}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRecommendedOnly(false)}
                          className={cn('px-3 py-1.5 rounded-md text-body-sm font-semibold transition-colors',
                            !showRecommendedOnly ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
                        >
                          All projects {availProjects.length}
                        </button>
                      </div>
                      <p className="text-[13px] text-fg-muted">
                        {showRecommendedOnly
                          ? 'Picked for you based on your interests, studies and CV.'
                          : 'Showing every project — the star marks your top matches.'}
                      </p>
                    </div>
                    <p className="flex items-start gap-1.5 text-[12px] text-fg-subtle">
                      <Info size={12} className="shrink-0 mt-0.5" />
                      These suggestions are generated by AI from the details you shared and may not always be accurate. Every project stays open to you — the final choice is entirely yours.
                    </p>
                  </div>
                )}

                {/* Nudge when there's nothing to personalise on */}
                {!hasRecoSignals && (
                  <div className="flex items-start gap-2 mb-3 px-3 py-2.5 rounded-lg bg-bg-subtle border border-border">
                    <Sparkles size={14} className="text-fg-muted shrink-0 mt-0.5" />
                    <p className="text-body-sm text-fg-muted">
                      Want tailored picks? Add your interests on the previous step (or upload a CV) and we&apos;ll surface the projects that fit you best.
                    </p>
                  </div>
                )}

                {/* Search + domain filter */}
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by title, domain, or skill…"
                      value={projectSearch}
                      onChange={e => setProjectSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-surface text-body-sm text-fg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-fg-muted"
                    />
                  </div>
                  {availDomains.length > 1 && (
                    <select
                      value={projectDomainFilter}
                      onChange={e => setProjectDomainFilter(e.target.value)}
                      className="rounded-lg border border-border bg-surface px-3 py-2 text-body-sm text-fg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all cursor-pointer shrink-0 max-w-[180px]"
                    >
                      <option value="">All domains</option>
                      {availDomains.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  )}
                </div>

                {/* Project table */}
                <div className="max-h-[480px] overflow-y-auto overflow-x-auto">
                  {filteredAvailProjects.length === 0 ? (
                    <p className="text-center py-8 text-body-sm text-fg-muted">
                      {recommendedOnly ? 'No recommended projects match your search. ' : 'No projects match your search. '}
                      {recommendedOnly && (
                        <button type="button" onClick={() => setShowRecommendedOnly(false)} className="text-accent font-semibold hover:underline">
                          View all projects
                        </button>
                      )}
                    </p>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-2 pr-2 w-5" />
                          <th className="pb-2 pr-4 text-label-sm text-fg-muted font-semibold">Project</th>
                          <th className="pb-2 pr-4 text-label-sm text-fg-muted font-semibold hidden sm:table-cell w-40">Domain</th>
                          <th className="pb-2 pr-4 text-label-sm text-fg-muted font-semibold hidden md:table-cell">Skills</th>
                          <th className="pb-2 w-20" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAvailProjects.map(proj => {
                          const isRec   = recommendedIds.has(proj.id);
                          const reasons = projectMatches.get(proj.id)?.reasons ?? [];
                          return (
                            <tr
                              key={proj.id}
                              onClick={() => setSelectedProject(proj)}
                              className="border-b border-border last:border-0 hover:bg-bg-subtle/50 cursor-pointer group transition-colors"
                            >
                              {/* AI star */}
                              <td className="py-3 pr-2 align-top">
                                {isRec
                                  ? <Star size={13} className="text-accent mt-0.5" />
                                  : <span className="w-[13px] inline-block" />
                                }
                              </td>
                              {/* Title + mentor + why-recommended */}
                              <td className="py-3 pr-4 align-top">
                                <p className="text-body-md font-semibold text-fg group-hover:text-accent transition-colors leading-snug">
                                  {proj.title}
                                </p>
                                <p className="text-body-sm text-fg-muted mt-0.5">{proj.mentor}</p>
                                {isRec && reasons.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {reasons.slice(0, 2).map(r => (
                                      <span key={r} className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/8 text-accent border border-accent/15 leading-tight">
                                        <Check size={9} className="shrink-0" />{r}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              {/* Tech domain + emerging area */}
                              <td className="py-3 pr-4 align-top hidden sm:table-cell w-40">
                                <div className="space-y-1">
                                  {proj.techDomain && (
                                    <span className="inline-block text-[12px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 leading-tight max-w-[156px] truncate">
                                      {proj.techDomain}
                                    </span>
                                  )}
                                  {proj.emergingArea && (
                                    <span className="inline-block text-[12px] font-semibold px-2 py-0.5 rounded-full bg-bg-subtle text-fg-muted border border-border leading-tight max-w-[156px] truncate">
                                      {proj.emergingArea}
                                    </span>
                                  )}
                                </div>
                              </td>
                              {/* Skills */}
                              <td className="py-3 pr-4 align-top hidden md:table-cell">
                                <div className="flex flex-wrap gap-1">
                                  {(proj.skills ?? []).slice(0, 3).map(s => (
                                    <span key={s} className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-bg-subtle border border-border text-fg-muted">
                                      {s}
                                    </span>
                                  ))}
                                  {(proj.skills ?? []).length > 3 && (
                                    <span className="text-[12px] text-fg-subtle self-center">
                                      +{(proj.skills ?? []).length - 3}
                                    </span>
                                  )}
                                </div>
                              </td>
                              {/* Add button */}
                              <td className="py-3 align-top text-right" onClick={e => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addPref(proj.id)}
                                  disabled={!canAddMore}
                                >
                                  <Plus size={12} /> Add
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {projects.length === 0 && (
              <div className="card p-8 text-center text-body-sm text-fg-muted">
                No projects are available for this programme yet.
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-5">
          <Button variant="outline" onClick={step === 0 ? () => router.push('/apply') : goBack}>
            <ChevronLeft size={15} /> {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveDraft}>
              Save as Draft
            </Button>
            {isLastStep ? (
              <Button onClick={handleSubmit}>
                <Send size={14} /> Submit Application
              </Button>
            ) : (
              <Button onClick={goNext}>
                Next <ChevronRight size={15} />
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* Project detail drawer */}
      {selectedProject && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-fg/20 z-40"
            onClick={() => setSelectedProject(null)}
          />
          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-border shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-caption text-fg-muted mb-1">Project Details</p>
                <h2 className="text-headline-sm text-fg leading-snug">{selectedProject.title}</h2>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted transition-colors shrink-0 mt-0.5"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Domain chips */}
              {(selectedProject.techDomain || selectedProject.emergingArea) && (
                <div className="flex flex-wrap gap-2">
                  {selectedProject.techDomain && (
                    <span className="text-[13px] font-semibold px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                      {selectedProject.techDomain}
                    </span>
                  )}
                  {selectedProject.emergingArea && (
                    <span className="text-[13px] font-semibold px-2.5 py-1 rounded-full bg-bg-subtle text-fg-muted border border-border">
                      {selectedProject.emergingArea}
                    </span>
                  )}
                </div>
              )}

              {/* Description */}
              {selectedProject.description && (
                <div>
                  <p className="text-label-sm text-fg-muted mb-1.5">About this Project</p>
                  <p className="text-body-sm text-fg leading-relaxed">{selectedProject.description}</p>
                </div>
              )}

              {/* Skills */}
              {(selectedProject.skills ?? []).length > 0 && (
                <div>
                  <p className="text-label-sm text-fg-muted mb-2">Skills & Technologies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedProject.skills ?? []).map(s => (
                      <span key={s} className="text-[13px] font-semibold px-2 py-0.5 rounded-full bg-bg-subtle border border-border text-fg-muted">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Logistics */}
              <div className="grid grid-cols-2 gap-3">
                {selectedProject.internshipDuration && (
                  <div className="flex items-start gap-2">
                    <Clock size={14} className="text-fg-subtle mt-0.5 shrink-0" />
                    <div>
                      <p className="text-caption text-fg-muted">Project Duration</p>
                      <p className="text-body-sm text-fg font-medium">{selectedProject.internshipDuration}</p>
                    </div>
                  </div>
                )}
                {selectedProject.workingLocation && (
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-fg-subtle mt-0.5 shrink-0" />
                    <div>
                      <p className="text-caption text-fg-muted">Location</p>
                      <p className="text-body-sm text-fg font-medium">{selectedProject.workingLocation}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Mentor */}
              <div className="border-t border-border pt-4">
                <p className="text-label-sm text-fg-muted mb-2">Mentor</p>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-accent font-bold text-[13px]">
                    {selectedProject.mentor.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-body-sm font-semibold text-fg">{selectedProject.mentor}</p>
                    {selectedProject.mentorAppointment && (
                      <p className="text-caption text-fg-muted">{selectedProject.mentorAppointment}</p>
                    )}
                    {selectedProject.mentorBio && (
                      <p className="text-body-sm text-fg-muted mt-1.5 leading-relaxed">{selectedProject.mentorBio}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer action */}
            <div className="px-6 py-4 border-t border-border shrink-0">
              {prefs.includes(selectedProject.id) ? (
                <Button variant="outline" className="w-full border-danger/40 text-danger hover:bg-danger/5" onClick={() => { removePref(selectedProject.id); setSelectedProject(null); }}>
                  <X size={14} /> Remove from Preferences
                </Button>
              ) : (
                <Button className="w-full" disabled={!canAddMore} onClick={() => { addPref(selectedProject.id); setSelectedProject(null); }}>
                  <Plus size={14} /> Add to Preferences
                </Button>
              )}
            </div>
          </div>
        </>
      )}
      <Toast message={toastMsg} />
    </Shell>
  );
}
