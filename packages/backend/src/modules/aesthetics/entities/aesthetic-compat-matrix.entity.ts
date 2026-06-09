import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity('aesthetic_compat_matrices')
export class AestheticCompatMatrix {
  @PrimaryGeneratedColumn('uuid', { name: 'matrix_id' })
  matrixId: string

  @Column({ name: 'matrix_type', length: 32 })
  @Index()
  matrixType: string

  @Column({ name: 'dim_a', length: 32 })
  @Index()
  dimA: string

  @Column({ name: 'dim_b', length: 32 })
  @Index()
  dimB: string

  @Column({ comment: '兼容性',  length: 16 })
  compatibility: string

  @Column({ comment: '原因',  type: 'text', nullable: true })
  reason: string

  @Column({ comment: '权重',  type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  weight: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
