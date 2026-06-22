/* eslint-disable @typescript-eslint/no-explicit-any -- CORE 泛型约束/第三方库类型缺口，需架构级重构 */
export class EntityDataBridge {
  constructor(entityName: string, namespace: string, registry?: any) {}
  export(data: Record<string, unknown>[], format: string) { return '' }
  mapColumns(columns: string[]) { return {} }
  normalize(data: any[], mapping: any) { return { entities: [], warnings: [] } }
  validate(entities: any[]) { return { valid: [], errors: [] } }
}
