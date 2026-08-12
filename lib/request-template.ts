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

/* ─────────────────────────────────────────────────────────────────────────────
   Template-file-based variant: clones the provided DSTA xlsx template and
   injects the same dynamic data per intern category.
   ──────────────────────────────────────────────────────────────────────────── */

const TEMPLATE_PATH = '/DSTA_Project_Request_Template_Skillset.xlsx';
const TEMPLATE_SHEET_NAME = 'Tech UP';

/** Deep copy a JSON-serialisable value. */
function copy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// The browser ExcelJS build drops the workbook's custom indexed-colors palette when
// writing a cloned sheet back. The template below uses indexed colors; we convert
// them to explicit ARGB when copying styles so the generated file looks identical.
const TEMPLATE_INDEXED_COLORS = [
  'FF000000', 'FFFFFFFF', 'FFFF0000', 'FF00FF00', 'FF0000FF', 'FFFFFF00', 'FFFF00FF', 'FF00FFFF',
  'FF000000', 'FFFFFFFF', 'FF0F2F6E', 'FFAAAAAA', 'FF555555', 'FFBFC7D2', 'FF1856D6', 'FFEAF1FF',
  'FF666666', 'FFEDEFF2', 'FF0000FF', 'FFF3F7FF',
];

function resolveIndexedColor(value: any): any {
  if (value && typeof value === 'object' && 'indexed' in value) {
    return { argb: TEMPLATE_INDEXED_COLORS[value.indexed] ?? 'FF000000' };
  }
  return value;
}

function copyStyle<T>(style: T): T {
  if (!style) return style;
  return JSON.parse(JSON.stringify(style), (_key, value) => resolveIndexedColor(value));
}

/** Clone an ExcelJS worksheet into a new (already-created) worksheet. */
function cloneWorksheet(source: any, target: any) {
  if (source.properties) target.properties = copy(source.properties);
  if (source.pageSetup) target.pageSetup = copy(source.pageSetup);
  if (source.views) target.views = copy(source.views);

  source.columns.forEach((col: any, i: number) => {
    const targetCol = target.getColumn(i + 1);
    targetCol.width = col.width;
    targetCol.hidden = col.hidden;
    targetCol.outlineLevel = col.outlineLevel;
    if (col.style) targetCol.style = copyStyle(col.style);
  });

  source.eachRow((row: any, rowNum: number) => {
    const targetRow = target.getRow(rowNum);
    targetRow.height = row.height;
    targetRow.hidden = row.hidden;
    targetRow.outlineLevel = row.outlineLevel;
    if (row.style) targetRow.style = copyStyle(row.style);

    row.eachCell((cell: any, colNum: number) => {
      const targetCell = targetRow.getCell(colNum);
      if (cell.formula) {
        targetCell.value = { formula: cell.formula, result: cell.result };
      } else {
        targetCell.value = cell.value;
      }
      if (cell.style) targetCell.style = copyStyle(cell.style);
      if (cell.dataValidation) targetCell.dataValidation = copy(cell.dataValidation);
      // Hyperlink is read-only in the browser ExcelJS build; skip it.
      // if (cell.hyperlink) targetCell.hyperlink = cell.hyperlink;
    });
  });

  (source.model.merges || []).forEach((merge: string) => {
    target.mergeCells(merge);
  });

  target.conditionalFormattings = (source.conditionalFormattings || []).map(copy);

  source.getImages().forEach((img: any) => {
    target.addImage(img.imageId, img.range);
  });
}

/** Copy styles, validations and merged-cell structure from the template block
 *  to a target block. Values are left untouched; caller fills them in. */
