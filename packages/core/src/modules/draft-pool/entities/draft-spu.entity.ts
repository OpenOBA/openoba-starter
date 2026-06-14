/**
 * DraftSpu Entity — Engine Stub
 *
 * 引擎层最小 entity 定义，供 TypeORM forFeature 注册。
 * 行业模块可覆盖完整的 entity。
 */

export class DraftSpu {
  draftId: string
  spuName: string
  gender: string
  shapeCode: string
  seriesCode: string
  structureStandardCode: string
  spuDescription: string
  source: string
  status: string
  createdAt: Date
}
