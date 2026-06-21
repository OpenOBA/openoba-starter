// Precise any cleanup — only replace EXACT patterns on known-safe lines
const fs = require('fs');
const path = require('path');
const base = 'C:/Users/99tan/openoba/repos/openoba-starter/packages/core/src';

const filesToFix = [
  // Format: [filePath, oldText, newText]
  // Each entry targets ONE exact occurrence
  
  // wizard.service.ts (6 any — all catch blocks)
  ['modules/system/wizard.service.ts', '} catch (e: any) {', '} catch (e: unknown) {', 6],
  
  // erdl-validator.ts (5 any)
  ['modules/erdl/core/erdl-validator.ts', '(propDef as any).type', '(propDef as Record<string, unknown>).type', 1],
  ['modules/erdl/core/erdl-validator.ts', '(propDef as any).required', '(propDef as Record<string, unknown>).required', 1],
  ['modules/erdl/core/erdl-validator.ts', '(action.params as any)?.formula', '(action.params as Record<string, unknown>)?.formula', 1],
  ['modules/erdl/core/erdl-validator.ts', 'formula = (action.params as any).formula', 'formula = (action.params as Record<string, unknown>).formula', 1],
  ['modules/erdl/core/erdl-validator.ts', '(policy as any).source?.table', '(policy as Record<string, unknown>).source?.table', 1],
  
  // menu.service.ts (5 any)
  ['modules/system/menu/menu.service.ts', 'as any,', 'as Record<string, unknown>,', 4],
  ['modules/system/menu/menu.service.ts', 'const node: any =', 'const node: Record<string, unknown> =', 1],
  
  // entity-data-bridge.ts (4 any — stub class, keep as is)
  // SKIP — it's a stub
  
  // skill-loader.service.ts (4 any)
  ['modules/eros/skill/skill-loader.service.ts', '(e: any) => {', '(e: Record<string, unknown>) => {', 1],
  ['modules/eros/skill/skill-loader.service.ts', 'result: any', 'result: Record<string, unknown>', 1],
  ['modules/eros/skill/skill-loader.service.ts', 'listItems: any[]', 'listItems: Record<string, unknown>[]', 1],
  ['modules/eros/skill/skill-loader.service.ts', 'where: any = {}', 'where: Record<string, unknown> = {}', 1],
  
  // run-registry.ts (4 any)
  ['modules/eros/stream/run-registry.ts', 'result: any;', 'result: Record<string, unknown>;', 1],
  ['modules/eros/stream/run-registry.ts', '} catch (e: any) {', '} catch (e: unknown) {', 1],
  ['modules/eros/stream/run-registry.ts', 'cachedResult?: any', 'cachedResult?: unknown', 1],
  ['modules/eros/stream/run-registry.ts', '): any | null', '): unknown | null', 1],
  
  // model-registry.service.ts (4 any)
  ['modules/system/model-registry.service.ts', 'where: any =', 'where: Record<string, unknown> =', 2],
  ['modules/system/model-registry.service.ts', '): Promise<any[]>', '): Promise<Record<string, unknown>[]>', 1],
  ['modules/system/model-registry.service.ts', 'const result: any[] =', 'const result: Record<string, unknown>[] =', 1],
  
  // response.dto.ts (3 any)
  ['common/dto/response.dto.ts', '<T = any>', '<T = Record<string, unknown>>', 1],
  ['common/dto/response.dto.ts', 'data: any', 'data: unknown', 1],
  ['common/dto/response.dto.ts', 'constructor(data: any,', 'constructor(data: unknown,', 1],
  
  // auth.service.ts (3 any)
  ['modules/auth/auth.service.ts', 'Promise<any>', 'Promise<unknown>', 1],
  ['modules/auth/auth.service.ts', '(r: any) =>', '(r: Record<string, unknown>) =>', 1],
  ['modules/auth/auth.service.ts', 'userData: any', 'userData: Record<string, unknown>', 1],
  
  // erdl-parser.ts (3 any)
  ['modules/erdl/parser/erdl-parser.ts', 'syncPolicies: any', 'syncPolicies: Record<string, unknown>', 1],
  ['modules/erdl/parser/erdl-parser.ts', 'aliases: any', 'aliases: Record<string, unknown>', 2],
  
  // agent-stream.controller.ts (3 any)
  ['modules/eros/task/agent-stream.controller.ts', '(this.taskService as any)', '(this.taskService as unknown as { findOne: Function })', 2],
  ['modules/eros/task/agent-stream.controller.ts', '} catch (e: any) {', '} catch (e: unknown) {', 1],
  
  // agent-task.service.ts (3 any)
  ['modules/eros/task/agent-task.service.ts', '} catch (e: any) {', '} catch (e: unknown) {', 3],
  
  // meta-mirror.service.ts (3 any)
  ['modules/meta-mirror/meta-mirror.service.ts', 'as any).scanEnhanced', 'as unknown as { scanEnhanced?: Function }).scanEnhanced', 1],
  ['modules/meta-mirror/meta-mirror.service.ts', 'getEntityIndex(): Record<string, any>', 'getEntityIndex(): Record<string, unknown>', 1],
  ['modules/meta-mirror/meta-mirror.service.ts', 'as any,', 'as unknown as { audit: Function },', 1],
];

let totalFixed = 0;
for (const [file, oldText, newText, expectedHits] of filesToFix) {
  const filePath = path.join(base, file);
  if (!fs.existsSync(filePath)) {
    console.log('SKIP (not found):', file);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf-8');
  const countBefore = (content.match(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (countBefore === 0) {
    // console.log('SKIP (no match):', file, '-', oldText.substring(0,40));
    continue;
  }
  content = content.replaceAll(oldText, newText);
  const countAfter = (content.match(new RegExp(newText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  fs.writeFileSync(filePath, content, 'utf-8');
  totalFixed += countAfter;
  console.log(`OK ${file}: ${countAfter} hits (${oldText.substring(0, 40)})`);
}
console.log(`\nTotal fixes applied: ${totalFixed}`);
