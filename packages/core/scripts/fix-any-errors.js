const fs = require('fs');
const path = require('path');
const base = 'C:/Users/99tan/openoba/repos/openoba-starter/packages/core/src';

const fixes = [
  // wizard catch blocks
  ['modules/system/wizard.service.ts', 'catch (e: unknown) {\\n        this.logger.warn(\\`Wizard', 'catch (e: unknown) { const err = e as Error;\\n        this.logger.warn(\\`Wizard'],
  ['modules/system/wizard.service.ts', 'e.message || e', 'err.message || String(e)'],
  // undo the mass-replace on wizard's .message references
  // Actually simpler: replace all `e.message` in wizard with `(e as Error).message`
  
  // erdl-validator
  ['modules/erdl/core/erdl-validator.ts', '(propDef as Record<string, unknown>).type', '(propDef as { type?: string }).type || \'string\''],
  ['modules/erdl/core/erdl-validator.ts', '(propDef as Record<string, unknown>).required', '(propDef as { required?: boolean }).required'],
  ['modules/erdl/core/erdl-validator.ts', '(policy as Record<string, unknown>).source?.table', '(policy as { source?: { table?: string } }).source?.table'],
  
  // chat.gateway — need specific properties
  ['modules/eros/chat/chat.gateway.ts', 'data.runId', '(data as { runId?: string }).runId'],
  ['modules/eros/chat/chat.gateway.ts', 'data.partialContent', '(data as { partialContent?: string }).partialContent'],
  
  // skill-loader — where type
  ['modules/eros/skill/skill-loader.service.ts', 'where: Record<string, unknown> = {}', 'where: Record<string, unknown> = {}'], // keep but fix arg type
  ['modules/eros/skill/skill-loader.service.ts', 'await this.vaultRepo.update({ skillName, keyName }, { encryptedValue: encrypted } as Record<string, unknown>)', '// using template\n      await this.vaultRepo.update({ skillName, keyName }, { encryptedValue: encrypted } as any)'], // vault update uses specific type
  
  // run-registry
  ['modules/eros/stream/run-registry.ts', 'e.message', '(e as Error).message'],
  ['modules/eros/stream/run-registry.ts', 'cachedResult?: unknown', 'cachedResult?: string'],
  ['modules/eros/stream/run-registry.ts', '): unknown | null', '): string | null'],
  
  // agent-executor defaultKey
  ['modules/eros/task/agent-executor.service.ts', 'const defaultKey = dbKeys', 'const defaultKey: string = (dbKeys[0] as { key?: string })?.key || \'\''], // skip — specific fix needed
  
  // agent-stream
  ['modules/eros/task/agent-stream.controller.ts', 'e.message', '(e as Error).message'],
  
  // agent-task
  ['modules/eros/task/agent-task.service.ts', 'e.message', '(e as Error).message'],
  
  // meta-mirror
  ['modules/meta-mirror/meta-mirror.service.ts', 'as unknown as { audit: Function }', 'as { audit: (...args: unknown[]) => unknown }'],
  
  // menu
  ['modules/system/menu/menu.service.ts', 'const node: Record<string, unknown> =', 'const node: Record<string, unknown> ='], // keep, but fix return type
  // Revert menu's `as Record<string, unknown>,` to `as any,` where needed for TypeORM
  ['modules/system/menu/menu.service.ts', 'isDeleted: false } as Record<string, unknown>,', 'isDeleted: false } as any,'],
  
  // auth
  ['modules/auth/auth.controller.ts', '} as Record<string, unknown>)', '} as { userId?: string })'],
  ['modules/auth/auth.service.ts', 'userData: Record<string, unknown>', 'userData: { userId: string; username: string }'],
];

for (const [file, oldText, newText] of fixes) {
  const filePath = path.join(base, file);
  if (!fs.existsSync(filePath)) continue;
  let c = fs.readFileSync(filePath, 'utf-8');
  if (!c.includes(oldText)) { console.log('SKIP:', file, oldText.substring(0, 40)); continue; }
  c = c.replace(oldText, newText);
  fs.writeFileSync(filePath, c, 'utf-8');
  console.log('OK:', file);
}
console.log('Done');
