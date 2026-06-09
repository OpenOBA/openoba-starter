import { HealthController } from './health.controller'

describe('HealthController', () => {
  let controller: HealthController

  beforeEach(() => {
    controller = new HealthController()
  })

  it('should return ok status', () => {
    const result = controller.check()
    expect(result.status).toBe('ok')
    expect(result.service).toContain('OpenOBA')
    expect(result.timestamp).toBeDefined()
  })
})
