const fs = require('fs');
const p = 'C:/Users/99tan/openoba/repos/openoba-starter/packages/core/src/modules/eros/task/agent-tool-implementations.ts';
let c = fs.readFileSync(p, 'utf-8');

c = c.replace('cacheSet(key: string, data: any[]): void', 'cacheSet(key: string, data: DataRow[]): void');
c = c.replace('let rows: any[] = data', 'let rows: DataRow[] = data');
c = c.replaceAll('format as any', 'format as unknown as "csv" | "markdown" | "json"');
c = c.replace('executeImportExecute(entityName: string, data: any[]): Promise<string>', 'executeImportExecute(entityName: string, data: DataRow[]): Promise<string>');
c = c.replace('executeDraftCreate(args: { spuName: string; gender: string; shapeCode: string; seriesCode: string; structureStandardCode: string; spuDescription?: string; skus?: any[] })', 'executeDraftCreate(args: DraftCreateArgs)');

fs.writeFileSync(p, c, 'utf-8');

const lines = c.split(require('os').EOL);
let count = 0;
for (const l of lines) {
  const t = l.trim();
  if (t.startsWith('//') || t.startsWith('*')) continue;
  const m = t.match(/\bany\b/g);
  if (m) { count += m.length; console.log('  REMAINING:', t.substring(0, 100)); }
}
console.log('Remaining:', count);
