const fs = require('fs');
const p = 'C:/Users/99tan/openoba/repos/openoba-starter/packages/core/src/modules/eros/task/agent-tool-implementations.ts';
let c = fs.readFileSync(p, 'utf-8');

// Each replacement targets EXACT position, not global replaceAll

// Line 357: (e: any) → (e: fs.Dirent)
c = c.replace(/(\w+)\.map\(\(e: any\) => \(e\.isDirectory/, '$1.map((e: fs.Dirent) => (e.isDirectory');

// Line 364: (e: any) → (e: fs.Dirent)  
c = c.replace(/entries\.map\(\(e: any\) => \(e\.isDirectory/, 'entries.map((e: fs.Dirent) => (e.isDirectory');

// Line 414: catch (e: any) → catch (e: unknown)
c = c.replace(/} catch \(e: any\) \{ return '编译失败: ' \+ \(e\.stderr/, "} catch (e: unknown) { return '编译失败: ' + ((e as { stderr?: string }).stderr");

// Line 436: (e as any).stderr → (e as { stderr?: string }).stderr
c = c.replace(/\(e as any\)\.stderr/, '(e as { stderr?: string }).stderr');

// Line 444: skus?: any[] → skus?: Record<string, unknown>[]
c = c.replace(/async executeDraftCreate\(args: \{ spuName: string; gender: string; shapeCode: string; seriesCode: string; structureStandardCode: string; spuDescription\?: string; skus\?: any\[\] \}\)/, 'async executeDraftCreate(args: { spuName: string; gender: string; shapeCode: string; seriesCode: string; structureStandardCode: string; spuDescription?: string; skus?: Record<string, unknown>[] })');

// Line 453: (sku: any) → (sku: Record<string, unknown>)
c = c.replace(/const skus = \(args\.skus \|\| \[\]\)\.map\(\(sku: any\) => \{/, 'const skus = (args.skus || []).map((sku: Record<string, unknown>) => {');

// Line 454: fixed: any → fixed: Record<string, unknown>
c = c.replace(/const fixed: any = \{ \.\.\.sku \}/, 'const fixed: Record<string, unknown> = { ...sku }');

// Line 488: } as any) → } as Record<string, unknown>)
c = c.replace(/  \} as any\)\n\s+universalDraftId = /, '  } as Record<string, unknown>)\n      universalDraftId = ');

// Line 489: (universalDraft as any) → (universalDraft as { id?: string })
c = c.replace(/\(universalDraft as any\)\?\.id/, '(universalDraft as { id?: string })?.id');

// Line 516: skus: any[] → skus: Record<string, unknown>[]
c = c.replace(/async executeDraftAddSku\(args: \{ spuId: string; skus: any\[\] \}\)/, 'async executeDraftAddSku(args: { spuId: string; skus: Record<string, unknown>[] })');

// Line 520: (d: any) → (d: { spuId?: string; draftId?: string })
c = c.replace(/items\.find\(\(d: any\) => d\.spuId/, "items.find((d: { spuId?: string; draftId?: string }) => d.spuId");

// Line 532: (sku: any) → (sku: Record<string, unknown>)
c = c.replace(/const skus = \(args\.skus \|\| \[\]\)\.map\(\(sku: any\) => \{/, 'const skus = (args.skus || []).map((sku: Record<string, unknown>) => {');

// Line 533: fixed: any → fixed: Record<string, unknown>  
c = c.replace(/const fixed: any = \{ \.\.\.sku \}/, 'const fixed: Record<string, unknown> = { ...sku }');

// Lines 601, 605: (result.errors as any[]) → (result.errors as Array<{ ruleCode: string; ruleName: string; message: string }>)
c = c.replace(/for \(const e of \(result\.errors as any\[\]\)\)/, 'for (const e of (result.errors as Array<{ ruleCode: string; ruleName: string; message: string }>))');
c = c.replace(/for \(const w of \(result\.warnings as any\[\]\)\)/, 'for (const w of (result.warnings as Array<{ ruleCode: string; ruleName: string; message: string }>))');

// Lines 607, 609: (result as any).recommendations
c = c.replace(/if \(\(result as any\)\.recommendations\?\.length > 0\)/, "if ((result as { recommendations?: Array<{ type: string; reason: string; suggestion: string }> }).recommendations?.length > 0)");
c = c.replace(/for \(const r of \(result as any\)\.recommendations\)/, "for (const r of (result as { recommendations?: Array<{ type: string; reason: string; suggestion: string }> }).recommendations || [])");

// Line 651: data: any[] → data: Record<string, unknown>[]
c = c.replace(/async executeCsvExport\(entity: string, format: string, data: any\[\], filename: string\): Promise<string>/, 'async executeCsvExport(entity: string, format: string, data: Record<string, unknown>[], filename: string): Promise<string>');

// Line 653: rows: any[] → rows: Record<string, unknown>[]
c = c.replace(/let rows: any\[\] = data/, 'let rows: Record<string, unknown>[] = data');

// Line 687: data: any[] → data: Record<string, unknown>[]
c = c.replace(/doExport\(data: any\[\], format: string, filename: string\): string/, 'doExport(data: Record<string, unknown>[], format: string, filename: string): string');

// Line 698: format as any
c = c.replace(/format as any\)/, 'format as "csv" | "markdown" | "json")');

// Lines 715, 719: (c: any), (v: any)
c = c.replace(/\.map\(\(c: any\) => \{/, '.map((c: unknown) => {');
c = c.replace(/\.map\(\(v: any\) => \{/, '.map((v: unknown) => {');

// Lines 729, 730: (data[0] as any[]) etc
c = c.replace(/\(data\[0\] as any\[\]\)\.map/, '(data[0] as unknown[]).map');
c = c.replace(/\(data\[i\] as any\[\]\)\.map/, '(data[i] as unknown[]).map');

// Line 743: data: any[]
c = c.replace(/executeDataAnalyze\(op: string, data: any\[\], field: string, topN\?: number, fField\?: string, fVal\?: string\): string/, 'executeDataAnalyze(op: string, data: Record<string, unknown>[], field: string, topN?: number, fField?: string, fVal?: string): string');

// Line 856: data: any[]
c = c.replace(/async executeImportExecute\(entityName: string, data: any\[\]\): Promise<string>/, 'async executeImportExecute(entityName: string, data: Record<string, unknown>[]): Promise<string>');

// Line 873: .map((e: any) → .map((e: Record<string, unknown>)
c = c.replace(/\.map\(\(e: any\) => /, '.map((e: Record<string, unknown>) => ');

fs.writeFileSync(p, c, 'utf-8');

// Count remaining
const lines = c.split('\n');
let count = 0;
for (const l of lines) {
  const t = l.trim();
  if (t.startsWith('//') || t.startsWith('*')) continue;
  if (/^\s*catch\s*\(/.test(t)) continue;
  const m = t.match(/\bany\b/g);
  if (m) { count += m.length; console.log('  REMAINING L'+(lines.indexOf(l)+1)+':', t.substring(0, 90)); }
}
console.log('Remaining any:', count);
