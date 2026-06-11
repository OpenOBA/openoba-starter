/**
 * Postinstall: 修复 @openoba/core 闭源包
 * 将 tgz 解压到 backend node_modules + 删除 exports 约束
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const STARTER_DIR = path.resolve(__dirname, '..');
const TGZ = path.join(STARTER_DIR, 'openoba-core-1.0.0.tgz');
const TARGET = path.join(STARTER_DIR, 'packages', 'backend', 'node_modules', '@openoba', 'core');

// Check if already fixed
if (fs.existsSync(path.join(TARGET, 'dist', 'main.js'))) {
  const pkg = JSON.parse(fs.readFileSync(path.join(TARGET, 'package.json'), 'utf-8').replace(/^\uFEFF/, ''));
  if (!pkg.exports) {
    return; // Already fixed, skip
  }
}

try {
  // Remove old copies
  try { fs.rmSync(path.join(STARTER_DIR, 'node_modules', '@openoba'), { recursive: true, force: true }); } catch (e) {}
  try { fs.rmSync(TARGET, { recursive: true, force: true }); } catch (e) {}

  // Create target dir
  fs.mkdirSync(TARGET, { recursive: true });

  // Extract tgz (strip-components on Windows is tricky, use tar)
  execSync(`tar -xzf "${TGZ}" -C "${TARGET}" --strip-components=1`, { 
    cwd: STARTER_DIR, 
    stdio: 'pipe',
    timeout: 30000 
  });

  // Remove exports constraint
  const pkgPath = path.join(TARGET, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8').replace(/^\uFEFF/, ''));
  delete pkg.exports;
  delete pkg.typesVersions;

  // Also update NestJS deps to match workspace versions (needed for runtime)
  if (pkg.dependencies) {
    // Core was built with NestJS 10, we use NestJS 11 — keep Core's own deps but allow overriding
    delete pkg.dependencies['@nestjs/common'];
    delete pkg.dependencies['@nestjs/core'];
    delete pkg.dependencies['@nestjs/platform-express'];
    delete pkg.dependencies['@nestjs/typeorm'];
    // Keep expr-eval — Core needs it
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
  console.log('[OpenOBA] Core package fixed for NestJS 11');
} catch (e) {
  console.error('[OpenOBA] Core package fix failed:', e.message);
}
