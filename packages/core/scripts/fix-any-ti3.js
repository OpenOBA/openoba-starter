const fs = require('fs');
const p = 'C:/Users/99tan/openoba/repos/openoba-starter/packages/core/src/modules/eros/task/agent-tool-implementations.ts';
let c = fs.readFileSync(p, 'utf-8');

// Line 368-369: offset/limit number → string
c = c.replace(
  'return entries.map((e: fs.Dirent) => (e.isDirectory() ? \'\' : \'\') + \' \' + e.name).join(\'\\n\')',
  'return entries.map((e: fs.Dirent) => (e.isDirectory() ? \'DIR \' : \'FILE \') + e.name).join(\'\\n\')'
);

// Actually L368-369 is about String() args - need to check
// The error says "Argument of type '{}' is not assignable to parameter of type 'string'"
// Look at L365-370:
c = c.replace(
  'return parentEntries.map((e: fs.Dirent) => (e.isDirectory() ? \'?? \' : \'?? \') + e.name).join(\', \')',
  'return parentEntries.map((e: fs.Dirent) => (e.isDirectory() ? \'DIR \' : \'FILE \') + e.name).join(\', \')'
);

// L455,457,534,536: fuzzyMatchEffect -> need String() cast
c = c.replace(
  /const matchedSkin = this\.fuzzyMatchEffect\(sku\.skinToneEffect, validSkinCodes\)/g,
  'const matchedSkin = this.fuzzyMatchEffect(String(sku.skinToneEffect || \'\'), validSkinCodes)'
);
c = c.replace(
  /const matchedFace = this\.fuzzyMatchEffect\(sku\.faceShapeEffect, validFaceCodes\)/g,
  'const matchedFace = this.fuzzyMatchEffect(String(sku.faceShapeEffect || \'\'), validFaceCodes)'
);

// L475: Record<string,unknown> → UniversalDraftCreateInput
c = c.replace(
  'await this.draftPoolService.createUniversalDraft(fixed)',
  'await this.draftPoolService.createUniversalDraft(fixed as unknown as import(\'../../draft-pool/draft-pool.service\').UniversalDraftCreateInput)'
); // doesn't work with inline import, use any escape hatches
c = c.replace(
  'await this.draftPoolService.createUniversalDraft(fixed);',
  '// type-safe cast for external API\n      const draftInput = fixed as unknown as Parameters<typeof this.draftPoolService.createUniversalDraft>[0];\n      await this.draftPoolService.createUniversalDraft(draftInput);'
);

// Simpler approach for L475:
c = c.replace(
  'await this.draftPoolService.createUniversalDraft(fixed)',
  'await this.draftPoolService.createUniversalDraft(fixed as Record<string, unknown> as Parameters<typeof this.draftPoolService.createUniversalDraft>[0])'
);

// L601,605: result.errors — need double cast via unknown
c = c.replace(
  'for (const e of (result.errors as Array<{ ruleCode: string; ruleName: string; message: string }>))',
  'for (const e of (result as { errors?: Array<{ ruleCode: string; ruleName: string; message: string }> }).errors || [])'
);
c = c.replace(
  'for (const w of (result.warnings as Array<{ ruleCode: string; ruleName: string; message: string }>))',
  'for (const w of (result as { warnings?: Array<{ ruleCode: string; ruleName: string; message: string }> }).warnings || [])'
);

// L607, 609: recommendations — already fixed above but wrong property name
c = c.replace(
  /for \(const r of \(result as \{ recommendations\?: Array<\{ type: string; reason: string; suggestion: string \}> \}\)\.recommendations \|\| \[\]\) lines\.push\(` · \$\{r\.type\}: \$\{r\.reason\} → 建议: \$\{r\.suggested\}`\)\)/,
  'for (const r of (result as { recommendations?: Array<{ type: string; reason: string; suggestion: string }> }).recommendations || []) lines.push(`  · ${r.type}: ${r.reason} → 建议: ${r.suggestion}`)'
);

// L730: double cast
c = c.replace(
  /\(data\[0\] as unknown as unknown\[\]\)/g,
  '(data[0] as unknown as Record<string, unknown> as unknown as unknown[])'
);
if (c.includes('data[i] as unknown')) {
  c = c.replace(/\(data\[i\] as unknown\[\]\)/, '(data[i] as unknown as Record<string, unknown> as unknown as unknown[])');
}

// L873
c = c.replace(
  'validation.errors.slice(0, 5).map((e: Record<string, unknown>) => ',
  'validation.errors.slice(0, 5).map((e: { message?: string }) => '
);

fs.writeFileSync(p, c, 'utf-8');
console.log('Done');
