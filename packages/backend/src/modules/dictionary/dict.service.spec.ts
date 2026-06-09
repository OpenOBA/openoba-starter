import { DictionaryService } from './dict.service'

describe('DictionaryService', () => {
  let service: DictionaryService

  beforeEach(() => {
    service = new DictionaryService()
  })

  describe('getTableName', () => {
    it('should return table name for valid key', () => {
      expect(service.getTableName('dict_customer_type')).toBe('dict_customer_type')
    })

    it('should return null for unknown key', () => {
      expect(service.getTableName('nonexistent')).toBeNull()
    })
  })

  describe('getAllTables', () => {
    it('should return all registered table keys', () => {
      const tables = service.getAllTables()
      expect(tables).toContain('dict_customer_type')
      expect(tables).toContain('dict_product_type')
      expect(tables.length).toBeGreaterThan(35)
    })
  })

  describe('getAllTableMappings', () => {
    it('should return full mappings', () => {
      const mappings = service.getAllTableMappings()
      expect(mappings['dict_customer_type']).toBe('dict_customer_type')
    })
  })
})
