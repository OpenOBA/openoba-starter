import { DeploymentService } from './deployment.service'

describe('DeploymentService', () => {
  it('should be defined', () => {
    const svc = new DeploymentService()
    expect(svc).toBeDefined()
  })
})
