import { Entity, Column, PrimaryColumn } from 'typeorm'

/** Key → Model 关联表 */
@Entity('sys_model_key_models')
export class ModelKeyModels {
  @PrimaryColumn({ type: 'varchar', length: 36, name: 'key_id' })
  keyId: string

  @PrimaryColumn({ type: 'varchar', length: 36, name: 'registry_id' })
  registryId: string

  @Column({ type: 'tinyint', default: 0, comment: '是否该 Key 下的默认模型', name: 'is_default' })
  isDefault: number
}
