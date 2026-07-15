/* ─────────────────────────────────────────────────────────────────────────────
   Structured project-request Excel template.

   Generated from the ProjectRequest rows that share one upload token (i.e. one
   request email to a Programme Centre). Layout (per the agreed sample):
     • one worksheet TAB per Intern Category
     • a left "Period / Duration" bar for each requested calendar-period block
     • each project uses 3 rows, so Tech Competency and Discipline are multi-select
       (up to 3 stacked dropdown cells); the other fields are merged across the 3 rows
     • a placement tracker at the bottom of each block (auto-counts placements filled)

   Download-only: the recipient fills it offline. (Round-trip parsing is a later step.)
   ──────────────────────────────────────────────────────────────────────────── */
import type { ProjectRequest } from './types';
import { PROJECT_SUBMISSION_COLUMNS } from './data';
import { DISCIPLINE_OPTIONS } from './disciplines';

const TECH_COMPETENCIES = PROJECT_SUBMISSION_COLUMNS.find(c => c.name === 'Tech Domain')?.dropdownValues ?? [];

type ColKind = 'bar' | 'auto' | 'merge' | 'stack';
interface Col { header: string; width: number; kind: ColKind; list?: 'tech' | 'disc'; num?: boolean; }

const COLS: Col[] = [
  { header: 'Period / Duration',             width: 22, kind: 'bar' },
  { header: 'Programme Centre',              width: 15, kind: 'auto' },
  { header: 'Project Title',                 width: 26, kind: 'merge' },
  { header: 'Project Scope',                 width: 40, kind: 'merge' },
  { header: 'Tech Competency (up to 3)',     width: 28, kind: 'stack', list: 'tech' },
  { header: 'Discipline of Study (up to 3)', width: 26, kind: 'stack', list: 'disc' },
  { header: 'Primary Mentor Name',           width: 18, kind: 'merge' },
  { header: 'Primary Mentor Appointment',    width: 22, kind: 'merge' },
  { header: 'Primary Mentor Email',          width: 24, kind: 'merge' },
  { header: 'Secondary Mentor Name',         width: 18, kind: 'merge' },
  { header: 'Secondary Mentor Appointment',  width: 22, kind: 'merge' },
  { header: 'Secondary Mentor Email',        width: 24, kind: 'merge' },
  { header: 'Placements',                    width: 11, kind: 'merge', num: true },
];

const ENTRY_ROWS = 3; // each project entry spans 3 rows (for up-to-3 Tech/Discipline)

const NAVY = 'FF0F2F6E';
const BLUE = 'FF1856D6';
const GREY = 'FFEDEFF2';
const LIGHT = 'FFEAF1FF';
const TRACK = 'FFF3F7FF';
const GREEN_BG = 'FFDCF5E5';
const GREEN_FG = 'FF1B7A44';
const BORDER = 'FFBFC7D2';

const thin = { style: 'thin' as const, color: { argb: BORDER } };
const box = () => ({ top: thin, left: thin, bottom: thin, right: thin });

/** Excel tab names can't contain / \ ? * [ ] : and cap at 31 chars. */
function safeTab(name: string, used: Set<string>): string {
  let t = (name || 'Sheet').replace(/[/\\?*[\]:]/g, ' - ').replace(/\s+/g, ' ').trim().slice(0, 31);
  const base = t;
  let i = 2;
  while (used.has(t)) { t = `${base.slice(0, 28)} ${i}`.slice(0, 31); i++; }
  used.add(t);
  return t;
}

