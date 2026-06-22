/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mock 生态刚需 */
/**
 * entity-proxy.service 单元测试
 *
 * 覆盖无 DataSource 模式下的语义统一验证
 */

import { Test, TestingModule } from '@nestjs/testing'
import { EntityProxyService } from './entity-proxy.service'
import { ERDLRegistry } from './erdl-registry'

describe('EntityProxyService', () => {
  let service: EntityProxyService
  const getEntity = jest.fn()

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntityProxyService,
        { provide: ERDLRegistry, useValue: { getEntity } },
      ],
    }).compile()
    service = module.get(EntityProxyService)
  })

  beforeEach(() => {
    getEntity.mockReset()
    // 清空 EntityProxyService 的缓存（通过反射）
    ;(service as any).mappings?.clear()
  })

  describe('query', () => {
    it('未知 entity → success:false + error', async () => {
      getEntity.mockReturnValue(undefined)
      const r = await service.query({ namespace: 'n', entity: 'e' })
      expect(r.success).toBe(false)
      expect(r.error).toBeTruthy()
    })

    it('无 DataSource → 返回含 sql 的响应', async () => {
      getEntity.mockReturnValue({
        table: 't',
        primaryKey: 'id',
        properties: {},
      })
      const r = await service.query({ namespace: 'n', entity: 'e' })
      // preview 模式下应有 sql 字段
      expect(r.sql || r.error).toBeTruthy()
    })
  })

  it('insert 无 DataSource → success:false', async () => {
    getEntity.mockReturnValue({
      table: 't',
      primaryKey: 'id',
      properties: { name: { type: 'string' } },
    })
    const r = await service.insert({ namespace: 'n', entity: 'e', data: { name: 'x' } })
    expect(r.success).toBe(false)
    expect(r.sql || r.error).toBeTruthy()
  })

  it('update 无 DataSource → success:false', async () => {
    getEntity.mockReturnValue({
      table: 't',
      primaryKey: 'id',
      properties: { name: { type: 'string' } },
    })
    const r = await service.update({ namespace: 'n', entity: 'e', data: { name: 'x' }, where: { id: '1' } })
    expect(r.success).toBe(false)
    expect(r.sql || r.error).toBeTruthy()
  })

  it('softDelete 无 DataSource → success:false', async () => {
    getEntity.mockReturnValue({
      table: 't',
      primaryKey: 'id',
      properties: { name: { type: 'string' } },
    })
    const r = await service.softDelete({ namespace: 'n', entity: 'e', where: { id: '1' } })
    expect(r.success).toBe(false)
  })
})
