const fs = require('fs');
const p = 'C:/Users/99tan/openoba/repos/openoba-starter/packages/core/src/modules/eros/task/agent-chat.controller.ts';
let c = fs.readFileSync(p, 'utf-8');

// A: Express types
c = c.replaceAll('(req as any)', '(req as import("express").Request)');
c = c.replaceAll('(res.req as any)', '(res.req as import("express").Request)');
c = c.replaceAll('(res as any).socket', '(res as import("express").Response).socket');

// B: catch blocks
c = c.replaceAll('} catch (e: any) {', '} catch (e: unknown) {');

// C: method signatures
c = c.replaceAll('private classifyError(e: any)', 'private classifyError(e: unknown)');
c = c.replaceAll('private getUserFriendlyMessage(errorType: string, e: any)', 'private getUserFriendlyMessage(errorType: string, e: unknown)');

// D: variable type
c = c.replaceAll('let delta: any', 'let delta: Record<string, unknown>');

// D: TypeORM queries
c = c.replaceAll("status: 'processing' as any", "status: 'processing'");
c = c.replaceAll('as any, order:', ', order:');

// D: taskService
c = c.replaceAll('(this.taskService as any).findOne', '(this.taskService as unknown as { findOne: (id: string) => Promise<unknown> }).findOne');

fs.writeFileSync(p, c, 'utf-8');
console.log('done');
