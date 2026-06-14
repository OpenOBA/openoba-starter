/**
 * 元镜 Module Scanner — 扫描 app.module.ts 构建模块依赖图
 */

import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import type { ModuleInfo } from '../types'

@Injectable()
export class ModuleScanner {
  private readonly logger = new Logger(ModuleScanner.name)

  scan(srcDir: string): ModuleInfo[] {
    const appModulePath = path.join(srcDir, 'app.module.ts')
    if (!fs.existsSync(appModulePath)) {
      // 尝试在 src 下方的更深目录
      const content = this.findAppModule(srcDir)
      if (!content) return []
      return this.parseModuleImports(content, srcDir)
    }
    const content = fs.readFileSync(appModulePath, 'utf-8')
    return this.parseModuleImports(content, srcDir)
  }

  private findAppModule(srcDir: string): string | null {
    const walk = (dir: string): string | null => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory() && e.name !== 'node_modules' && e.name !== 'dist') {
          const r = walk(path.join(dir, e.name))
          if (r) return r
        } else if (e.name === 'app.module.ts') {
          return fs.readFileSync(path.join(dir, e.name), 'utf-8')
        }
      }
      return null
    }
    return walk(srcDir)
  }

  private parseModuleImports(content: string, srcDir: string): ModuleInfo[] {
    const modules: ModuleInfo[] = []

    // 提取 imports 数组中的模块引用
    const importRegex = /import\s*{\s*(\w+)\s*}\s*from\s*['"]([^'"]+\.module)['"]/g
    let m
    const imports: Array<{ name: string; path: string }> = []
    while ((m = importRegex.exec(content)) !== null) {
      imports.push({ name: m[1], path: m[2] })
    }

    // 同时扫描每个子目录的 module 文件
    this.scanModuleDirs(srcDir, modules)

    this.logger.log(`ModuleScanner: ${modules.length} 个模块`)
    return modules
  }

  private scanModuleDirs(srcDir: string, modules: ModuleInfo[]) {
    const modulesDir = path.join(srcDir, 'modules')
    if (!fs.existsSync(modulesDir)) return

    const walk = (dir: string, prefix: string) => {
      const moduleFiles = fs.readdirSync(dir, { withFileTypes: true })
        .filter(e => e.isFile() && e.name.endsWith('.module.ts'))

      for (const mf of moduleFiles) {
        const modName = prefix + mf.name.replace('.module.ts', '')
        const modPath = path.relative(srcDir, dir)

        // 读取 module 文件提取 imports/providers/controllers
        try {
          const content = fs.readFileSync(path.join(dir, mf.name), 'utf-8')
          const importNames = this.extractImportNames(content)
          const providerNames = this.extractProviderNames(content)
          const controllerNames = this.extractControllerNames(content)
          const entities = this.extractEntityNames(content)

          modules.push({
            name: modName,
            path: modPath,
            imports: importNames,
            providers: providerNames,
            controllers: controllerNames,
            entities,
          })
        } catch { /* skip */ }
      }

      // 进入子目录
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory() && e.name !== 'dto' && e.name !== 'entities' && e.name !== 'core') {
          walk(path.join(dir, e.name), prefix + e.name + '-')
        }
      }
    }

    walk(modulesDir, '')
  }

  private extractImportNames(content: string): string[] {
    const imports: string[] = []
    const regex = /imports\s*:\s*\[([\s\S]*?)\]/g
    let m
    while ((m = regex.exec(content)) !== null) {
      const block = m[1]
      const names = block.match(/[A-Z]\w+Module/g)
      if (names) imports.push(...names)
    }
    return [...new Set(imports)]
  }

  private extractProviderNames(content: string): string[] {
    const providers: string[] = []
    const regex = /providers\s*:\s*\[([\s\S]*?)\]/g
    let m
    while ((m = regex.exec(content)) !== null) {
      const names = m[1].match(/[A-Z]\w+/g)
      if (names) providers.push(...names.filter(n => !['TypeOrmModule', 'HttpModule', 'JwtModule', 'ConfigModule'].includes(n)))
    }
    return [...new Set(providers)]
  }

  private extractControllerNames(content: string): string[] {
    const match = content.match(/controllers\s*:\s*\[([\s\S]*?)\]/)
    if (!match) return []
    return [...new Set(match[1].match(/[A-Z]\w+/g) || [])]
  }

  private extractEntityNames(content: string): string[] {
    const match = content.match(/TypeOrmModule\.forFeature\(\[([\s\S]*?)\]\)/)
    if (!match) return []
    return [...new Set(match[1].match(/[A-Z]\w+/g) || [])]
  }
}
