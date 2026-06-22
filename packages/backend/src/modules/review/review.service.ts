/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Review } from './entity/review.entity'
import { CreateReviewDto, ReviewActionDto, ReplyReviewDto, QueryReviewDto } from './dto/review.dto'
import { REVIEW_STATUS } from './review.constants'

// 热门评价标签池
const REVIEW_TAGS = [
  '质量好',
  '舒适度高',
  '款式好看',
  '性价比高',
  '物流快',
  '包装精美',
  '百搭',
  '显脸小',
  '轻便',
  '做工精细',
  '颜色正',
  '质感好',
  '有档次',
  '回头率高',
  '物超所值',
]

// 自动标签规则：评分 >= 4 自动打正面标签
const AUTO_POSITIVE_TAGS = ['质量好', '舒适度高', '款式好看', '性价比高']

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private reviewRepo: Repository<Review>,
  ) {}

  // ===== 提交评价（C 端 / 管理端） =====
  async createReview(dto: CreateReviewDto) {
    // 验证评分范围
    if (dto.overallScore < 1 || dto.overallScore > 5) {
      throw new BadRequestException('总评分必须是 1-5')
    }

    // 检查该订单是否已评价
    const existing = await this.reviewRepo.findOne({
      where: { orderId: dto.orderId, spuId: dto.spuId, isDeleted: false },
    })
    if (existing) {
      throw new BadRequestException('该商品已评价')
    }

    // 自动标签：高分自动打正面标签
    const autoTags = dto.overallScore >= 4 ? AUTO_POSITIVE_TAGS.slice(0, 2) : []
    const finalTags = [...new Set([...(dto.tags || []), ...autoTags])]

    const entity = this.reviewRepo.create({
      ...dto,
      tags: finalTags.length > 0 ? finalTags : undefined,
      status: REVIEW_STATUS.pending,
      isAnonymous: dto.isAnonymous || false,
      helpfulCount: 0,
      isDeleted: false,
    })

    const saved = await this.reviewRepo.save(entity)

    // 更新 SPU 评价统计
    await this.updateSpuStats(dto.spuId)

    return saved
  }

  // ===== 评价列表（管理端） =====
  async findReviews(query: QueryReviewDto) {
    const { page = 1, pageSize = 20, keyword, status, spuId, customerId, minScore, startDate, endDate } = query
    const qb = this.reviewRepo.createQueryBuilder('r').where('r.isDeleted = :del', { del: false })

    if (keyword) qb.andWhere('(r.content LIKE :kw OR r.customer_name LIKE :kw)', { kw: `%${keyword}%` })
    if (status) qb.andWhere('r.status = :st', { st: status })
    if (spuId) qb.andWhere('r.spu_id = :sid', { sid: spuId })
    if (customerId) qb.andWhere('r.customer_id = :cid', { cid: customerId })
    if (minScore) qb.andWhere('r.overall_score >= :ms', { ms: minScore })
    if (startDate) qb.andWhere('r.created_at >= :sd', { sd: startDate })
    if (endDate) qb.andWhere('r.created_at <= :ed', { ed: endDate })

    qb.orderBy('r.created_at', 'DESC')
    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    return { items, total, page: +page, pageSize: +pageSize }
  }

  // ===== 评价详情 =====
  async findOneReview(id: string) {
    const item = await this.reviewRepo.findOne({
      where: { reviewId: id, isDeleted: false },
    })
    if (!item) throw new NotFoundException('评价不存在')
    return item
  }

  // ===== 审核评价（approve / reject） =====
  async reviewAction(id: string, dto: ReviewActionDto) {
    const review = await this.findOneReview(id)

    if (dto.action === 'approve') {
      review.status = REVIEW_STATUS.approved
    } else if (dto.action === 'reject') {
      review.status = REVIEW_STATUS.rejected
    } else {
      throw new BadRequestException('action 必须是 approve 或 reject')
    }

    const saved = await this.reviewRepo.save(review)

    // 更新 SPU 统计
    await this.updateSpuStats(review.spuId)

    return saved
  }

  // ===== 商家回复 =====
  async replyReview(id: string, dto: ReplyReviewDto) {
    const review = await this.findOneReview(id)
    review.replyContent = dto.content
    review.replyBy = dto.replyBy || 'admin'
    review.replyAt = new Date()
    return this.reviewRepo.save(review)
  }

  // ===== 标记有用 =====
  async markHelpful(id: string) {
    const review = await this.findOneReview(id)
    review.helpfulCount = (review.helpfulCount || 0) + 1
    return this.reviewRepo.save(review)
  }

  // ===== 删除评价 =====
  async deleteReview(id: string) {
    const review = await this.findOneReview(id)
    const spuId = review.spuId
    review.isDeleted = true
    await this.reviewRepo.save(review)
    await this.updateSpuStats(spuId)
    return { message: '已删除' }
  }

  // ===== 官网：SPU 评价列表（只读） =====
  async findReviewsBySpu(spuId: string, query: any) {
    const { page = 1, pageSize = 10, withImages } = query
    const qb = this.reviewRepo
      .createQueryBuilder('r')
      .where('r.spu_id = :sid', { sid: spuId })
      .andWhere('r.status = :st', { st: 'approved' })
      .andWhere('r.isDeleted = :del', { del: false })

    if (withImages === 'true') {
      qb.andWhere('r.images IS NOT NULL')
    }

    qb.orderBy('r.created_at', 'DESC')
    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    // 匿名处理
    const sanitized = items.map((r) => ({
      ...r,
      customerName: r.isAnonymous ? '匿名用户' : r.customerName,
      customerId: undefined, // 不暴露 ID
    }))

    return { items: sanitized, total, page: +page, pageSize: +pageSize }
  }

  // ===== 官网：SPU 评价统计 =====
  async getSpuStats(spuId: string) {
    const stats = await this.reviewRepo
      .createQueryBuilder('r')
      .select([
        'COUNT(*) as total',
        'AVG(r.overall_score) as avgOverall',
        'AVG(r.quality_score) as avgQuality',
        'AVG(r.comfort_score) as avgComfort',
        'AVG(r.style_score) as avgStyle',
        'AVG(r.value_score) as avgValue',
      ])
      .where('r.spu_id = :sid', { sid: spuId })
      .andWhere('r.status = :st', { st: 'approved' })
      .andWhere('r.isDeleted = :del', { del: false })
      .getRawOne()

    // 评分分布
    const distribution = await this.reviewRepo
      .createQueryBuilder('r')
      .select('r.overall_score', 'score')
      .addSelect('COUNT(*)', 'count')
      .where('r.spu_id = :sid', { sid: spuId })
      .andWhere('r.status = :st', { st: 'approved' })
      .andWhere('r.isDeleted = :del', { del: false })
      .groupBy('r.overall_score')
      .getRawMany()

    // 热门标签
    const tagResult = await this.reviewRepo
      .createQueryBuilder('r')
      .select('r.tags', 'tags')
      .where('r.spu_id = :sid', { sid: spuId })
      .andWhere('r.status = :st', { st: 'approved' })
      .andWhere('r.isDeleted = :del', { del: false })
      .getMany()

    const tagCounts: Record<string, number> = {}
    tagResult.forEach((r) => {
      if (r.tags && Array.isArray(r.tags)) {
        r.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
      }
    })

    const hotTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }))

    return {
      total: parseInt(stats?.total || 0),
      avgOverall: parseFloat(stats?.avgOverall || 0)?.toFixed(1),
      avgQuality: parseFloat(stats?.avgQuality || 0)?.toFixed(1),
      avgComfort: parseFloat(stats?.avgComfort || 0)?.toFixed(1),
      avgStyle: parseFloat(stats?.avgStyle || 0)?.toFixed(1),
      avgValue: parseFloat(stats?.avgValue || 0)?.toFixed(1),
      distribution: distribution.map((d: Record<string, unknown>) => ({
        score: parseInt(d.score as string),
        count: parseInt(d.count as string),
      })),
      hotTags,
    }
  }

  // ===== 更新 SPU 评价统计 =====
  private async updateSpuStats(spuId: string) {
    const stats = await this.getSpuStats(spuId)

    const scoreDist: Record<string, number> = {}
    stats.distribution.forEach((d: Record<string, unknown>) => {
      scoreDist[d.score as string] = d.count as number
    })

    // 使用原生 SQL upsert
    await this.reviewRepo.query(
      `INSERT INTO review_spu_stats (stats_id, spu_id, total_reviews, approved_reviews, 
        avg_overall, avg_quality, avg_comfort, avg_style, avg_value,
        score_5_count, score_4_count, score_3_count, score_2_count, score_1_count,
        tags, last_updated)
      VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        total_reviews = VALUES(total_reviews),
        approved_reviews = VALUES(approved_reviews),
        avg_overall = VALUES(avg_overall),
        avg_quality = VALUES(avg_quality),
        avg_comfort = VALUES(avg_comfort),
        avg_style = VALUES(avg_style),
        avg_value = VALUES(avg_value),
        score_5_count = VALUES(score_5_count),
        score_4_count = VALUES(score_4_count),
        score_3_count = VALUES(score_3_count),
        score_2_count = VALUES(score_2_count),
        score_1_count = VALUES(score_1_count),
        tags = VALUES(tags),
        last_updated = NOW()`,
      [
        spuId,
        stats.total,
        stats.total,
        stats.avgOverall,
        stats.avgQuality,
        stats.avgComfort,
        stats.avgStyle,
        stats.avgValue,
        scoreDist[5] || 0,
        scoreDist[4] || 0,
        scoreDist[3] || 0,
        scoreDist[2] || 0,
        scoreDist[1] || 0,
        JSON.stringify(stats.hotTags),
      ],
    )
  }
}
