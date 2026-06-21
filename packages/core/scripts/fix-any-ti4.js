const fs = require('fs');
const p = 'C:/Users/99tan/openoba/repos/openoba-starter/packages/core/src/modules/eros/task/agent-tool-implementations.ts';
let c = fs.readFileSync(p, 'utf-8');

// L368-369: parseInt with unknown arg
c = c.replace("parseInt(args['limit'] || '5000')", "parseInt(String(args['limit'] || '5000'))");
c = c.replace("parseInt(args['offset'] || '0')", "parseInt(String(args['offset'] || '0'))");

// L601, 605: AestheticsCheckResult.errors is string[], not object[]
c = c.replace(
  'for (const e of ((result as unknown as { errors?: Array<{ ruleCode: string; ruleName: string; message: string }> }).errors || []))',
  'for (const e of (result.errors || []))'
);
c = c.replace(
  'for (const w of ((result as unknown as { warnings?: Array<{ ruleCode: string; ruleName: string; message: string }> }).warnings || []))',
  'for (const w of (result.warnings || []))'
);

// Restore original aesthetic template strings
c = c.replace(
  'lines.push(`  · [${e.ruleCode}] ${e.ruleName}: ${e.message}`)',
  'lines.push(`  · [${e}]`)'
);
c = c.replace(
  'lines.push(`  · [${w.ruleCode}] ${w.ruleName}: ${w.message}`)',
  'lines.push(`  · [${w}]`)'
);

// L607, 609: recommendations
c = c.replace(
  "for (const r of (result as { recommendations?: Array<{ type: string; reason: string; suggestion: string }> }).recommendations || []) lines.push(`  · ${r.type}: ${r.reason} → 建议: ${(r as { type: string; reason: string; suggestion: string }).suggestion}`)",
  'for (const r of (result as { recommendations?: Array<{ type: string; reason: string; suggestion: string }> }).recommendations || []) { lines.push(`  · ${r.type}: ${r.reason} → 建议: ${r.suggestion}`) }'
);

// L475 universalDraft
c = c.replace(
  'await this.draftPoolService.createUniversalDraft(fixed as Record<string, unknown> as Parameters<typeof this.draftPoolService.createUniversalDraft>[0])',
  'await this.draftPoolService.createUniversalDraft(fixed as Parameters<typeof this.draftPoolService.createUniversalDraft>[0])'
);

// L873 validation errors
c = c.replace(
  "(e: { message?: string; errors?: Array<{ row: number; message: string }> })",
  "(e: { message?: string })"
);

fs.writeFileSync(p, c, 'utf-8');
console.log('Done');
