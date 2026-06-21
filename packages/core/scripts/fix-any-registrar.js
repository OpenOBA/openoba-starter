const fs = require('fs');
const path = 'C:/Users/99tan/openoba/repos/openoba-starter/packages/core/src/modules/eros/task/agent-tool-registrar.ts';
let c = fs.readFileSync(path, 'utf-8');

// Replace remaining any usages in execute closures
const replacements = [
  // executeDraftCreate callback - already typed via interface, but closure passes (args as any)
  ["callbacks.executeDraftCreate(args as any)", "callbacks.executeDraftCreate(args as DraftCreateArgs)"],
  
  // executeDraftAddSku callback
  ["callbacks.executeDraftAddSku(args as { spuId: string; skus: any[] })", "callbacks.executeDraftAddSku(args as { spuId: string; skus: Array<{ colorCode: string; colorName?: string; skinToneEffect?: string; faceShapeEffect?: string; displayName?: string; retailPrice?: number }> })"],
  
  // executeAestheticsCheck callback
  ["callbacks.executeAestheticsCheck(args as any)", "callbacks.executeAestheticsCheck(args as AestheticsCheckArgs)"],
  
  // executeDraftList callback
  ["callbacks.executeDraftList(args as any)", "callbacks.executeDraftList(args as DraftListArgs)"],
  
  // executeCsvExport callback
  ["callbacks.executeCsvExport(String(args['entity'] || ''), String(args['format'] || 'csv'), args['data'] as any[], String(args['filename'] || ''))", 
   "callbacks.executeCsvExport(String(args['entity'] || ''), String(args['format'] || 'csv'), (args['data'] as DataRow[]) || [], String(args['filename'] || ''))"],
  
  // executeDataAnalyze callback
  ["callbacks.executeDataAnalyze(String(args['operation']), args['data'] as any[], String(args['field'] || ''), args['topCount'] as number, String(args['filterField'] || ''), String(args['filterValue'] || ''))",
   "callbacks.executeDataAnalyze(String(args['operation']), (args['data'] as DataRow[]) || [], String(args['field'] || ''), args['topCount'] as number, String(args['filterField'] || ''), String(args['filterValue'] || ''))"],
  
  // executeImportExecute callback
  ["callbacks.executeImportExecute(String(args['entity']), args['data'] as any[])",
   "callbacks.executeImportExecute(String(args['entity']), (args['data'] as DataRow[]) || [])"],
  
  // executeFileEdit callback
  ["callbacks.executeFileEdit(args)", "callbacks.executeFileEdit(args as FileEditArgs)"],
  
  // Draft update: (a as any) accesses
  ["const a = args as any", "const a = args as Record<string, unknown>"],
  [
    "execute: async (_n: any, args: any) => callbacks.executeFileEdit(args), agentTypes: ADMIN_TOOLS",
    "execute: async (_n: unknown, args: Record<string, unknown>) => callbacks.executeFileEdit(args as FileEditArgs), agentTypes: ADMIN_TOOLS"
  ],
  [
    "execute: async (_n: any, args: any) => callbacks.executeTscCheck(String(args['project'] || 'backend')), agentTypes: ADMIN_TOOLS",
    "execute: async (_n: unknown, args: Record<string, unknown>) => callbacks.executeTscCheck(String(args['project'] || 'backend')), agentTypes: ADMIN_TOOLS"
  ],
  [
    "execute: async (_n: any, args: any) => callbacks.executeGitDiff(String(args['mode'] || 'stat'), args['filePath'] as string), agentTypes: ADMIN_TOOLS",
    "execute: async (_n: unknown, args: Record<string, unknown>) => callbacks.executeGitDiff(String(args['mode'] || 'stat'), args['filePath'] as string), agentTypes: ADMIN_TOOLS"
  ],
];

for (const [old, neu] of replacements) {
  if (!c.includes(old)) {
    console.log('NOT FOUND:', old.substring(0, 60));
    continue;
  }
  c = c.replace(old, neu);
  console.log('REPLACED:', old.substring(0, 40));
}

fs.writeFileSync(path, c, 'utf-8');
console.log('Done');
// Count remaining any
const lines = c.split('\n');
let anyCount = 0;
for (const line of lines) {
  const t = line.trim();
  if (t.startsWith('//') || t.startsWith('*')) continue;
  if (/^\s*catch\s*\(/.test(t)) continue;
  const m = t.match(/\bany\b/g);
  if (m) anyCount += m.length;
}
console.log('Remaining any:', anyCount);
