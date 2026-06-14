/**
 * 元镜 DTO Scanner — 扫描 .dto.ts 文件提取 class-validator 约束
 *
 * @file dto.scanner.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-26
 *
 * 提取内容：
 *  - DTO 类名 → 字段列表
 *  - 每个字段的验证装饰器（@IsString/@IsNumber/@Min/@Max/@IsEnum/@IsEmail 等）
 *  - 必填/可选标记
 *  - 关联的 Entity（通过 DTO 名称推断：CreateSpuDto → ProductSpu）
 */

import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'

export interface DtoFieldConstraint {
  fieldName: string
  isOptional: boolean
  types: string[]   // 验证装饰器: ['IsString', 'IsNumber', 'Min(0)', 'Max(99999)']
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  isEnum?: boolean
  enumMatch?: string  // 从 @IsEnum(EntityName) 提取
  isEmail?: boolean
  isUrl?: boolean
  isArray?: boolean
  matches?: string    // @Matches(/pattern/)
  defaultValue?: string
  description?: string // @ApiProperty({ description: '...' })
}

export interface DtoInfo {
  dtoName: string        // CreateSpuDto
  module: string         // product
  filePath: string       // 源码路径
  relatedEntity?: string // 推断关联的 Entity（CreateSpuDto → ProductSpu）
  fields: DtoFieldConstraint[]
  apiPropertyFields: string[]  // 有 @ApiProperty 的字段（Swagger）
}

@Injectable()
export class DtoScanner {
  private readonly logger = new Logger(DtoScanner.name)

  scan(srcDir: string): DtoInfo[] {
    const dtos: DtoInfo[] = []
    const dtoFiles = this.findDtoFiles(srcDir)

    for (const filePath of dtoFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        // 跳过 BOM
        const clean = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content
        // 按正则提取每个 export class XxxDto { ... }
        const classMatches = clean.matchAll(
          /export\s+class\s+(\w+)\s*(extends\s+\w+)?\s*\{([\s\S]*?)(?=\n\}|\nexport\s+class|\n\/\/\s*=)/g,
        )
        for (const cm of classMatches) {
          const dtoName = cm[1]
          const body = cm[3] || ''
          const dto = this.parseDtoClass(dtoName, body, filePath, srcDir)
          if (dto && dto.fields.length > 0) dtos.push(dto)
        }
      } catch (e: unknown) {
        this.logger.warn(`DTO 扫描失败: ${path.basename(filePath)} — ${(e as Error).message}`)
      }
    }

