import request from './request'
import type { PaginatedData, DictItem } from './api-types'

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

export const getStructureList = (params: {
  page?: number
  pageSize?: number
  keyword?: string
  shapeCode?: string
  seriesCode?: string
  status?: string
}): Promise<PaginatedData<StructureStandard>> => request.get('/structures', { params })

export const getStructureDetail = (id: string): Promise<StructureStandard> => request.get(`/structures/${id}`)

export const createStructure = (data: Record<string, unknown>): Promise<StructureStandard> =>
  request.post('/structures', data)

export const updateStructure = (id: string, data: Record<string, unknown>): Promise<StructureStandard> =>
  request.put(`/structures/${id}`, data)

export const deleteStructure = (id: string): Promise<void> => request.delete(`/structures/${id}`)

export const getCompatibleFrames = (structureStandardCode: string): Promise<Record<string, unknown>[]> =>
  request.get(`/structures/${structureStandardCode}/frames`)

export const addCompatibility = (data: {
  structureStandardCode: string
  productSkuId: string
  compatibilityLevel: string
  notes?: string
}): Promise<Record<string, unknown>> => request.post('/structures/compatibilities', data)

export const deleteCompatibility = (id: string): Promise<void> => request.delete(`/structures/compatibilities/${id}`)

// 字典查询
export const getDictShapes = (): Promise<DictItem[]> => request.get('/dict/structure_shape')

export const getDictSeries = (): Promise<DictItem[]> => request.get('/dict/structure_series')
