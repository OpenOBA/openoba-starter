import request from './request'

export interface StructureStandard {
  structureId: string
  externalCode: string
  internalCode: string
  shapeCode: string
  seriesCode: string
  width: number
  height: number
  circumference: number
  baseCurve: number | null
  surfaceTypes: string[]
  refractiveIndexes: number[]
  description: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export const getStructureList = (params: { page?: number; pageSize?: number; keyword?: string; shapeCode?: string; seriesCode?: string; status?: string }) =>
  request.get<any, { items: StructureStandard[]; total: number; page: number; pageSize: number }>('/structures', { params })

export const getStructureDetail = (id: string) =>
  request.get<StructureStandard>(`/structures/${id}`)

export const createStructure = (data: Record<string, unknown>) =>
  request.post<StructureStandard>('/structures', data)

export const updateStructure = (id: string, data: Record<string, unknown>) =>
  request.put<StructureStandard>(`/structures/${id}`, data)

export const deleteStructure = (id: string) =>
  request.delete(`/structures/${id}`)

export const getCompatibleFrames = (structureStandardCode: string) =>
  request.get<any[]>(`/structures/${structureStandardCode}/frames`)

export const addCompatibility = (data: { structureStandardCode: string; productSkuId: string; compatibilityLevel: string; notes?: string }) =>
  request.post('/structures/compatibilities', data)

export const deleteCompatibility = (id: string) =>
  request.delete(`/structures/compatibilities/${id}`)

// 字典查询
export const getDictShapes = () =>
  request.get<any[]>('/dict/structure_shape')

export const getDictSeries = () =>
  request.get<any[]>('/dict/structure_series')