    this.logger.log(`DtoScanner: ${dtos.length} 个 DTO（${dtoFiles.length} 个文件）`)
    return dtos
  }

  private findDtoFiles(srcDir: string): string[] {
    const results: string[] = []
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const e of entries) {
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name === 'dist') continue
          walk(path.join(dir, e.name))
        } else if (e.isFile() && e.name.endsWith('.dto.ts')) {
          results.push(path.join(dir, e.name))
        }
      }
    }
    walk(srcDir)
    return results
  }

  private parseDtoClass(
    dtoName: string,
    body: string,
    filePath: string,
    srcDir: string,
  ): DtoInfo | null {
    // 推断关联 Entity
    const relatedEntity = this.inferEntity(dtoName)

    // 提取模块名
    const module = this.extractModule(filePath, srcDir)

    const fields: DtoFieldConstraint[] = []
    const apiPropertyFields: string[] = []

    // 逐行解析
    const lines = body.split('\n')
    let currentField: DtoFieldConstraint | null = null
    const decoratorBuffer: string[] = []

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue

      // 收集装饰器
      if (line.startsWith('@')) {
        decoratorBuffer.push(line)
        continue
      }

      // 字段声明
      const fieldMatch = line.match(/^(\w+)\??\s*:\s*(.+?)(?:;|\s*\/\/)/)
      if (fieldMatch) {
        const fieldName = fieldMatch[1]
        const fieldType = fieldMatch[2].trim()

        currentField = {
          fieldName,
          isOptional: fieldType.includes('| undefined') || fieldName.endsWith('?'),
          types: [],
          isArray: fieldType.includes('[]'),
        }

        // 解析收集的装饰器
        for (const dec of decoratorBuffer) {
          this.parseDecorator(dec, currentField, apiPropertyFields, fieldName)
        }

        if (currentField.types.length === 0) {
          // 从 TypeScript 类型推断
          if (fieldType.includes('string')) currentField.types.push('IsString')
          if (fieldType.includes('number')) currentField.types.push('IsNumber')
          if (fieldType.includes('boolean')) currentField.types.push('IsBoolean')
        }

        fields.push(currentField)
        decoratorBuffer.length = 0
        currentField = null
      } else if (line.includes('@') && decoratorBuffer.length > 0) {
        // 可能是多行装饰器
        decoratorBuffer.push(line)
      } else {
        // 非装饰器非字段行 → 清空缓冲
        decoratorBuffer.length = 0
      }
    }

    return { dtoName, module, filePath, relatedEntity, fields, apiPropertyFields }
  }

  private parseDecorator(
    dec: string,
    field: DtoFieldConstraint,
    apiPropertyFields: string[],
    fieldName: string,
  ): void {
    // 提取装饰器名和参数
    const decMatch = dec.match(/@(\w+)(?:\((.+)\))?$/m)
    if (!decMatch) return
    const decName = decMatch[1]
    const args = decMatch[2] || ''

    switch (decName) {
      case 'IsString': field.types.push('IsString'); break
      case 'IsNumber': field.types.push('IsNumber'); break
      case 'IsInt': field.types.push('IsInt'); break
      case 'IsBoolean': field.types.push('IsBoolean'); break
      case 'IsArray': field.isArray = true; break
      case 'IsEmail': field.isEmail = true; field.types.push('IsEmail'); break
      case 'IsUrl': field.isUrl = true; field.types.push('IsUrl'); break
      case 'IsOptional': field.isOptional = true; break
      case 'IsNotEmpty': field.isOptional = false; break
      case 'IsEnum': {
        field.isEnum = true
        field.types.push('IsEnum')
        // 提取枚举类型
        const enumMatch = args.match(/(\w+)/)
        if (enumMatch) field.enumMatch = enumMatch[1]
        break
      }
      case 'Min': {
        const m = args.match(/\(?(\d+)/)
        if (m) { field.min = Number(m[1]); field.types.push(`Min(${m[1]})`) }
        break
      }
      case 'Max': {
        const m = args.match(/\(?(\d+)/)
        if (m) { field.max = Number(m[1]); field.types.push(`Max(${m[1]})`) }
        break
      }
      case 'MinLength': {
        const m = args.match(/\(?(\d+)/)
        if (m) { field.minLength = Number(m[1]); field.types.push(`MinLength(${m[1]})`) }
        break
      }
      case 'MaxLength': {
        const m = args.match(/\(?(\d+)/)
        if (m) { field.maxLength = Number(m[1]); field.types.push(`MaxLength(${m[1]})`) }
        break
      }
      case 'Length': {
        const m = args.match(/(\d+),\s*(\d+)/)
        if (m) {
          field.minLength = Number(m[1])
          field.maxLength = Number(m[2])
          field.types.push(`Length(${m[1]},${m[2]})`)
        }
        break
      }
      case 'Matches': {
        const m = args.match(/[\/'"](.+?)[\/'"]/)
        if (m) { field.matches = m[1]; field.types.push('Matches') }
        break
      }
      case 'ApiProperty':
      case 'ApiPropertyOptional': {
        apiPropertyFields.push(fieldName)
        // 提取 description
        const desc = args.match(/description:\s*['"](.+?)['"]/)
        if (desc) field.description = desc[1]
        break
      }
      case 'Transform': break  // 忽略
      case 'Type': break        // 忽略
      case 'ValidateNested': break
      // 其他装饰器不处理
    }
  }

  /** 推断 DTO 关联的 Entity */
  private inferEntity(dtoName: string): string | undefined {
    // CreateSpuDto → ProductSpu
    // CreateOrderDto → Order
    // UpdateCustomerDto → Customer
    const patterns: Array<[RegExp, string]> = [
      [/^Create(\w+)Dto$/, '$1'],
      [/^Update(\w+)Dto$/, '$1'],
      [/^Delete(\w+)Dto$/, '$1'],
      [/^Query(\w+)Dto$/, '$1'],
      [/^(\w+)Dto$/, '$1'],
    ]
    for (const [regex, replacement] of patterns) {
      const match = dtoName.match(regex)
      if (match) {
        let entity = match[1]
        // 处理 ProductSpu → ProductSpu（不变）
        // 处理 Sku → ProductSku（需要映射）—— 保持原样让 Entity Scanner 去匹配
        return entity
      }
    }
    return undefined
  }

  private extractModule(filePath: string, srcDir: string): string {
    const rel = path.relative(srcDir, filePath)
    const parts = rel.split(path.sep)
    // modules/product/dto/product.dto.ts → product
    const modIdx = parts.indexOf('modules')
    if (modIdx >= 0 && parts.length > modIdx + 1) {
      return parts[modIdx + 1]
    }
    return parts[0] || 'unknown'
  }

  /** 按 Entity 名查找其 DTO 校验约束（供 Entity Scanner 调用） */
  findByEntity(dtos: DtoInfo[], entityName: string): DtoInfo[] {
    return dtos.filter(d => d.relatedEntity === entityName)
  }

  /** 查找某个字段在所有 DTO 中的约束 */
  findFieldConstraint(dtos: DtoInfo[], entityName: string, fieldName: string): DtoFieldConstraint | undefined {
    const related = this.findByEntity(dtos, entityName)
    for (const dto of related) {
      const f = dto.fields.find(f => f.fieldName === fieldName)
      if (f) return f
    }
    return undefined
  }
}
