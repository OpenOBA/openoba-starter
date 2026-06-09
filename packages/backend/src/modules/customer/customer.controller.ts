import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { CustomerService } from './customer.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  QueryCustomerDto,
  CreateContactDto,
  UpdateContactDto,
  CreateAddressDto,
  UpdateAddressDto,
  CreateTierPricingDto,
  UpdateTierPricingDto,
  CreatePrescriptionDto,
  CreateCustomerLensDto,
  CreateConsumptionProfileDto,
} from './dto/customer.dto'
import { PageResponse } from '../../common/dto/response.dto'
import { MCPCapable } from '../../common/decorators/mcp-capable.decorator'
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('客户管理')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin', 'operator')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @ApiOperation({ summary: '客户列表（分页）' })
  @MCPCapable({ tool: 'customer.list', description: '查询客户列表（支持分页+筛选）', category: 'customer', readOnly: true })
  async findAll(@Query() query: QueryCustomerDto) {
    const r = await this.customerService.findAll(query)
    return new PageResponse(r.items, r.total, r.page, r.pageSize)
  }

  // =====================================================
  // ⚠️ 固定路径路由必须在动态 :id 路由之前声明
  // =====================================================

  @Get('member-dashboard')
  @ApiOperation({ summary: '会员仪表盘 — 概览统计' })
  async getMemberDashboard() {
    return this.customerService.getMemberDashboard()
  }

  @Get('member-analytics')
  @ApiOperation({ summary: '会员分析列表 — 含活跃度/消费力' })
  async getMemberAnalytics(@Query() query: { page?: string; pageSize?: string; level?: string; keyword?: string; sortBy?: string }) {
    return this.customerService.getMemberAnalytics({
      page: query.page ? +query.page : 1,
      pageSize: query.pageSize ? +query.pageSize : 20,
      level: query.level,
      keyword: query.keyword,
      sortBy: query.sortBy,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: '客户详情' })
  @MCPCapable({ tool: 'customer.detail', description: '查询单个客户详情', category: 'customer', readOnly: true })
  async findOne(@Param('id') id: string) {
    return this.customerService.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: '创建客户' })
  @MCPCapable({ tool: 'customer.create', description: '创建新客户', category: 'customer' })
  async create(@Body() dto: CreateCustomerDto) {
    return this.customerService.create(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新客户' })
  @MCPCapable({ tool: 'customer.update', description: '更新客户信息', category: 'customer' })
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customerService.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除客户' })
  @MCPCapable({ tool: 'customer.delete', description: '删除/禁用客户', category: 'customer' })
  async remove(@Param('id') id: string) {
    await this.customerService.remove(id)
    return { message: '删除成功' }
  }

  @Get(':id/contacts')
  @ApiOperation({ summary: '联系人列表' })
  @MCPCapable({ tool: 'customer.contacts', description: '查询客户联系人列表', category: 'customer', readOnly: true, industryScoped: true })
  async getContacts(@Param('id') id: string) {
    return this.customerService.getContacts(id)
  }

  @Post('contacts')
  @ApiOperation({ summary: '添加联系人' })
  @MCPCapable({ tool: 'customer.addContact', description: '为客户添加联系人', category: 'customer', industryScoped: true })
  async addContact(@Body() dto: CreateContactDto) {
    return this.customerService.addContact(dto)
  }

  @Put('contacts/:id')
  @ApiOperation({ summary: '更新联系人' })
  @MCPCapable({ tool: 'customer.updateContact', description: '更新联系人信息', category: 'customer', industryScoped: true })
  async updateContact(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.customerService.updateContact(id, dto)
  }

  @Delete('contacts/:id')
  @ApiOperation({ summary: '删除联系人' })
  @MCPCapable({ tool: 'customer.removeContact', description: '删除客户联系人', category: 'customer' })
  async removeContact(@Param('id') id: string) {
    await this.customerService.removeContact(id)
    return { message: '删除成功' }
  }

  @Get(':id/addresses')
  @ApiOperation({ summary: '地址列表' })
  @MCPCapable({ tool: 'customer.addresses', description: '查询客户地址列表', category: 'customer', readOnly: true })
  async getAddresses(@Param('id') id: string) {
    return this.customerService.getAddresses(id)
  }

  @Post('addresses')
  @ApiOperation({ summary: '添加地址' })
  @MCPCapable({ tool: 'customer.addAddress', description: '为客户添加地址', category: 'customer' })
  async addAddress(@Body() dto: CreateAddressDto) {
    return this.customerService.addAddress(dto)
  }

  @Put('addresses/:id')
  @ApiOperation({ summary: '更新地址' })
  @MCPCapable({ tool: 'customer.updateAddress', description: '更新客户地址', category: 'customer' })
  async updateAddress(@Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.customerService.updateAddress(id, dto)
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: '删除地址' })
  @MCPCapable({ tool: 'customer.removeAddress', description: '删除客户地址', category: 'customer' })
  async removeAddress(@Param('id') id: string) {
    await this.customerService.removeAddress(id)
    return { message: '删除成功' }
  }

  @Get(':id/pricings')
  @ApiOperation({ summary: '阶梯定价列表' })
  @MCPCapable({
    tool: 'customer.pricings',
    description: '查询客户阶梯定价列表',
    category: 'customer',
    readOnly: true,
    industryScoped: true,
  })
  async getTierPricings(@Param('id') id: string) {
    return this.customerService.getTierPricings(id)
  }

  @Post('pricings')
  @ApiOperation({ summary: '添加阶梯定价' })
  @MCPCapable({ tool: 'customer.addPricing', description: '添加阶梯定价方案', category: 'customer', industryScoped: true })
  async addTierPricing(@Body() dto: CreateTierPricingDto) {
    return this.customerService.addTierPricing(dto)
  }

  @Put('pricings/:id')
  @ApiOperation({ summary: '更新阶梯定价' })
  @MCPCapable({ tool: 'customer.updatePricing', description: '更新阶梯定价方案', category: 'customer', industryScoped: true })
  async updateTierPricing(@Param('id') id: string, @Body() dto: UpdateTierPricingDto) {
    return this.customerService.updateTierPricing(id, dto)
  }

  @Delete('pricings/:id')
  @ApiOperation({ summary: '删除阶梯定价' })
  @MCPCapable({ tool: 'customer.removePricing', description: '删除阶梯定价', category: 'customer' })
  async removeTierPricing(@Param('id') id: string) {
    await this.customerService.removeTierPricing(id)
    return { message: '删除成功' }
  }

  // =====================================================
  // Phase 5: 客户核心资产 API
  // =====================================================

  // --- 验光处方 ---
  @Get(':id/prescriptions')
  @ApiOperation({ summary: '客户处方列表' })
  @MCPCapable({
    tool: 'customer.prescriptions',
    description: '查询客户验光处方列表',
    category: 'customer',
    readOnly: true,
    industryScoped: true,
  })
  async getPrescriptions(@Param('id') id: string) {
    return this.customerService.getPrescriptions(id)
  }

  @Post('prescriptions')
  @ApiOperation({ summary: '添加处方' })
  @MCPCapable({ tool: 'customer.addPrescription', description: '添加客户验光处方', category: 'customer', industryScoped: true })
  async createPrescription(@Body() dto: CreatePrescriptionDto) {
    const { customerId, ...rest } = dto
    return this.customerService.createPrescription(customerId, rest)
  }

  @Delete('prescriptions/:id')
  @ApiOperation({ summary: '删除处方' })
  @MCPCapable({ tool: 'customer.removePrescription', description: '删除客户验光处方', category: 'customer', industryScoped: true })
  async removePrescription(@Param('id') id: string) {
    await this.customerService.removePrescription(id)
    return { message: '删除成功' }
  }

  // --- 客户镜片 ---
  @Get(':id/lenses')
  @ApiOperation({ summary: '客户镜片列表' })
  @MCPCapable({ tool: 'customer.lenses', description: '查询客户镜片标准记录', category: 'customer', readOnly: true, industryScoped: true })
  async getCustomerLenses(@Param('id') id: string) {
    return this.customerService.getCustomerLenses(id)
  }

  @Get(':id/lens-summary')
  @ApiOperation({ summary: '客户镜片概览（在用镜片标准 + 处方关联）' })
  @MCPCapable({
    tool: 'customer.lensSummary',
    description: '客户镜片标准概览+处方关联',
    category: 'customer',
    readOnly: true,
    industryScoped: true,
  })
  async getCustomerLensSummary(@Param('id') id: string) {
    return this.customerService.getCustomerLensSummary(id)
  }

  @Post('lenses')
  @ApiOperation({ summary: '添加客户镜片' })
  @MCPCapable({ tool: 'customer.addLens', description: '添加客户镜片标准记录', category: 'customer', industryScoped: true })
  async createCustomerLens(@Body() dto: CreateCustomerLensDto) {
    const { customerId, ...rest } = dto
    return this.customerService.createCustomerLens(customerId, rest)
  }

  @Delete('lenses/:id')
  @ApiOperation({ summary: '删除客户镜片' })
  @MCPCapable({ tool: 'customer.removeLens', description: '删除客户镜片记录', category: 'customer', industryScoped: true })
  async removeCustomerLens(@Param('id') id: string) {
    await this.customerService.removeCustomerLens(id)
    return { message: '删除成功' }
  }

  // --- 客户消费档案 ---
  @Get('lenses/:lens-id/consumption-profiles')
  @ApiOperation({ summary: '客户消费档案列表（按镜片）' })
  @MCPCapable({
    tool: 'customer.consumptionProfiles',
    description: '查询客户消费档案列表',
    category: 'customer',
    readOnly: true,
    industryScoped: true,
  })
  async getConsumptionProfiles(@Param('lens-id') lensId: string) {
    return this.customerService.getConsumptionProfiles(lensId)
  }

  @Post('consumption-profiles')
  @ApiOperation({ summary: '添加客户消费档案' })
  @MCPCapable({ tool: 'customer.addConsumptionProfile', description: '添加消费档案记录', category: 'customer', industryScoped: true })
  async createConsumptionProfile(@Body() dto: CreateConsumptionProfileDto) {
    const { customerLensId, ...rest } = dto
    return this.customerService.createConsumptionProfile(customerLensId, rest)
  }

  @Delete('consumption-profiles/:id')
  @ApiOperation({ summary: '删除客户消费档案' })
  @MCPCapable({ tool: 'customer.removeConsumptionProfile', description: '删除客户消费档案', category: 'customer', industryScoped: true })
  async removeConsumptionProfile(@Param('id') id: string) {
    await this.customerService.removeConsumptionProfile(id)
    return { message: '删除成功' }
  }

  // =====================================================
  // P1+ 客户管理重构 — 会员等级日志 + 积分流水 + 官网账户
  // =====================================================

  @Get(':id/member-level-logs')
  @ApiOperation({ summary: '会员等级变更日志' })
  @MCPCapable({ tool: 'customer.memberLevelLogs', description: '查询客户会员等级变更日志', category: 'customer', readOnly: true })
  async getMemberLevelLogs(@Param('id') id: string) {
    return this.customerService.getMemberLevelLogs(id)
  }

  @Get(':id/points-transactions')
  @ApiOperation({ summary: '积分流水' })
  @MCPCapable({ tool: 'customer.pointsTransactions', description: '查询客户积分流水', category: 'customer', readOnly: true })
  async getPointsTransactions(@Param('id') id: string) {
    return this.customerService.getPointsTransactions(id)
  }

  @Get(':id/account-info')
  @ApiOperation({ summary: '官网账户信息' })
  @MCPCapable({ tool: 'customer.accountInfo', description: '客户官网账户信息', category: 'customer', readOnly: true })
  async getAccountInfo(@Param('id') id: string) {
    return this.customerService.getAccountInfo(id)
  }

  @Post('member-downgrade-scan')
  @ApiOperation({ summary: '手动触发会员降级扫描' })
  async scanMemberDowngrades() {
    return this.customerService.scanMemberDowngrades()
  }
}