function stampBlock(
  ws: any,
  template: any,
  blockStart: number,
  templateBlockStart: number,
  entryRows: number,
) {
  for (let k = 0; k < entryRows; k++) {
    const srcRow = template.getRow(templateBlockStart + k);
    const dstRow = ws.getRow(blockStart + k);
    dstRow.height = srcRow.height;
    if (srcRow.style) dstRow.style = copy(srcRow.style);

    srcRow.eachCell((srcCell: any, colNum: number) => {
      const dstCell = dstRow.getCell(colNum);
      if (srcCell.style) dstCell.style = copy(srcCell.style);
      if (srcCell.dataValidation) dstCell.dataValidation = copy(srcCell.dataValidation);
      if (srcCell.alignment) dstCell.alignment = copy(srcCell.alignment);
    });
  }

  (template.model.merges || []).forEach((merge: string) => {
    const [topLeft, bottomRight] = merge.split(':');
    const srcStartRow = parseInt(topLeft.replace(/[A-Z]+/g, ''), 10);
    const srcEndRow = parseInt(bottomRight.replace(/[A-Z]+/g, ''), 10);
    if (srcStartRow >= templateBlockStart && srcEndRow <= templateBlockStart + entryRows - 1) {
      const colStart = topLeft.replace(/[0-9]+/g, '');
      const colEnd = bottomRight.replace(/[0-9]+/g, '');
      const offset = blockStart - templateBlockStart;
      ws.mergeCells(`${colStart}${srcStartRow + offset}:${colEnd}${srcEndRow + offset}`);
    }
  });
}

/** Copy the tracker row style and merge from the template. */
function stampTracker(ws: any, template: any, tr: number, templateTrackerRow: number) {
  const srcRow = template.getRow(templateTrackerRow);
  const dstRow = ws.getRow(tr);
  dstRow.height = srcRow.height;
  if (srcRow.style) dstRow.style = copy(srcRow.style);

  srcRow.eachCell((srcCell: any, colNum: number) => {
    const dstCell = dstRow.getCell(colNum);
    if (srcCell.style) dstCell.style = copy(srcCell.style);
  });

  (template.model.merges || []).forEach((merge: string) => {
    const [topLeft, bottomRight] = merge.split(':');
    const srcRowNum = parseInt(topLeft.replace(/[A-Z]+/g, ''), 10);
    if (srcRowNum === templateTrackerRow) {
      const colStart = topLeft.replace(/[0-9]+/g, '');
      const colEnd = bottomRight.replace(/[0-9]+/g, '');
      const offset = tr - templateTrackerRow;
      ws.mergeCells(`${colStart}${srcRowNum + offset}:${colEnd}${srcRowNum + offset}`);
    }
  });
}

/** Build + download the structured template by cloning the provided xlsx file. */
export async function downloadRequestTemplateFromXlsx(
  requests: ProjectRequest[],
  fileName = 'DSTA_Project_Request_Template_Skillset.xlsx',
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;

  const res = await fetch(TEMPLATE_PATH);
  if (!res.ok) {
    throw new Error(`Failed to fetch template: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);

  const template = wb.getWorksheet(TEMPLATE_SHEET_NAME);
  if (!template) {
    throw new Error(`Template sheet '${TEMPLATE_SHEET_NAME}' not found`);
  }
  // Free up the template sheet's name so category tabs keep their exact names;
  // the template sheet itself is removed before the file is written.
  template.name = '_Template';

  const lookups = wb.getWorksheet('_Lookups');
  if (lookups) lookups.state = 'veryHidden';

  const pc = requests.find(r => r.programmeCenter)?.programmeCenter ?? '';
  const headName = requests.find(r => r.headName)?.headName ?? '';
  const sender = requests.find(r => r.senderName)?.senderName ?? 'Internship Office';
  const deadline = requests.find(r => r.deadline)?.deadline ?? '';

  const byCat = new Map<string, ProjectRequest[]>();
  for (const r of requests) {
    const cat = (r.internCategory || r.educationLevel || 'Uncategorised') as string;
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(r);
  }

  const usedTabs = new Set<string>();
  const lastCol = template.columns.length;
  const lastLetter = template.getColumn(lastCol).letter;

  const ENTRY_ROWS = 3;
  const TEMPLATE_TITLE_ROW = 1;
  const TEMPLATE_INSTR_ROW = 2;
  const TEMPLATE_BLOCK_START = 4;
  const TEMPLATE_TRACKER_ROW = 7;

  for (const [cat, rows] of Array.from(byCat.entries())) {
    const ws = wb.addWorksheet(safeTab(cat, usedTabs));
    cloneWorksheet(template, ws);

    ws.getCell(`A${TEMPLATE_TITLE_ROW}`).value = `${cat} — Internship Project Submission`;
    ws.getCell(`A${TEMPLATE_INSTR_ROW}`).value =
      `Requested by ${sender}${headName ? ` · to ${headName}` : ''}${deadline ? ` · reply by ${deadline}` : ''}. `
      + `Programme Centre (${pc || 'PC'}) is pre-filled. Each project uses 3 rows so you can pick up to 3 `
      + `Tech Competencies and 3 Disciplines. Add projects until each block's placements are met.`;

    const mergesToRemove = (ws.model.merges || []).filter((merge: string) => {
      const [topLeft] = merge.split(':');
      const row = parseInt(topLeft.replace(/[A-Z]+/g, ''), 10);
      return row >= TEMPLATE_BLOCK_START;
    });
    mergesToRemove.forEach((merge: string) => ws.unMergeCells(merge));

    let r = TEMPLATE_BLOCK_START;
    for (const req of rows) {
      const target = Math.max(1, req.placements || 1);
      const blockStart = r;

      for (let e = 0; e < target; e++) {
        const es = r + e * ENTRY_ROWS;
        stampBlock(ws, template, es, TEMPLATE_BLOCK_START, ENTRY_ROWS);

        for (let k = 0; k < ENTRY_ROWS; k++) {
          ws.getRow(es + k).eachCell((cell: any) => { cell.value = undefined; });
        }

        const pcCell = ws.getCell(`B${es}`);
        pcCell.value = pc;
        pcCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } };
        pcCell.font = { color: { argb: 'FF666666' } };
        pcCell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      const tr = r + target * ENTRY_ROWS;
      stampTracker(ws, template, tr, TEMPLATE_TRACKER_ROW);
      ws.getRow(tr).eachCell((cell: any) => { cell.value = undefined; });

      const numLetter = ws.getColumn(lastCol).letter;
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

      ws.mergeCells(`A${blockStart}:A${tr}`);
      const bar = ws.getCell(`A${blockStart}`);
      bar.value = [req.calendarPeriod || 'Period TBC', req.duration || '', `${target} placement${target === 1 ? '' : 's'}`]
        .filter(Boolean)
        .join('\n');
      bar.font = { bold: true, size: 11, color: { argb: NAVY } };
      bar.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      bar.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };

      for (let rr = blockStart; rr <= tr; rr++) {
        for (let cc = 1; cc <= lastCol; cc++) {
          ws.getCell(`${ws.getColumn(cc).letter}${rr}`).border = box();
        }
      }

      r = tr + 2;
    }
  }

  wb.removeWorksheet(template.id);

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

