/**
 * ER-OS System Module Registry — 系统模块注册表 Entity
 * 
 * AI-BOS Phase 0 桩，后续 MCPCapable 的基础。
 * 记录系统中所有模块的注册信息。
 */

import { Entity, Column, PrimaryColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export type ModuleType = 'engine' | 'agent' | 'api' | 'knowledge' | 'skill' | 'platform' | 'business'
export type ModuleStatus = 'registered' | 'active' | 'inactive' | 'error'

@Entity('system_module_registry')
export class SystemModuleRegistry {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id!: string

  @Column({ comment: 'module 名称',  name: 'module_name', type: 'varchar', length: 100, unique: true })
  moduleName!: string

  @Index()
  @Column({ comment: 'module 类型',  name: 'module_type', type: 'varchar', length: 50 })
  moduleType!: ModuleType

  @Column({ comment: '版本号',  name: 'version', type: 'varchar', length: 20, default: '0.0.0' })
  version!: string

  @Index()
  @Column({ comment: '状态',  name: 'status', type: 'enum', enum: ['registered', 'active', 'inactive', 'error'], default: 'registered' })
  status!: ModuleStatus

  @Column({ comment: '依赖JSON',  name: 'dependencies', type: 'json', nullable: true })
  dependencies!: string[] | null

  @Column({ comment: '元数据JSON',  name: 'metadata', type: 'json', nullable: true })
  metadata!: Record<string, unknown> | null

  @CreateDateColumn({ name: 'registered_at' })
  registeredAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
