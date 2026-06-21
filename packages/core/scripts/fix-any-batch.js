// Bulk fix remaining small-file any usages across CORE
const fs = require('fs');
const path = require('path');

const base = 'C:/Users/99tan/openoba/repos/openoba-starter/packages/core/src';

function walk(dir, results) {
  if (!fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir)) {
    if (item === 'node_modules' || item === 'dist' || item === 'scripts') continue;
    const p = path.join(dir, item);
    if (fs.statSync(p).isDirectory()) walk(p, results);
    else if (item.endsWith('.ts') && !item.includes('.spec.') && !item.includes('.test.')) {
      const content = fs.readFileSync(p, 'utf-8');
      const lines = content.split('\n');
      let count = 0;
      for (const l of lines) {
        const t = l.trim();
        if (t.startsWith('//') || t.startsWith('*') || /^\s*catch\s*/.test(t)) continue;
        const m = t.match(/\bany\b/g);
        if (m) count += m.length;
      }
      if (count > 0) {
        results.push({ file: p, count, content });
      }
    }
  }
}

const all = [];
walk(base, all);
all.sort((a, b) => b.count - a.count);

// Skip the 7 big files handled by sub-agent
const skipFiles = new Set([
  'soul.service.ts',
  'context-injector.generator.ts',
  'erdl-llm-bridge.ts',
  'user.service.ts',
  'chat.gateway.ts',
  'deployment.service.ts',
  'erdl-registry.ts',
]);

let fixed = 0;
for (const entry of all) {
  const basename = entry.file.split('\\').slice(-1)[0];
  if (skipFiles.has(basename)) continue;
  if (entry.count === 0) continue;

  let c = entry.content;

  // Generic replacements that are safe for small-file any usages:
  // 1. catch(e: any) — already handled by useUnknownInCatchVariables
  // 2. Promise<any> — replace with Promise<unknown>
  c = c.replaceAll('Promise<any>', 'Promise<unknown>');
  
  // 3. data: any → data: Record<string, unknown>
  c = c.replaceAll(': any =', ': Record<string, unknown> =');
  c = c.replaceAll(': any,', ': Record<string, unknown>,');
  c = c.replaceAll(': any;', ': Record<string, unknown>;');
  c = c.replaceAll(': any)', ': Record<string, unknown>)');
  
  // 4. T = any → T = Record<string, unknown>
  c = c.replaceAll('<T = any>', '<T = Record<string, unknown>>');
  
  // 5. data: any[] → Record<string, unknown>[]
  c = c.replaceAll(': any[]', ': Record<string, unknown>[]');
  
  // 6. as any → as Record<string, unknown>
  c = c.replaceAll(' as any,', ' as Record<string, unknown>,');
  c = c.replaceAll(' as any)', ' as Record<string, unknown>)');
  c = c.replaceAll(' as any;', ' as Record<string, unknown>;');
  c = c.replaceAll(' as any\n', ' as Record<string, unknown>\n');

  // 7. (e: any) => → (e: Record<string, unknown>) =>
  c = c.replaceAll('(e: any) =>', '(e: Record<string, unknown>) =>');
  
  // 8. export type Xxx = any → unknown
  c = c.replaceAll('= any;', '= unknown;');

  // Write back
  fs.writeFileSync(entry.file, c, 'utf-8');
  fixed++;
  console.log(`Fixed: ${basename} (${entry.count} any)`);
}

console.log(`\nDone. Fixed ${fixed} files.`);
