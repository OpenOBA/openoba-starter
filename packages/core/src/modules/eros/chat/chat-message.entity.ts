import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('chat_message')
@Index(['sessionKey', 'createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 128 })
  @Index()
  sessionKey: string

  @Column({ type: 'varchar', length: 16 })
  role: string // 'human' | 'agent' | 'system'

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'json', nullable: true })
  reactTimeline: Array<{
    kind: string
    text?: string
    name?: string
    args?: Record<string, unknown>
    status?: string
    result?: string
    durationMs?: number
  }> | null

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date
}
