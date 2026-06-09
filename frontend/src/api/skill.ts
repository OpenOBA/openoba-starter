/**
 * SKILL 管理 API
 */
import request from '@/api/request'

export interface SkillItem {
  id: string
  skillName: string
  displayName: string
  version: string
  category: string
  author: string
  description?: string
  pricingModel: string
  pricingAmount: number
  pricingPeriod?: string
  status: string
  runCount: number
  errorCount: number
  installedAt: string
  updatedAt: string
}

export interface SkillKey {
  id: string
  skillName: string
  keyName: string
  keyLabel: string
  encryptedValue?: string
  isRequired: boolean
  isMasked: boolean
}

export function getSkills(): Promise<SkillItem[]> {
  return request.get('/skills')
}

export function refreshSkills(): Promise<{ refreshed: number }> {
  return request.post('/skills/refresh')
}

export function getSkillKeys(skillName: string): Promise<SkillKey[]> {
  return request.get(`/skills/${skillName}/keys`)
}

export function setSkillKey(skillName: string, keyName: string, value: string): Promise<{ ok: boolean }> {
  return request.put(`/skills/${skillName}/keys/${keyName}`, { value })
}