/* ─────────────────────────────────────────────────────────────────────────────
   Response template variant: clones the AD (P&C) response template and pre-fills
   only the Period / Duration and Programme Centre columns per request.
   ───────────────────────────────────────────────────────────────────────────── */

const RESPONSE_TEMPLATE_PATH = '/DSTA_Project_Response_Template.xlsx';
const RESPONSE_TEMPLATE_SHEET_NAME = 'Undergraduate Student';
const RESPONSE_ENTRY_ROWS = 3;
const RESPONSE_TEMPLATE_BLOCK_START = 4;
const RESPONSE_TEMPLATE_TRACKER_ROW = 7;

export async function downloadResponseTemplateXlsx(
  requests: ProjectRequest[],
  fileName = 'DSTA_Project_Response_Template.xlsx',
): Promise<void> {
  try {
    const ExcelJS = (await import('exceljs')).default;

    const res = await fetch(RESPONSE_TEMPLATE_PATH);
    if (!res.ok) {
      throw new Error(`Failed to fetch template: ${res.status} ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    const template = wb.getWorksheet(RESPONSE_TEMPLATE_SHEET_NAME);
    if (!template) {
      throw new Error(`Template sheet '${RESPONSE_TEMPLATE_SHEET_NAME}' not found`);
    }
    // Free up the template sheet's name so category tabs keep their exact names;
    // the template sheet itself is removed before the file is written.
    template.name = '_Template';

    const byCat = new Map<string, ProjectRequest[]>();
    for (const r of requests) {
      const cat = (r.internCategory || r.educationLevel || 'Uncategorised') as string;
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(r);
    }

    const usedTabs = new Set<string>();
    const lastCol = template.columnCount;
    const lastLetter = template.getColumn(lastCol).letter;

    for (const [cat, rows] of Array.from(byCat.entries())) {
      const ws = wb.addWorksheet(safeTab(cat, usedTabs));
      cloneWorksheet(template, ws);

      // Update the title banner to match the intern category.
      ws.getCell('A1').value = `${cat} — Internship Project Submission`;

      // Fill the instruction row from the current request data.
      const sender = rows.find(r => r.senderName)?.senderName ?? 'Internship Office';
      const headName = rows.find(r => r.headName)?.headName ?? '';
      const deadline = rows.find(r => r.deadline)?.deadline ?? '';
      const pc = rows.find(r => r.programmeCenter)?.programmeCenter ?? rows.find(r => r.pc)?.pc ?? '';
      ws.getCell('A2').value = `Requested by ${sender}${headName ? ` · to ${headName}` : ''}${deadline ? ` · reply by ${deadline}` : ''}. Programme Centre (${pc || 'PC'}) is pre-filled. Each project uses 3 rows so you can pick up to 3 Skillset and 3 Disciplines. Add projects until each block's placements are met.`;

      // Remove all data-area merges so we can rebuild the blocks cleanly.
      const mergesToRemove = (ws.model.merges || []).filter((merge: string) => {
        const [topLeft] = merge.split(':');
        const row = parseInt(topLeft.replace(/[A-Z]+/g, ''), 10);
        return row >= 4;
      });
      mergesToRemove.forEach((merge: string) => ws.unMergeCells(merge));

      // Clear any leftover values from the sample data rows.
      for (let rr = 4; rr <= ws.rowCount; rr++) {
        for (let cc = 1; cc <= lastCol; cc++) {
          ws.getCell(`${ws.getColumn(cc).letter}${rr}`).value = undefined;
        }
      }

    let r = 4;
    for (const req of rows) {
      const target = Math.max(1, req.placements || 1);
      const blockStart = r;

      for (let e = 0; e < target; e++) {
        const es = r + e * RESPONSE_ENTRY_ROWS;
        // Stamp the template block's styles, merges and dropdown validations so
        // every entry matches the template format (not just the first one).
        stampBlock(ws, template, es, RESPONSE_TEMPLATE_BLOCK_START, RESPONSE_ENTRY_ROWS);

        // Unlock the editable cells (C–M). Column A (Period / Duration) and
        // column B (Programme Centre) stay locked once the sheet is protected.
        for (let k = 0; k < RESPONSE_ENTRY_ROWS; k++) {
          for (let cc = 3; cc <= lastCol; cc++) {
            ws.getCell(es + k, cc).protection = { locked: false };
          }
        }
      }

      const tr = r + target * RESPONSE_ENTRY_ROWS;

      // Tracker row — style and merge cloned from the template's tracker row.
      stampTracker(ws, template, tr, RESPONSE_TEMPLATE_TRACKER_ROW);
      const tc = ws.getCell(`B${tr}`);
      tc.value = { formula: `\"Placements filled: \"&SUM(${lastLetter}${blockStart}:${lastLetter}${tr - 1})&\" of ${target}\"` } as any;
      tc.font = { italic: true, size: 10, color: { argb: NAVY } };
      tc.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
      tc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TRACK } };

      // Left bar spans the whole block (entry rows + tracker).
      ws.mergeCells(`A${blockStart}:A${tr}`);
      const bar = ws.getCell(`A${blockStart}`);
      bar.value = [req.calendarPeriod || 'Period TBC', req.duration || '', `${target} placement${target === 1 ? '' : 's'}`]
        .filter(Boolean)
        .join('\n');
      bar.font = { bold: true, size: 11, color: { argb: NAVY } };
      bar.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      bar.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };

      // Programme Centre is pre-filled for each entry row block.
      const pc = req.programmeCenter || req.pc || '';
      for (let e = 0; e < target; e++) {
        const es = r + e * RESPONSE_ENTRY_ROWS;
        const pcCell = ws.getCell(`B${es}`);
        pcCell.value = pc;
        pcCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } };
        pcCell.font = { color: { argb: 'FF666666' } };
        pcCell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      // Re-apply grid borders across the block.
      for (let rr = blockStart; rr <= tr; rr++) {
        for (let cc = 1; cc <= lastCol; cc++) {
          ws.getCell(`${ws.getColumn(cc).letter}${rr}`).border = box();
        }
      }

      r = tr + 2;
    }

    // Lock the sheet: Period / Duration and Programme Centre (and all other
    // pre-filled cells) cannot be edited; only the unlocked entry cells can.
    ws.protect('', {});
  }

  wb.removeWorksheet(template.id);

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
  } catch (e) {
    throw e;
  }
}
