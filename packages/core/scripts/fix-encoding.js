// Remove garbled Chinese comment lines from files with UTF-8 corruption.
// Keeps code, English comments, JSDoc tags, and structural comments intact.
const fs = require('fs');

const files = [
  'C:/Users/99tan/openoba/repos/openoba-starter/packages/core/src/modules/erdl/llm/erdl-llm-bridge.ts',
  'C:/Users/99tan/openoba/repos/openoba-starter/packages/core/src/modules/eros/task/agent-chat.controller.ts',
];

function isGarbledLine(line) {
  // A garbled comment line is one with CJK corruption characters (� or mojibake patterns)
  const hasGarbled = /[\u0080-\u00FF]{3,}|[\u4e00-\u9fff]/.test(line);
  const isComment = /^\s*(\/\/|\*|\/\*\*)/.test(line.trimStart());
  return isComment && hasGarbled;
}

function cleanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const cleaned = [];
  let inJavadoc = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    
    // Track JSDoc blocks
    if (trimmed.startsWith('/**')) inJavadoc = true;
    if (trimmed.startsWith('*/')) { inJavadoc = false; cleaned.push(line); continue; }
    
    // Skip garbled comment lines (but keep @file/@author/@since/@license tags)
    if (isGarbledLine(line)) {
      // Keep the line if it has useful tags
      if (/@(file|author|since|license|description|param|returns|example|deprecated)/.test(line)) {
        // Still garbled but tag is useful — strip just the garbled part after the tag
        cleaned.push(line);
      }
      continue;
    }
    
    cleaned.push(line);
  }
  
  // Remove consecutive blank lines (more than 2)
  const result = [];
  let blankCount = 0;
  for (const line of cleaned) {
    if (line.trim() === '') {
      blankCount++;
      if (blankCount <= 2) result.push(line);
    } else {
      blankCount = 0;
      result.push(line);
    }
  }
  
  fs.writeFileSync(filePath, result.join('\n'), 'utf-8');
  console.log(`${filePath}: ${lines.length} → ${result.length} lines (${lines.length - result.length} garbled lines removed)`);
}

for (const f of files) cleanFile(f);
console.log('Done');
