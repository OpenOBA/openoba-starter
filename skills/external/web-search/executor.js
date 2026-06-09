#!/usr/bin/env node
/**
 * OpenOBA web-search SKILL 执行器
 * 跨平台调用 DuckDuckGo Python 搜索脚本
 */
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

// 脚本路径：与 executor.js 同目录下的 scripts/search.py
const scriptPath = path.join(__dirname, 'scripts', 'search.py');

// 跨平台 python 命令
const pythonCmd = (() => {
  const isWindows = os.platform() === 'win32';
  // Windows: python / python3 都可能可用；Linux/Mac: python3 优先
  if (isWindows) {
    // 尝试 python（Windows 上 python 比 python3 常见）
    try { execSync('where python 2>nul || python --version 2>nul', { encoding: 'utf-8', stdio: 'pipe' }); return 'python'; } catch {}
    return 'python'; // fallback
  }
  return 'python3';
})();

function search(query, options = {}) {
  const args = [
    pythonCmd,
    scriptPath,
    '--query', query,
    '--format', 'json',
    '--max-results', String(options.max_results || 10),
  ];
  if (options.type) args.push('--type', options.type);
  if (options.time_range) args.push('--time', options.time_range);
  if (options.country) args.push('--country', options.country);
  if (options.language) args.push('--language', options.language);

  // Windows: shell: true 确保路径中的空格正确处理
  const execOpts = {
    encoding: 'utf-8',
    timeout: 30000,
    cwd: __dirname,
    shell: os.platform() === 'win32',
  };

  try {
    const result = execSync(args.join(' '), execOpts);
    return JSON.parse(result);
  } catch (e) {
    // 区分错误类型
    if (e.status === 1 || e.stderr) {
      try {
        // 尝试解析 stderr 中的 JSON 错误
        const errJson = JSON.parse(e.stderr || e.stdout || '{}');
        return { error: errJson.error || e.message, results: [] };
      } catch {
        return { error: e.stderr || e.message, results: [] };
      }
    }
    return { error: e.message, results: [] };
  }
}

module.exports = { search };
