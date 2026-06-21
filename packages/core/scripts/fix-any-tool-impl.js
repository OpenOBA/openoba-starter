const fs = require('fs');
const p = 'C:/Users/99tan/openoba/repos/openoba-starter/packages/core/src/modules/eros/task/agent-tool-implementations.ts';
let c = fs.readFileSync(p, 'utf-8');

const reps = [
  // queryCache types
  [/data: any\[\]/g, 'data: DataRow[]'],
  [/data: DataRow\[\]; timestamp: number/g, 'data: DataRow[]; timestamp: number'],
  [/data: DataRow\[\]): void/g, 'data: DataRow[]): void'],
  [/cacheGet\(key: string\): any\[\] \| null/g, 'cacheGet(key: string): DataRow[] | null'],

  // as any casts
  [/\(e as any\)\.content/g, '(e as { content?: string }).content'],
  [/\(args as any\)\.select/g, '(args as Record<string, unknown>).select'],
  [/\(this\.proxy as any\)\.getMapping/g, '(this.proxy as { getMapping?: (ns: string, entity: string) => { table: string } | undefined }).getMapping'],
  [/items\.find\(\(d: any\) => d\.docNo/g, 'items.find((d: Record<string, unknown>) => d.docNo'],
  [/\(args as any\)\.limit/g, '(args as Record<string, unknown>).limit'],
  [/\(args as any\)\.offset/g, '(args as Record<string, unknown>).offset'],
  [/\} as any\)/g, '} as Record<string, unknown>)'],
  
  // file edit
  [/executeFileEdit\(args: Record<string, any>\): string/g, 'executeFileEdit(args: FileEditArgs): string'],
  
  // dir entries
  [/parentEntries\.map\(\(e: any\)/g, 'parentEntries.map((e: fs.Dirent)'],
  [/entries\.map\(\(e: any\)/g, 'entries.map((e: fs.Dirent)'],
  
  // catch blocks
  [/} catch \(e: any\) \{ return .*?tsc.*?substring/g, (m) => m.replace('e: any', 'e: unknown').replace('(e.stderr', '((e as { stderr?: string }).stderr'),
  [/\(e as any\)\.stderr/g, '(e as { stderr?: string }).stderr'],

  // draft create  
  [/skus: any\[\]/g, 'skus: Array<{ colorCode: string; colorName?: string; skinToneEffect?: string; faceShapeEffect?: string; displayName?: string; retailPrice?: number }>'],
  [/\(sku: any\) => \{/g, '(sku: Record<string, unknown>) => {'],
  [/const fixed: any = /g, 'const fixed: Record<string, unknown> = '],

  // universalDraft
  [/\(universalDraft as any\)\?\.id/g, '(universalDraft as { id?: string })?.id'],

  // draft add sku  
  [/items\.find\(\(d: any\) => d\.spuId/g, 'items.find((d: Record<string, unknown>) => d.spuId'],
  
  // aesthetics
  [/result\.errors as any\[\]/g, 'result.errors as Array<{ ruleCode: string; ruleName: string; message: string }>'],
  [/result\.warnings as any\[\]/g, 'result.warnings as Array<{ ruleCode: string; ruleName: string; message: string }>'],
  [/\(result as any\)\.recommendations/g, '(result as { recommendations?: Array<{ type: string; reason: string; suggestion: string }> }).recommendations'],
  [/for \(const r of \(result as any\)\.recommendations\)/g, 'for (const r of (result as { recommendations?: Array<{ type: string; reason: string; suggestion: string }> }).recommendations || [])'],

  // csv export
  [/async executeCsvExport\(entity: string, format: string, data: any\[\], filename: string\): Promise<string>/g, 'async executeCsvExport(entity: string, format: string, data: DataRow[], filename: string): Promise<string>'],
  [/let rows: any\[\] = data/g, 'let rows: DataRow[] = data'],
  [/doExport\(data: any\[\], format: string/g, 'doExport(data: DataRow[], format: string'],
  [/format as any\)/g, 'format as "csv" | "markdown" | "json")'],
  
  // row access in csv
  [/row\.map\(\(c: any\) => /g, 'row.map((c: unknown) => '],
  [/Object\.values\(row \|\| \{\}\)\.map\(\(v: any\) => /g, 'Object.values(row || {}).map((v: unknown) => '],
  [/\(data\[0\] as any\[\]\)\.map/g, '(data[0] as unknown[]).map'],
  [/\(data\[i\] as any\[\]\)\.map/g, '(data[i] as unknown[]).map'],

  // data analyze
  [/executeDataAnalyze\(op: string, data: any\[\], field: string/g, 'executeDataAnalyze(op: string, data: DataRow[], field: string'],

  // import execute
  [/async executeImportExecute\(entityName: string, data: any\[\]\): Promise<string>/g, 'async executeImportExecute(entityName: string, data: DataRow[]): Promise<string>'],
  [/\.map\(\(e: any\)/g, '.map((e: Record<string, unknown>)'],
];

for (const [pat, rep] of reps) {
  c = c.replace(pat, rep);
}

// Fix remaining catch with any (shouldn't happen with useUnknownInCatchVariables)
c = c.replace(/} catch \(e: any\) \{/g, '} catch (e: unknown) {');

// Add import for FileEditArgs
if (!c.includes("import type { FileEditArgs")) {
  c = c.replace(
    "import { InjectRepository } from '@nestjs/typeorm'",
    "import { InjectRepository } from '@nestjs/typeorm'\nimport type { FileEditArgs, DataRow } from './agent-tool-registrar'"
  );
}

fs.writeFileSync(p, c, 'utf-8');

// Count remaining
const lines = c.split('\n');
let count = 0;
for (const l of lines) {
  const t = l.trim();
  if (t.startsWith('//') || t.startsWith('*') || /^\s*catch\s*/.test(t)) continue;
  const m = t.match(/\bany\b/g);
  if (m) { count += m.length; console.log('  REMAINING:', t.substring(0, 100)); }
}
console.log('Remaining any:', count);