/** Build + download the structured template for one request (rows sharing a token). */
export async function downloadRequestTemplateXLSX(
  requests: ProjectRequest[],
  fileName = 'DSTA_Project_Request_Template.xlsx',
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DSTA TOA Portal';

  const pc = requests.find(r => r.programmeCenter)?.programmeCenter ?? '';
  const headName = requests.find(r => r.headName)?.headName ?? '';
  const sender = requests.find(r => r.senderName)?.senderName ?? 'Internship Office';
  const deadline = requests.find(r => r.deadline)?.deadline ?? '';

  // Hidden lookup sheet holds the long dropdown lists (Excel caps inline list
  // formulae at 255 chars, so reference a cell range instead).
  const lookups = wb.addWorksheet('_Lookups');
  lookups.state = 'veryHidden';
  TECH_COMPETENCIES.forEach((v, i) => { lookups.getCell(`A${i + 1}`).value = v; });
  DISCIPLINE_OPTIONS.forEach((v, i) => { lookups.getCell(`B${i + 1}`).value = v; });
  const REF: Record<'tech' | 'disc', string> = {
    tech: `_Lookups!$A$1:$A$${TECH_COMPETENCIES.length}`,
    disc: `_Lookups!$B$1:$B$${DISCIPLINE_OPTIONS.length}`,
  };

  // Group the request rows by Intern Category → one tab each.
  const byCat = new Map<string, ProjectRequest[]>();
  for (const r of requests) {
    const cat = (r.internCategory || r.educationLevel || 'Uncategorised') as string;
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(r);
  }

  const usedTabs = new Set<string>();
  const lastCol = COLS.length;

  for (const [cat, rows] of Array.from(byCat.entries())) {
    const ws = wb.addWorksheet(safeTab(cat, usedTabs), { views: [{ state: 'frozen', ySplit: 3 }] });
    COLS.forEach((c, i) => { ws.getColumn(i + 1).width = c.width; });
    const lastLetter = ws.getColumn(lastCol).letter;

    // Row 1 — title banner
    ws.mergeCells(`A1:${lastLetter}1`);
    Object.assign(ws.getCell('A1'), {
      value: `${cat} — Internship Project Submission`,
      font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
      alignment: { vertical: 'middle', indent: 1, wrapText: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } },
    });
    ws.getRow(1).height = 30;

    // Row 2 — instructions
    ws.mergeCells(`A2:${lastLetter}2`);
    Object.assign(ws.getCell('A2'), {
      value: `Requested by ${sender}${headName ? ` · to ${headName}` : ''}${deadline ? ` · reply by ${deadline}` : ''}. `
        + `Programme Centre (${pc || 'PC'}) is pre-filled. Each project uses 3 rows so you can pick up to 3 Tech `
        + `Competencies and 3 Disciplines. Add projects until each block's placements are met.`,
      font: { size: 9, color: { argb: 'FF555555' } },
      alignment: { vertical: 'middle', indent: 1, wrapText: true },
    });
    ws.getRow(2).height = 30;

    // Row 3 — header
    const hdr = ws.getRow(3);
    COLS.forEach((c, i) => { hdr.getCell(i + 1).value = c.header; });
    hdr.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
      cell.border = box();
    });
    hdr.height = 30;

    let r = 4;
    for (const req of rows) {
      const target = Math.max(1, req.placements || 1);
      const blockStart = r;

      // One project entry (3 rows) per placement requested.
      for (let e = 0; e < target; e++) {
        const es = r, ee = r + ENTRY_ROWS - 1;
        for (let k = 0; k < ENTRY_ROWS; k++) ws.getRow(r + k).height = 20;
        COLS.forEach((c, i) => {
          const col = ws.getColumn(i + 1).letter;
          if (c.kind === 'bar') return; // left bar handled after the block
          if (c.kind === 'stack') {
            for (let k = 0; k < ENTRY_ROWS; k++) {
              const cell = ws.getCell(`${col}${es + k}`);
              cell.dataValidation = { type: 'list', allowBlank: true, formulae: [REF[c.list!]] } as any;
              cell.alignment = { vertical: 'middle', wrapText: true };
            }
          } else {
            if (es !== ee) ws.mergeCells(`${col}${es}:${col}${ee}`);
            const cell = ws.getCell(`${col}${es}`);
            if (c.kind === 'auto') {
              cell.value = pc;
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } };
              cell.font = { color: { argb: 'FF666666' } };
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            } else {
              cell.alignment = { vertical: 'top', horizontal: c.num ? 'center' : 'left', wrapText: true };
            }
          }
        });
        r += ENTRY_ROWS;
      }

      // Placement tracker row — counts the Placements column across the block.
      const tr = r;
      const numLetter = ws.getColumn(lastCol).letter;
      ws.mergeCells(`B${tr}:${lastLetter}${tr}`);
      const tc = ws.getCell(`B${tr}`);
      tc.value = { formula: `"Placements filled: "&SUM(${numLetter}${blockStart}:${numLetter}${tr - 1})&" of ${target}"` } as any;
      tc.font = { italic: true, size: 10, color: { argb: NAVY } };
      tc.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
      tc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TRACK } };
      ws.addConditionalFormatting({
        ref: `B${tr}`,
        rules: [{
          type: 'expression',
          priority: 1,
          formulae: [`SUM(${numLetter}${blockStart}:${numLetter}${tr - 1})>=${target}`],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: GREEN_BG } }, font: { color: { argb: GREEN_FG } } },
        }],
      } as any);

      // Left bar — merged across the whole block
      ws.mergeCells(`A${blockStart}:A${tr}`);
      const bar = ws.getCell(`A${blockStart}`);
      bar.value = [req.calendarPeriod || 'Period TBC', req.duration || '', `${target} placement${target === 1 ? '' : 's'}`]
        .filter(Boolean).join('\n');
      bar.font = { bold: true, size: 11, color: { argb: NAVY } };
      bar.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      bar.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };

      // Grid borders across the block
      for (let rr = blockStart; rr <= tr; rr++) {
        for (let cc = 1; cc <= lastCol; cc++) {
          ws.getCell(`${ws.getColumn(cc).letter}${rr}`).border = box();
        }
      }
      r = tr + 2; // gap before next block
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
