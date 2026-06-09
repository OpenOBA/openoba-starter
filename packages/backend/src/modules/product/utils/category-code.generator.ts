import { Repository } from 'typeorm'
import { ProductCategory } from '../entity/product-category.entity'

/**
 * 自动生成品类编码
 * 格式：CAT_{4位序号}
 * 例如：CAT_0001, CAT_0002
 */
export async function generateCategoryCode(catRepo: Repository<ProductCategory>): Promise<string> {
  const [result] = await catRepo.query(
    `SELECT MAX(CAST(REGEXP_REPLACE(category_code, '^CAT_', '') AS UNSIGNED)) AS max_seq FROM product_category WHERE category_code REGEXP '^CAT_[0-9]+$'`,
  )

  const nextSeq = (result?.max_seq || 0) + 1
  const seqStr = String(nextSeq).padStart(4, '0')
  return `CAT_${seqStr}`
}

/**
 * 编码格式校验：CAT_XXXX (4位数字)
 */
export function validateCategoryCode(code: string): boolean {
  return /^CAT_\d{4}$/.test(code)
}
