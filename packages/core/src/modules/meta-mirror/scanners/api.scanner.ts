/**
 * 元镜 API Scanner — 扫描所有 .controller.ts 文件
 *
 * 提取：模块、Controller 名、basePath、端点列表
 */

import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import type { APIInfo, APIEndpointInfo } from '../types'

@Injectable()
export class APIScanner {
  private readonly logger = new Logger(APIScanner.name)

  scan(srcDir: string): APIInfo[] {
    const apis: APIInfo[] = []
    const controllerFiles = this.findControllerFiles(srcDir)

    for (const filePath of controllerFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const api = this.parseController(filePath, content)
        if (api) apis.push(api)
      } catch (e: unknown) {
        this.logger.warn(`扫描失败: ${path.basename(filePath)}`)
      }
    }

    this.logger.log(`APIScanner: ${apis.length} 个 Controller`)
    return apis
  }

  private findControllerFiles(srcDir: string): string[] {
    const results: string[] = []
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name === 'dist') continue
          walk(path.join(dir, e.name))
        } else if (e.isFile() && e.name.endsWith('.controller.ts')) {
          results.push(path.join(dir, e.name))
        }
      }
    }
    walk(srcDir)
    return results
  }

  private parseController(filePath: string, content: string): APIInfo | null {
    const classMatch = content.match(/export\s+class\s+(\w+)/)
    if (!classMatch) return null
    const controllerName = classMatch[1]

    // 提取 @Controller('xxx')
    const controllerMatch = content.match(/@Controller\(['"]([^'"]+)['"]\)/)
    const basePath = controllerMatch?.[1] || ''

    // 提取模块
    const module = this.extractModule(filePath)

    // 提取 @UseGuards 认证要求
    const authMatch = content.match(/@Roles\(([^)]+)\)/)
    const auth = authMatch
      ? authMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''))
      : []

    // 提取 @ApiTags
    const tagsMatch = content.match(/@ApiTags\(['"]([^'"]+)['"]\)/)
    const tags = tagsMatch ? [tagsMatch[1]] : []

    // 提取所有端点
    const endpoints = this.extractEndpoints(content, auth)

    return { module, controllerName, basePath, endpoints, tags }
  }

  private extractEndpoints(content: string, auth: string[]): APIEndpointInfo[] {
    const endpoints: APIEndpointInfo[] = []
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // @Get / @Post / @Put / @Delete / @Patch
      const methodMatch = line.match(/@(Get|Post|Put|Delete|Patch)\(/)
      if (!methodMatch) continue

      const method = methodMatch[1]

      // 提取路径参数
      const pathMatch = line.match(/@\w+\(['"]?([^'")]*)['"]?\)/)
      const routePath = pathMatch?.[1] || ''

      // 提取 @ApiOperation({ summary: '...' })（跨多行对象格式）
      let summary = ''
      for (let j = i - 5; j <= i; j++) {
        if (j < 0) continue
        // 从 j 开始收集多行文本直到闭合
        let block = lines[j]
        let k = j
        while (!block.includes('})') && k < i + 2) { k++; block += ' ' + (lines[k] || '') }
        const sumMatch = block.match(/@ApiOperation\(\s*\{\s*summary\s*:\s*['"]([^'"]+)['"]/)
        if (sumMatch) { summary = sumMatch[1]; break }
      }

      // 向前搜索方法上的 @UseGuards / @Roles（方法级覆盖类级）
      let methodAuth: string[] = []
      for (let j = i - 5; j <= i; j++) {
        if (j < 0) continue
        const rolesMatch = lines[j].match(/@Roles\(\s*([^)]+)\s*\)/)
        if (rolesMatch) {
          methodAuth = rolesMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''))
          break
        }
      }
      const effectiveAuth = methodAuth.length > 0 ? methodAuth : auth

      // 提取方法名（向下搜索签名）
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        const sigMatch = lines[j].match(/async\s+(\w+)\s*\(/)
        if (sigMatch) {
          endpoints.push({
            method: method.toUpperCase(),
            path: routePath,
            fullPath: '',  // KnowledgeWriter 会重新组装 fullPath
            summary,
            parameters: [],
            body: undefined,
            auth: effectiveAuth,
            tags: [],
          })
          break
        }
      }
    }

    return endpoints
  }

  private extractModule(filePath: string): string {
    const match = filePath.match(/modules[\/\\]([^\/\\]+)[\/\\]/)
    if (!match) return 'unknown'
    const after = filePath.substring(filePath.indexOf(match[1]) + match[1].length)
    const nextMatch = after.match(/[\/\\](?!entity|entities|dto)([^\/\\]+)[\/\\]/)
    return nextMatch ? `${match[1]}-${nextMatch[1]}` : match[1]
  }
}
