/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mock 生态刚需 */
import { EntitySyncService } from './entity-sync.service'

describe('EntitySyncService', () => {
  it('should be defined', () => {
    const svc = new EntitySyncService({ query: jest.fn() } as any)
    expect(svc).toBeDefined()
  })
})
