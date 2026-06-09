/**
 * Category Entity — 独立分类模块使用的实体
 * 直接复用 Product 模块中的 ProductCategory 实体（同一张表）
 */
import { ProductCategory } from '../product/entity/product-category.entity'

export { ProductCategory }
export const Category = ProductCategory
export type Category = ProductCategory
