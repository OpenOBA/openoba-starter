import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuid } from 'uuid'
import { DeliverableManifest, DeliverableStatus } from './deliverable-manifest.entity'

export interface CreateDeliverableOptions {
  taskId: string
  taskTitle: string
  userType: string
  createdBy: string
  approvedBy?: string
  changelog?: string
  parentVersion?: number
  rootDir: string
  files?: Array<{ name: string; size: number; content?: string | Buffer }>
}

export interface DeliverableIndex {
  workspace: string
  deliverableRoot: string
  updatedAt: string
  entries: Array<{
    taskId: string
    title: string
    userType: string
    latestVersion: number
    status: string
    createdAt: string
  }>
}

@Injectable()
export class DeliverableService {
  private readonly logger = new Logger(DeliverableService.name)

  constructor(
    @InjectRepository(DeliverableManifest)
    private readonly repo: Repository<DeliverableManifest>,
  ) {}

  /**
   * 创建一个新版本的交付物
   * 1. 确定版本号（查询该任务最新版本 + 1）
   * 2. 创建文件系统目录
   * 3. 写入文件
   * 4. 写入 manifest.json
   * 5. 写入数据库记录
   * 6. 更新 _index.json
   * 7. 追加 timeline.md
   */
  async createDeliverable(opts: CreateDeliverableOptions): Promise<DeliverableManifest> {
    const { taskId, taskTitle, userType, createdBy, rootDir, files } = opts

    // 1. 确定版本号
    const latest = await this.repo.findOne({
      where: { taskId },
      order: { version: 'DESC' },
    })
    const version = (latest?.version || 0) + 1

    // 2. 创建目录
    const taskDir = path.join(rootDir, 'deliverables', taskId)
    const versionDir = path.join(taskDir, `V${version}`)
    fs.mkdirSync(versionDir, { recursive: true })

    // 3. 写入文件
    let fileCount = 0
    let totalSize = 0
    if (files && files.length > 0) {
      for (const f of files) {
        const filePath = path.join(versionDir, f.name)
        const dir = path.dirname(filePath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        if (f.content) {
          fs.writeFileSync(filePath, f.content)
        }
        fileCount++
        totalSize += f.size || fs.statSync(filePath).size
      }
    }

    // 4. 写入 manifest.json
    const manifestJson = {
      taskId,
      taskTitle,
      version,
      createdAt: new Date().toISOString(),
      createdBy,
      approvedBy: opts.approvedBy || null,
      userType,
      status: 'approved',
      files: files?.map(f => ({ path: f.name, size: f.size })) || [],
      changelog: opts.changelog || '',
      parentVersion: opts.parentVersion || null,
    }
    fs.writeFileSync(
      path.join(versionDir, 'manifest.json'),
      JSON.stringify(manifestJson, null, 2),
    )

    // 5. 写入数据库
    const entity = this.repo.create({
      id: uuid(),
      taskId,
      taskTitle,
      version,
      userType: undefined,
      status: 'approved',
      createdBy,
      approvedBy: opts.approvedBy || undefined,
      changelog: opts.changelog,
      parentVersion: opts.parentVersion || undefined,
      fileCount,
      totalSize,
      dirPath: `deliverables/${taskId}/V${version}`,
    })
    const saved = await this.repo.save(entity)

    // 6. 更新 _index.json
    await this.updateIndex(rootDir)

    // 7. 追加 timeline.md
    await this.appendTimeline(taskId, taskDir, {
      time: new Date().toISOString(),
      event: `V${version} 交付${opts.changelog ? ' — ' + opts.changelog : ''}`,
      actor: createdBy,
      type: createdBy.includes('Agent') ? 'agent' : 'human',
    })

    this.logger.log(`[Deliverable] 任务 ${taskId} V${version} 已交付（${fileCount} 文件, ${totalSize} 字节）`)
    return saved
  }

  /** 查询某任务的所有版本 */
  async getVersions(taskId: string) {
    return this.repo.find({
      where: { taskId },
      order: { version: 'DESC' },
    })
  }

  /** 查询某任务的最新版本 */
  async getLatest(taskId: string) {
    return this.repo.findOne({
      where: { taskId },
      order: { version: 'DESC' },
    })
  }

  /** 查询所有交付物索引（分页） */
  async queryIndex(page = 1, pageSize = 20) {
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    return { items, total }
  }

  /** 更新交付物状态 */
  async updateStatus(id: string, status: DeliverableStatus, approvedBy?: string) {
    const update: Partial<DeliverableManifest> = { status }
    if (approvedBy) update.approvedBy = approvedBy
    await this.repo.update(id, update as Record<string, unknown>)
    return this.repo.findOneBy({ id })
  }

  /** 读取或生成 _index.json */
  async getIndex(rootDir: string): Promise<DeliverableIndex> {
    const indexPath = path.join(rootDir, 'deliverables', '_index.json')
    try {
      if (fs.existsSync(indexPath)) {
        return JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
      }
    } catch (e: unknown) {
      this.logger.debug(`索引文件读取失败: ${(e as Error).message}`)
    }
    return { workspace: rootDir, deliverableRoot: path.join(rootDir, 'deliverables'), updatedAt: '', entries: [] }
  }

  /** 更新 _index.json */
  private async updateIndex(rootDir: string) {
    const deliverablesDir = path.join(rootDir, 'deliverables')
    if (!fs.existsSync(deliverablesDir)) {
      fs.mkdirSync(deliverablesDir, { recursive: true })
    }

    // 从数据库查询所有交付物的最新版本信息
    const rows = await this.repo
      .createQueryBuilder('dm')
      .select('dm.taskId', 'taskId')
      .addSelect('dm.taskTitle', 'title')
      .addSelect('dm.userType', 'userType')
      .addSelect('MAX(dm.version)', 'latestVersion')
      .addSelect('dm.status', 'status')
      .addSelect('MIN(dm.createdAt)', 'createdAt')
      .groupBy('dm.taskId')
      .addGroupBy('dm.taskTitle')
      .addGroupBy('dm.userType')
      .addGroupBy('dm.status')
      .orderBy('createdAt', 'DESC')
      .getRawMany()

    const index: DeliverableIndex = {
      workspace: rootDir,
      deliverableRoot: deliverablesDir,
      updatedAt: new Date().toISOString(),
      entries: rows.map(r => ({
        taskId: r.taskId,
        title: r.title,
        userType: r.userType,
        latestVersion: Number(r.latestVersion),
        status: r.status,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
      })),
    }

    fs.writeFileSync(
      path.join(deliverablesDir, '_index.json'),
      JSON.stringify(index, null, 2),
    )
  }

  /** 追加 timeline.md */
  private async appendTimeline(
    taskId: string,
    taskDir: string,
    entry: { time: string; event: string; actor: string; type: string },
  ) {
    const timelinePath = path.join(taskDir, 'timeline.md')
    const line = `| ${new Date(entry.time).toLocaleString('zh-CN')} | ${entry.event} | ${entry.actor} | ${entry.type} |`

    if (!fs.existsSync(timelinePath)) {
      const header = `# 任务时间线：${taskId}\n\n| 时间 | 事件 | 操作者 | 类型 |\n|------|------|--------|------|`
      fs.writeFileSync(timelinePath, header + '\n' + line)
    } else {
      fs.appendFileSync(timelinePath, '\n' + line)
    }
  }

  /** 删除交付物（软删除 → archived） */
  async archive(id: string) {
    await this.repo.update(id, { status: 'archived' })
    return { success: true }
  }
}
