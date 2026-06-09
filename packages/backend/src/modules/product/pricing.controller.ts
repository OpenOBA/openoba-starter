import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { PricingService } from './pricing.service'
import { PricingEngineService } from './pricing-engine.service'
// P2修复：用CustomerService替代OrderService，打破Product↔Order循环依赖
import { CustomerService } from '../customer/customer.service'
import { Roles } from '../../common/decorators/roles.decorator'
import {
  CreateProductTierDto,
  UpdateProductTierDto,
  CreateWholesaleTierDto,
  UpdateWholesaleTierDto,
  QueryPriceHistoryDto,
  CreatePromotionDto,
  UpdatePromotionDto,
  QueryPromotionDto,
  CreateMemberLevelDto,
  UpdateMemberLevelDto,
  CreateMemberPricingRuleDto,
  UpdateMemberPricingRuleDto,
  QueryMemberPricingRuleDto,
} from './dto/pricing.dto'

@ApiTags('价格管理')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin')
@Controller('pricing')
export class PricingController {
  constructor(
    private readonly pricingService: PricingService,
    private readonly pricingEngineService: PricingEngineService,
    private readonly customerService: CustomerService,
  ) {}

  // ====== 产品分级 ======

  @Get('tiers')
  @ApiOperation({ summary: '获取产品分级列表' })
  async getTiers() {
    return this.pricingService.findAllTiers()
  }

  @Post('tiers')
  @ApiOperation({ summary: '创建产品分级' })
  async createTier(@Body() dto: CreateProductTierDto) {
    return this.pricingService.createTier(dto)
  }

  @Put('tiers/:tier-id')
  @ApiOperation({ summary: '更新产品分级' })
  async updateTier(@Param('tier-id') tierId: string, @Body() dto: UpdateProductTierDto) {
    return this.pricingService.updateTier(tierId, dto)
  }

  @Delete('tiers/:tier-id')
  @ApiOperation({ summary: '删除产品分级（软删）' })
  async deleteTier(@Param('tier-id') tierId: string) {
    return this.pricingService.deleteTier(tierId)
  }

  // ====== 批发阶梯 ======

  @Get('wholesale')
  @ApiOperation({ summary: '获取批发阶梯列表' })
  async getWholesaleTiers() {
    return this.pricingService.findAllWholesaleTiers()
  }

  @Post('wholesale')
  @ApiOperation({ summary: '创建批发阶梯' })
  async createWholesaleTier(@Body() dto: CreateWholesaleTierDto) {
    return this.pricingService.createWholesaleTier(dto)
  }

  @Put('wholesale/:tier-id')
  @ApiOperation({ summary: '更新批发阶梯' })
  async updateWholesaleTier(@Param('tier-id') tierId: string, @Body() dto: UpdateWholesaleTierDto) {
    return this.pricingService.updateWholesaleTier(tierId, dto)
  }

  @Delete('wholesale/:tier-id')
  @ApiOperation({ summary: '删除批发阶梯（软删）' })
  async deleteWholesaleTier(@Param('tier-id') tierId: string) {
    return this.pricingService.deleteWholesaleTier(tierId)
  }

  // ====== 价格历史 ======

  @Get('history')
  @ApiOperation({ summary: '查询价格历史' })
  async getPriceHistory(@Query() query: QueryPriceHistoryDto) {
    return this.pricingService.findPriceHistory(query)
  }

  // ====== 价格计算引擎 ======

  @Post('calculate')
  @ApiOperation({ summary: '价格计算（C端/B端）' })
  async calculatePrice(@Body() req: { skuId: string; customerId?: string; customerType?: string; quantity?: number }) {
    return this.pricingEngineService.calculatePrice({
      skuId: req.skuId,
      customerId: req.customerId,
      customerType: req.customerType,
      quantity: req.quantity || 1,
    })
  }

  // ====== C 端促销管理 ======

  @Get('promotions')
  @ApiOperation({ summary: '获取促销列表' })
  async getPromotions(@Query() query: QueryPromotionDto) {
    return this.pricingService.findAllPromotions(query)
  }

  @Get('promotions/:id')
  @ApiOperation({ summary: '获取促销详情' })
  async getPromotion(@Param('id') id: string) {
    return this.pricingService.findPromotionById(id)
  }

  @Post('promotions')
  @ApiOperation({ summary: '创建促销' })
  async createPromotion(@Body() dto: CreatePromotionDto) {
    return this.pricingService.createPromotion(dto)
  }

  @Put('promotions/:id')
  @ApiOperation({ summary: '更新促销' })
  async updatePromotion(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.pricingService.updatePromotion(id, dto)
  }

  @Delete('promotions/:id')
  @ApiOperation({ summary: '删除促销（软删=过期）' })
  async deletePromotion(@Param('id') id: string) {
    return this.pricingService.deletePromotion(id)
  }

  @Put('promotions/:id/status')
  @ApiOperation({ summary: '更新促销状态' })
  async updatePromotionStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.pricingService.updatePromotionStatus(id, body.status)
  }

  // ====== TASK-010: 会员管理（方案 C 升级） ======

  // 会员等级 CRUD
  @Get('members/levels')
  @ApiOperation({ summary: '获取会员等级列表' })
  async getMemberLevels() {
    return this.pricingService.findAllMemberLevels()
  }

  @Post('members/levels')
  @ApiOperation({ summary: '创建会员等级' })
  async createMemberLevel(@Body() dto: CreateMemberLevelDto) {
    return this.pricingService.createMemberLevel(dto)
  }

  @Put('members/levels/:code')
  @ApiOperation({ summary: '更新会员等级' })
  async updateMemberLevel(@Param('code') code: string, @Body() dto: UpdateMemberLevelDto) {
    return this.pricingService.updateMemberLevel(code, dto)
  }

  @Delete('members/levels/:code')
  @ApiOperation({ summary: '停用会员等级' })
  async deleteMemberLevel(@Param('code') code: string) {
    return this.pricingService.deleteMemberLevel(code)
  }

  @Post('members/downgrade-scan')
  @ApiOperation({ summary: '手动触发会员降级扫描（90天无消费降级）' })
  async scanDowngrades() {
    return this.customerService.scanMemberDowngrades()
  }

  // 会员定价规则 CRUD
  @Get('members/rules')
  @ApiOperation({ summary: '获取会员定价规则列表' })
  async getMemberPricingRules(@Query() query: QueryMemberPricingRuleDto) {
    return this.pricingService.findAllMemberPricingRules(query)
  }

  @Post('members/rules')
  @ApiOperation({ summary: '创建会员定价规则' })
  async createMemberPricingRule(@Body() dto: CreateMemberPricingRuleDto) {
    return this.pricingService.createMemberPricingRule(dto)
  }

  @Put('members/rules/:ruleId')
  @ApiOperation({ summary: '更新会员定价规则' })
  async updateMemberPricingRule(@Param('ruleId') ruleId: string, @Body() dto: UpdateMemberPricingRuleDto) {
    return this.pricingService.updateMemberPricingRule(ruleId, dto)
  }

  @Delete('members/rules/:ruleId')
  @ApiOperation({ summary: '停用会员定价规则' })
  async deleteMemberPricingRule(@Param('ruleId') ruleId: string) {
    return this.pricingService.deleteMemberPricingRule(ruleId)
  }
}
