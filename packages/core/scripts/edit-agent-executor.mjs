import fs from 'fs';
import path from 'path';

const filePath = path.resolve('C:/Users/99tan/openoba/repos/openoba-starter/packages/core/src/modules/eros/task/agent-executor.service.ts');
let src = fs.readFileSync(filePath, 'utf-8');

// Edit 1: Add import after AgentToolRegistrar
const importTarget = "import { AgentToolRegistrar } from './agent-tool-registrar'";
const importIdx = src.indexOf(importTarget);
if (importIdx === -1) { console.error('FAIL Edit 1: import target not found'); process.exit(1); }
const afterImport = importIdx + importTarget.length;
const insertLine1 = "\nimport { AgentToolImplementations } from './agent-tool-implementations'";
src = src.slice(0, afterImport) + insertLine1 + src.slice(afterImport);
console.log('Edit 1: import added');

// Re-read src for subsequent edits (since we modified it)

// Edit 2: Add constructor parameter after toolRegistrar
const paramTarget = '    private readonly toolRegistrar: AgentToolRegistrar,';
const paramIdx = src.indexOf(paramTarget);
if (paramIdx === -1) { console.error('FAIL Edit 2: param target not found'); process.exit(1); }
const afterParam = paramIdx + paramTarget.length;
const insertLine2 = "\n    private readonly toolImpls: AgentToolImplementations,";
src = src.slice(0, afterParam) + insertLine2 + src.slice(afterParam);
console.log('Edit 2: constructor param added');

// Edit 3: Replace executeErpQuery body
// Find the method signature line
const erpSig = '  private async executeErpQuery(dataType: string): Promise<string> {';
const erpIdx = src.indexOf(erpSig);
if (erpIdx === -1) { console.error('FAIL Edit 3: executeErpQuery signature not found'); process.exit(1); }
// Find the opening brace (it's at the end of the signature line)
const openBraceIdx = erpIdx + erpSig.length - 1; // position of '{'
// Brace count from openBraceIdx
let braceCount = 0;
let closeIdx = -1;
for (let i = openBraceIdx; i < src.length; i++) {
  if (src[i] === '{') braceCount++;
  else if (src[i] === '}') braceCount--;
  if (braceCount === 0) { closeIdx = i; break; }
}
if (closeIdx === -1) { console.error('FAIL Edit 3: could not find closing brace'); process.exit(1); }
const newErpBody = `  private async executeErpQuery(dataType: string): Promise<string> {\n    return this.toolImpls.executeErpQuery(dataType)\n  }`;
src = src.slice(0, erpIdx) + newErpBody + src.slice(closeIdx + 1);
console.log('Edit 3: executeErpQuery body replaced');

// Edit 4: Replace executeKnowledgeQuery body
const kwSig = '  private async executeKnowledgeQuery(keyword: string): Promise<string> {';
const kwIdx = src.indexOf(kwSig);
if (kwIdx === -1) { console.error('FAIL Edit 4: executeKnowledgeQuery signature not found'); process.exit(1); }
const kwOpenIdx = kwIdx + kwSig.length - 1;
let kwBraceCount = 0;
let kwCloseIdx = -1;
for (let i = kwOpenIdx; i < src.length; i++) {
  if (src[i] === '{') kwBraceCount++;
  else if (src[i] === '}') kwBraceCount--;
  if (kwBraceCount === 0) { kwCloseIdx = i; break; }
}
if (kwCloseIdx === -1) { console.error('FAIL Edit 4: could not find closing brace'); process.exit(1); }
const newKwBody = `  private async executeKnowledgeQuery(keyword: string): Promise<string> {\n    return this.toolImpls.executeKnowledgeQuery(keyword)\n  }`;
src = src.slice(0, kwIdx) + newKwBody + src.slice(kwCloseIdx + 1);
console.log('Edit 4: executeKnowledgeQuery body replaced');

// Edit 5: Replace executeErdlCrud body
// Find signature start
const erdlSigStart = '  private async executeErdlCrud(args: {';
const erdlSigIdx = src.indexOf(erdlSigStart);
if (erdlSigIdx === -1) { console.error('FAIL Edit 5: executeErdlCrud signature not found'); process.exit(1); }
// Find the '{' that opens the method body (after the '): Promise<string> {')
// We need to find the full signature ending with '{' at class-level indentation (2 spaces)
// Search for '  }): Promise<string> {' after erdlSigIdx
const sigEndPattern = '  }): Promise<string> {';
const sigEndIdx = src.indexOf(sigEndPattern, erdlSigIdx);
if (sigEndIdx === -1) { console.error('FAIL Edit 5: executeErdlCrud signature end not found'); process.exit(1); }
const erdlOpenIdx = sigEndIdx + sigEndPattern.length - 1; // position of '{'
let erdlBraceCount = 0;
let erdlCloseIdx = -1;
for (let i = erdlOpenIdx; i < src.length; i++) {
  if (src[i] === '{') erdlBraceCount++;
  else if (src[i] === '}') erdlBraceCount--;
  if (erdlBraceCount === 0) { erdlCloseIdx = i; break; }
}
if (erdlCloseIdx === -1) { console.error('FAIL Edit 5: could not find closing brace'); process.exit(1); }
const newErdlBody = `  private async executeErdlCrud(args: {\n    action: string\n    entity: string\n    values?: Record<string, unknown>\n    where?: Record<string, unknown>\n    data?: Record<string, unknown>\n  }): Promise<string> {\n    return this.toolImpls.executeErdlCrud(args)\n  }`;
src = src.slice(0, erdlSigIdx) + newErdlBody + src.slice(erdlCloseIdx + 1);
console.log('Edit 5: executeErdlCrud body replaced');

fs.writeFileSync(filePath, src, 'utf-8');
console.log('All edits applied successfully to agent-executor.service.ts');
