/**
 * 秒镜科技 · ERDL 议会模型 — 规则事件总线
 *
 * @file RuleEventBus Service
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license AGPL-3.0
 *
 * Agent 通过事件总线感知规则空间的变更。
 * 基于 Node.js EventEmitter，保证 FIFO 顺序。
 */

import { Injectable } from '@nestjs/common'
import { EventEmitter } from 'events'

// ============================================
// 事件类型定义
// ============================================

export interface ProposalCreatedEvent {
  proposalId: string
  type: 'create' | 'update' | 'delete'
  namespace: string
  proposedBy: string
  affectedAgents: string[]
  timestamp: number
}

export interface ProposalAcceptedEvent {
  proposalId: string
  snapshotId: string
  acceptedBy: string[]
  timestamp: number
}

export interface ProposalRejectedEvent {
  proposalId: string
  reason?: string
  rejectedBy: string
  timestamp: number
}

export interface SnapshotCreatedEvent {
  snapshotId: string
  snapshotSeq: number
  ruleCount: number
  predecessorId: string | null
  proposalIds: string[]
  timestamp: number
}

export interface RuleDeprecatedEvent {
  ruleId: string
  ruleName: string
  oldVersion: number
  newVersion: number
  namespace: string
  timestamp: number
}

/** 事件类型映射 */
export type RuleEventMap = {
  'proposal:created': (event: ProposalCreatedEvent) => void
  'proposal:accepted': (event: ProposalAcceptedEvent) => void
  'proposal:rejected': (event: ProposalRejectedEvent) => void
  'snapshot:created': (event: SnapshotCreatedEvent) => void
  'rule:deprecated': (event: RuleDeprecatedEvent) => void
}

export type RuleEventName = keyof RuleEventMap

// ============================================
// RuleEventBus
// ============================================

@Injectable()
export class RuleEventBus {
  private readonly emitter = new EventEmitter()

  /** 最大监听器数（每个 Agent 一个监听器） */
  private readonly MAX_LISTENERS = 50

  constructor() {
    this.emitter.setMaxListeners(this.MAX_LISTENERS)
  }

  /**
   * 订阅事件
   *
   * @param event 事件名
   * @param handler 处理器
   */
  on<E extends RuleEventName>(event: E, handler: RuleEventMap[E]): void {
    this.emitter.on(event, handler)
  }

  /**
   * 取消订阅
   */
  off<E extends RuleEventName>(event: E, handler: RuleEventMap[E]): void {
    this.emitter.off(event, handler)
  }

  /**
   * 单次订阅
   */
  once<E extends RuleEventName>(event: E, handler: RuleEventMap[E]): void {
    this.emitter.once(event, handler)
  }

  /**
   * 发布事件
   */
  emit<E extends RuleEventName>(event: E, payload: Parameters<RuleEventMap[E]>[0]): void {
    // 使用 setImmediate 确保异步，不阻塞当前操作
    setImmediate(() => {
      this.emitter.emit(event, payload)
    })
  }

  /**
   * 获取当前订阅者数量
   */
  listenerCount(event: RuleEventName): number {
    return this.emitter.listenerCount(event)
  }

  /**
   * 获取所有事件名（用于调试）
   */
  eventNames(): RuleEventName[] {
    return this.emitter.eventNames() as RuleEventName[]
  }
}
