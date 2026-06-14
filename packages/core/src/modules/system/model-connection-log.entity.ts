import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm'

/** 模型连接测试日志 */
@Entity('sys_model_connection_log')
@Index(['modelRegistryId'])
@Index(['testedAt'])
export class ModelConnectionLog {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string

  @Column({ type: 'varchar', length: 36 })
  modelRegistryId: string

  @Column({ type: 'enum', enum: ['ok', 'timeout', 'auth_error', 'network_error', 'unknown'] })
  status: string

  @Column({ type: 'int', nullable: true })
  latencyMs: number

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage: string

  @CreateDateColumn({ type: 'datetime' })
  testedAt: Date
}
