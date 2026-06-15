/**
 * 秒镜科技 · ERDL — Enterprise Resource Definition Language
 *
 * @file ERDL Schema Generator — 表单 Schema 生成器
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license BSL-1.1
 *
 * Copyright (c) 2026 深圳市秒镜科技有限公司
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * @description
 * 将 ERDL Entity 定义自动转为前端表单 Schema（JSON），
 * 前端根据 Schema 动态渲染表单，实现"定义 Entity → 自动生成 UI"。
 *
 * 支持的字段类型映射：
 * - Enum → el-select
 * - Money → el-input-number (精度 2)
 * - Integer → el-input-number
 * - String → el-input
 * - Boolean → el-switch
 */

import { Injectable } from '@nestjs/common'
import { ERDLRegistry, EntityRegistration } from '../core/erdl-registry'

// ============================================
// 类型定义
// ============================================

/** 表单字段类型 */
export type FormFieldType = 'text' | 'number' | 'select' | 'textarea' | 'money' | 'boolean'

/** 字段校验规则 */
export interface FieldValidation {
  /** 最小值/最小长度 */
  min?: number
  /** 最大值/最大长度 */
  max?: number
  /** 正则表达式 */
  pattern?: string
  /** 校验失败提示 */
  message?: string
}

/** 表单字段定义 */
export interface FormFieldSchema {
  /** 字段名 */
  field: string
  /** 字段标签（人类可读） */
  label: string
  /** 字段类型 */
  type: FormFieldType
  /** 是否必填 */
  required: boolean
  /** 下拉选项（仅 select 类型） */
  options?: { label: string; value: string }[]
  /** 校验规则 */
  validation?: FieldValidation
}

/** 表单 Schema（对应一个 Entity） */
export interface FormSchema {
  /** Entity 名称 */
  entity: string
  /** 命名空间 */
  namespace: string
  /** 字段列表 */
  fields: FormFieldSchema[]
}

// ============================================
// ERDL Schema Generator 核心类
// ============================================

/**
 * ERDL 表单 Schema 生成器
 *
 * 从 ERDL Entity 定义自动生成前端表单 Schema，
 * 实现"定义 Entity → 自动生成 UI"的声明式开发模式。
 *
 * @example
 * ```typescript
 * const schema = schemaGenerator.generateFormSchema(
 *   'industry.eyewear',
 *   'ProductSpu'
 * )
 * // schema.fields 包含所有字段的类型/标签/校验规则
 * ```
 */
@Injectable()
export class ERDLSchemaGenerator {
  constructor(private readonly registry: ERDLRegistry) {}

  /**
   * 为指定 Entity 生成表单 Schema
   *
   * @param namespace 命名空间
   * @param entityName Entity 名称
   * @returns 表单 Schema，Entity 不存在时返回 null
   */
  generateFormSchema(namespace: string, entityName: string): FormSchema | null {
    const entity = this.registry.getEntity(namespace, entityName)
    if (!entity) return null

    return {
      entity: entity.name,
      namespace: entity.namespace,
      fields: this.propertiesToFields(entity.properties),
    }
  }

  /**
   * 为所有已注册的 Entity 生成表单 Schema
   * @returns 表单 Schema 列表
   */
  generateAll(): FormSchema[] {
    return this.registry.getAllEntities().map((e: EntityRegistration) => ({
      entity: e.name,
      namespace: e.namespace,
      fields: this.propertiesToFields(e.properties),
    }))
  }

  // ============================================
  // 私有方法
  // ============================================

  /** 将 Entity 属性转为表单字段列表 */
  private propertiesToFields(props: Record<string, unknown>): FormFieldSchema[] {
    return Object.entries(props).map(([key, val]) => {
      const field: FormFieldSchema = {
        field: key,
        label: this.camelToLabel(key),
        type: 'text',
        required: this.isRequired(val),
      }

      const obj = typeof val === 'object' && val !== null ? (val as Record<string, unknown>) : null

      // Enum → select
      if (obj?.enum && Array.isArray(obj.enum)) {
        field.type = 'select'
        field.options = (obj.enum as string[]).map((v) => ({
          label: v,
          value: v,
        }))
      }
      // Money 类型
      else if (typeof val === 'string' && (val as string).startsWith('Money')) {
        field.type = 'money'
      }
      // 通过 type 推断
      else if (obj?.type) {
        const typeStr = (obj.type as string).toLowerCase()
        if (typeStr.includes('integer') || typeStr.includes('number')) {
          field.type = 'number'
        } else if (typeStr === 'boolean') {
          field.type = 'boolean'
        } else if (typeStr.includes('text')) {
          field.type = 'textarea'
        }
      }

      // 解析 @maxLength → validation.max
      if (obj?.maxLength && typeof obj.maxLength === 'number') {
        field.validation = { max: obj.maxLength as number }
      }

      return field
    })
  }

  /** 判断字段是否必填 */
  private isRequired(val: unknown): boolean {
    if (typeof val === 'object' && val !== null) {
      return (val as Record<string, unknown>).required === true
    }
    return false
  }

  /** 驼峰命名 → 人类可读标签 */
  private camelToLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
  }
}
