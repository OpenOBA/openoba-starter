/**
 * EntityDataBridge — 实体数据桥接器
 *
 * @deprecated 占位类：所有方法为空实现，待补充真实实现后移除 deprecated 标记。
 *             当前仅用于类型兼容。
 * @author 唐浩然
 */

export interface IEntityDataRegistry {
  [key: string]: unknown
}

export class EntityDataBridge {
  constructor(entityName: string, namespace: string, registry?: IEntityDataRegistry) {}

  export(data: Array<Record<string, unknown>>, format: string): string {
    return ''
  }

  mapColumns(columns: string[]): Record<string, unknown> {
    return {}
  }

  normalize(data: Array<Record<string, unknown>>, mapping: Record<string, unknown>): {
    entities: Array<Record<string, unknown>>
    warnings: string[]
  } {
    return { entities: [], warnings: [] }
  }

  validate(entities: Array<Record<string, unknown>>): {
    valid: Array<Record<string, unknown>>
    errors: string[]
  } {
    return { valid: [], errors: [] }
  }
}
