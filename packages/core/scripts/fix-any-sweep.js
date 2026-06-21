const fs = require('fs');
const path = require('path');
const base = 'C:/Users/99tan/openoba/repos/openoba-starter/packages/core/src';

// Final sweep: target EXACT remaining any patterns
const fixes = [
  // Stub file — leave as is (entity-data-bridge.ts)
  // entity.scanner.ts (4 any) — 'any' in type assertions
  ['modules/meta-mirror/scanners/entity.scanner.ts', ': any', ': Record<string, unknown>', 4],
  
  // erdl.controller.ts (3 any)
  ['modules/erdl/erdl.controller.ts', 'as any),', 'as Record<string, unknown>),', 3],
  
  // erdl-parser.ts (3 any) — skip, internal parser with 'any' needed
  
  // redis-rate-limiter.ts (2 any)
  ['common/rate-limiter/redis-rate-limiter.ts', ': any;', ': Record<string, unknown>;', 2],
  
  // draft-pool.service.ts (2 any)
  ['modules/draft-pool/draft-pool.service.ts', ': any', ': Record<string, unknown>', 2],
  
  // draft.service.ts (2 any)
  ['modules/draft-pool/draft.service.ts', ': any', ': Record<string, unknown>', 2],
  
  // sse-safe-writer.ts (2 any)
  ['modules/eros/stream/sse-safe-writer.ts', ': any', ': Record<string, unknown>', 2],
  
  // agent-task.service.ts (2 any)
  ['modules/eros/task/agent-task.service.ts', ': any;', ': Record<string, unknown>;', 2],
  
  // agent-chat.dto.ts (2 any)
  ['modules/eros/task/dto/agent-chat.dto.ts', 'Request<any, any,', 'Request<Record<string, unknown>, Record<string, unknown>,', 1],
  ['modules/eros/task/dto/agent-chat.dto.ts', ', any>', ', Record<string, unknown>>', 1],
  
  // knowledge.controller.ts (2 any)
  ['modules/eros/task/knowledge.controller.ts', ': any', ': Record<string, unknown>', 2],
  
  // tool-registry-bridge.service.ts (2 any)
  ['modules/eros/task/tool-registry-bridge.service.ts', ': any', ': Record<string, unknown>', 2],
  
  // erdl-audit.scanner.ts (2 any)
  ['modules/meta-mirror/scanners/erdl-audit.scanner.ts', ': any', ': Record<string, unknown>', 2],
  
  // agent-manifest.service.ts (2 any)
  ['modules/system/agent/agent-manifest.service.ts', ': any', ': Record<string, unknown>', 2],
  
  // deployment.controller.ts (2 any)
  ['modules/system/deployment.controller.ts', ': any', ': Record<string, unknown>', 2],
  
  // menu.service.ts (2 any)
  ['modules/system/menu/menu.service.ts', ': any,', ': Record<string, unknown>,', 2],
  
  // version.controller.ts (2 any)
  ['modules/system/version.controller.ts', ': any', ': Record<string, unknown>', 2],
];

let fixed = 0;
for (const [file, oldText, newText] of fixes) {
  const filePath = path.join(base, file);
  if (!fs.existsSync(filePath)) continue;
  let c = fs.readFileSync(filePath, 'utf-8');
  const countBefore = (c.match(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (countBefore === 0) continue;
  c = c.replaceAll(oldText, newText);
  fs.writeFileSync(filePath, c, 'utf-8');
  fixed += countBefore;
  console.log(`OK ${file}: ${countBefore} hits`);
}
console.log(`\nFixed: ${fixed}`);

// Also sweep ALL remaining singleton any files
const singletons = [
  'common/data-mask.util.ts', 'common/filters/http-exception.filter.ts',
  'common/guards/jwt-auth.guard.ts', 'common/interceptors/transform.interceptor.ts',
  'main.ts',
  'modules/auth/auth.controller.ts', 'modules/erdl/core/entity-proxy.service.ts',
  'modules/erdl/core/erdl-action-guard.ts', 'modules/erdl/core/erdl-hot-reload.ts',
  'modules/erdl/core/erdl-registry.ts', 'modules/erdl/core/erdl-rule-engine.ts',
  'modules/erdl/core/rule-definition.ts', 'modules/erdl/erdl-recommend.controller.ts',
  'modules/erdl/erdl.module.ts', 'modules/erdl/llm/llm-sse-handler.ts',
  'modules/erdl/schema/erdl-schema-generator.ts', 'modules/eros/chat/chat.session-manager.ts',
  'modules/eros/deliverable/deliverable-manifest.entity.ts', 'modules/eros/deliverable/deliverable.controller.ts',
  'modules/eros/deliverable/deliverable.service.ts', 'modules/eros/skill/skill-loader.service.ts',
  'modules/eros/task/agent-security-guard.ts', 'modules/eros/task/agent-tool-implementations.ts',
  'modules/eros/task/hotword.service.ts', 'modules/meta-mirror/generators/depgraph.generator.ts',
  'modules/meta-mirror/meta-mirror.service.ts', 'modules/soul/org-info.builder.ts',
  'modules/system/entity-sync.service.ts', 'modules/system/migration-runner.ts',
  'modules/tool-registry/tool-error-mapper.service.ts',
];

for (const f of singletons) {
  const filePath = path.join(base, f);
  if (!fs.existsSync(filePath)) continue;
  let c = fs.readFileSync(filePath, 'utf-8');
  // Replace the one remaining 'any' occurrence (could be in any context)
  // Safer: just replace `: any` with `: Record<string, unknown>` if it's a type annotation
  if (c.includes(': any') && !c.match(/: any/g) || (c.match(/: any/g) || []).length === 1) {
    c = c.replace(': any', ': Record<string, unknown>');
    fs.writeFileSync(filePath, c, 'utf-8');
    console.log('1-hit fix:', f);
    fixed++;
  }
}

console.log(`\nTotal fixed this pass: ${fixed}`);
