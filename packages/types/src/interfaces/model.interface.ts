// @openoba/types — 模型管理接口
// 来源：model-key.entity.ts, model-key-models.entity.ts, model-registry.entity.ts
// V1.4-b M1 Step 4

export interface IModelKey {
  id: string
  keyName: string
  provider: string
  apiKey: string
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface IModelKeyModels {
  id: string
  modelKeyId: string
  modelName: string
  isActive: boolean
  createdAt: Date
}

export interface IModelRegistry {
  id: string
  modelName: string
  provider: string
  modelType: string
  description?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
