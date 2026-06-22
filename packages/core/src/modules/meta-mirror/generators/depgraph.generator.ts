/**
 * 元镜 依赖图生成器 — 实体关系图 + 创建依赖排序
 *
 * @file depgraph.generator.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-26
 */

import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import type { EntityInfo } from '../types'

export interface DepGraphNode {
  id: string
  table: string
  module: string
  fieldCount: number
  isRoot?: boolean
  isLeaf?: boolean
  isAggregate?: boolean
  isMaster?: boolean
}

export interface DepGraphEdge {
  from: string
  to: string
  type: 'ManyToOne' | 'OneToMany' | 'ManyToMany'
  fk: string
  nullable: boolean
}

export interface DepGraph {
  generatedAt: string
  nodes: Record<string, DepGraphNode>
  edges: DepGraphEdge[]
  /** 创建依赖顺序（拓扑排序） */
  createOrder: string[]
  /** 删除依赖顺序（反向拓扑） */
  deleteOrder: string[]
}

@Injectable()
export class DepGraphGenerator {
  private readonly logger = new Logger(DepGraphGenerator.name)

  /** 生成实体依赖图 */
  generate(entities: EntityInfo[]): DepGraph {
    const nodes: Record<string, DepGraphNode> = {}
    const edges: DepGraphEdge[] = []

    // 1. 构建节点
    for (const e of entities) {
      const isRoot = e.relations.filter(r => r.type === 'OneToMany').length > 0 && 
                     e.relations.filter(r => r.type === 'ManyToOne').length === 0
      const isLeaf = e.relations.filter(r => r.type === 'ManyToOne').length > 0 && 
                     e.relations.filter(r => r.type === 'OneToMany').length === 0
      const isAggregate = e.name === 'Order' || e.name === 'DraftSpu'  // 聚合根模式
      const isMaster = e.name === 'Customer' || e.name === 'ProductSpu' || e.name === 'StructureStandard'

      nodes[e.name] = {
        id: e.name,
        table: e.tableName,
        module: e.module,
        fieldCount: e.fields.length,
        isRoot,
        isLeaf,
        isAggregate,
        isMaster,
      }
    }

    // 2. 构建边
    for (const e of entities) {
      for (const r of e.relations) {
        if (!nodes[r.targetEntity]) continue // 目标不存在

        const fkField = e.fields.find(f => f.name === r.name || f.name === `${r.name}Id`)
        edges.push({
          from: e.name,
          to: r.targetEntity,
          type: undefined,
          fk: fkField?.columnName || this.toSnakeCase(r.name),
          nullable: fkField?.isNullable ?? false,
        })
      }
    }

    // 3. 拓扑排序 → createOrder
    const createOrder = this.topoSort(nodes, edges)

    // 4. 反向 → deleteOrder
    const deleteOrder = [...createOrder].reverse()

    this.logger.log(
      `DepGraph: ${Object.keys(nodes).length} 节点, ${edges.length} 边, ` +
      `createOrder=${createOrder.join('→')}`,
    )

    return {
      generatedAt: new Date().toISOString(),
      nodes,
      edges,
      createOrder,
      deleteOrder,
    }
  }

  /** 拓扑排序（Kahn算法） */
  private topoSort(nodes: Record<string, DepGraphNode>, edges: DepGraphEdge[]): string[] {
    const inDegree: Record<string, number> = {}
    for (const id of Object.keys(nodes)) inDegree[id] = 0

    // 计算入度（ManyToOne → 依赖目标）
    for (const e of edges) {
      if (e.type === 'ManyToOne') {
        inDegree[e.from] = (inDegree[e.from] || 0) + 1
      }
    }

    // Kahn
    const queue: string[] = Object.keys(inDegree).filter(id => inDegree[id] === 0)
    const result: string[] = []

    while (queue.length > 0) {
      const node = queue.shift()!
      result.push(node)

      // 减少依赖者的入度
      for (const e of edges) {
        if (e.to === node && e.type === 'ManyToOne') {
          inDegree[e.from]--
          if (inDegree[e.from] === 0) queue.push(e.from)
        }
      }
    }

    // 剩余未处理的节点追加到末尾
    for (const id of Object.keys(inDegree)) {
      if (!result.includes(id)) result.push(id)
    }

    return result
  }

  /** 写入 depgraph.json 到 knowledge 目录 */
  async write(graph: DepGraph, outputDir: string): Promise<void> {
    fs.mkdirSync(path.join(outputDir, 'entities'), { recursive: true })
    const filePath = path.join(outputDir, 'entities', 'depgraph.json')
    fs.writeFileSync(filePath, JSON.stringify(graph, null, 2), 'utf-8')
    this.logger.log(`依赖图已生成: ${filePath}`)
  }

  private toSnakeCase(name: string): string {
    return name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
  }
}
