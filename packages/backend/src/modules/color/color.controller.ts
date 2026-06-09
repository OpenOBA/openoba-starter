import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { ColorService } from './color.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import {
  CreateColorMaterialMappingDto,
  UpdateColorMaterialMappingDto,
  QueryColorMaterialMappingDto,
  CreateColorSeasonalPaletteDto,
  UpdateColorSeasonalPaletteDto,
  QueryColorSeasonalPaletteDto,
  CreatePaletteItemDto,
  CreateColorDesignProjectDto,
  UpdateColorDesignProjectDto,
  QueryColorDesignProjectDto,
  CreateProjectColorDto,
} from './dto/color.dto'
import { PageResponse } from '../../common/dto/response.dto'
import { MCPCapable } from '../../common/decorators/mcp-capable.decorator'
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('色彩标准库')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin', 'operator')
@Controller('colors')
export class ColorController {
  constructor(private readonly colorService: ColorService) {}

  // ============ Material-Color Mapping ============

  @Get('mappings')
  @ApiOperation({ summary: '材质-色彩映射列表（分页）' })
  @MCPCapable({ tool: 'color.mappings', description: '查询材质-色彩映射列表', category: 'product', readOnly: true, industryScoped: true })
  async findAllMappings(@Query() query: QueryColorMaterialMappingDto) {
    const result = await this.colorService.findAllMappings(query)
    return new PageResponse(result.items, result.total, result.page, result.pageSize)
  }

  @Get('mappings/:id')
  @ApiOperation({ summary: '材质-色彩映射详情' })
  @MCPCapable({ tool: 'color.mapping', description: '查询材质-色彩映射详情', category: 'product', readOnly: true, industryScoped: true })
  async findOneMapping(@Param('id') id: string) {
    return this.colorService.findOneMapping(id)
  }

  @Post('mappings')
  @ApiOperation({ summary: '创建材质-色彩映射' })
  @MCPCapable({ tool: 'color.createMapping', description: '创建材质-色彩映射', category: 'product', industryScoped: true })
  async createMapping(@Body() dto: CreateColorMaterialMappingDto) {
    return this.colorService.createMapping(dto)
  }

  @Put('mappings/:id')
  @ApiOperation({ summary: '更新材质-色彩映射' })
  @MCPCapable({ tool: 'color.updateMapping', description: '更新材质-色彩映射', category: 'product', industryScoped: true })
  async updateMapping(@Param('id') id: string, @Body() dto: UpdateColorMaterialMappingDto) {
    return this.colorService.updateMapping(id, dto)
  }

  @Delete('mappings/:id')
  @ApiOperation({ summary: '删除材质-色彩映射' })
  @MCPCapable({ tool: 'color.removeMapping', description: '删除材质-色彩映射', category: 'product', industryScoped: true })
  async removeMapping(@Param('id') id: string) {
    return this.colorService.removeMapping(id)
  }

  @Get('materials/:material-code/feasible-colors')
  @ApiOperation({ summary: '查询某材质可行的颜色列表' })
  @MCPCapable({
    tool: 'color.feasibleColors',
    description: '查询某材质可行的颜色列表',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async getFeasibleColors(@Param('material-code') materialCode: string) {
    return this.colorService.getFeasibleColors(materialCode)
  }

  // ============ Seasonal Palette ============

  @Get('palettes')
  @ApiOperation({ summary: '季节色盘列表（分页）' })
  @MCPCapable({ tool: 'color.palettes', description: '查询季节色盘列表', category: 'product', readOnly: true, industryScoped: true })
  async findAllPalettes(@Query() query: QueryColorSeasonalPaletteDto) {
    const result = await this.colorService.findAllPalettes(query)
    return new PageResponse(result.items, result.total, result.page, result.pageSize)
  }

  @Get('palettes/:id')
  @ApiOperation({ summary: '季节色盘详情（含颜色项）' })
  @MCPCapable({ tool: 'color.palette', description: '查询季节色盘详情', category: 'product', readOnly: true, industryScoped: true })
  async findOnePalette(@Param('id') id: string) {
    return this.colorService.findOnePalette(id)
  }

  @Post('palettes')
  @ApiOperation({ summary: '创建季节色盘' })
  @MCPCapable({ tool: 'color.createPalette', description: '创建季节色盘', category: 'product', industryScoped: true })
  async createPalette(@Body() dto: CreateColorSeasonalPaletteDto) {
    return this.colorService.createPalette(dto)
  }

  @Put('palettes/:id')
  @ApiOperation({ summary: '更新季节色盘' })
  @MCPCapable({ tool: 'color.updatePalette', description: '更新季节色盘', category: 'product', industryScoped: true })
  async updatePalette(@Param('id') id: string, @Body() dto: UpdateColorSeasonalPaletteDto) {
    return this.colorService.updatePalette(id, dto)
  }

  @Delete('palettes/:id')
  @ApiOperation({ summary: '删除季节色盘' })
  @MCPCapable({ tool: 'color.removePalette', description: '删除季节色盘', category: 'product', industryScoped: true })
  async removePalette(@Param('id') id: string) {
    return this.colorService.removePalette(id)
  }

  // Palette Items
  @Post('palette-items')
  @ApiOperation({ summary: '添加色盘颜色项' })
  @MCPCapable({ tool: 'color.addPaletteItem', description: '添加色盘颜色项', category: 'product', industryScoped: true })
  async addPaletteItem(@Body() dto: CreatePaletteItemDto) {
    return this.colorService.addPaletteItem(dto)
  }

  @Delete('palette-items/:id')
  @ApiOperation({ summary: '删除色盘颜色项' })
  @MCPCapable({ tool: 'color.removePaletteItem', description: '删除色盘颜色项', category: 'product', industryScoped: true })
  async removePaletteItem(@Param('id') id: string) {
    return this.colorService.removePaletteItem(id)
  }

  // ============ Design Project ============

  @Get('projects')
  @ApiOperation({ summary: '色彩设计项目列表（分页）' })
  @MCPCapable({ tool: 'color.projects', description: '查询色彩设计项目列表', category: 'product', readOnly: true, industryScoped: true })
  async findAllProjects(@Query() query: QueryColorDesignProjectDto) {
    const result = await this.colorService.findAllProjects(query)
    return new PageResponse(result.items, result.total, result.page, result.pageSize)
  }

  @Get('projects/:id')
  @ApiOperation({ summary: '色彩设计项目详情（含颜色列表）' })
  @MCPCapable({ tool: 'color.project', description: '查询色彩设计项目详情', category: 'product', readOnly: true, industryScoped: true })
  async findOneProject(@Param('id') id: string) {
    return this.colorService.findOneProject(id)
  }

  @Post('projects')
  @ApiOperation({ summary: '创建色彩设计项目' })
  @MCPCapable({ tool: 'color.createProject', description: '创建色彩设计项目', category: 'product', industryScoped: true })
  async createProject(@Body() dto: CreateColorDesignProjectDto) {
    return this.colorService.createProject(dto)
  }

  @Put('projects/:id')
  @ApiOperation({ summary: '更新色彩设计项目' })
  @MCPCapable({ tool: 'color.updateProject', description: '更新色彩设计项目', category: 'product', industryScoped: true })
  async updateProject(@Param('id') id: string, @Body() dto: UpdateColorDesignProjectDto) {
    return this.colorService.updateProject(id, dto)
  }

  @Delete('projects/:id')
  @ApiOperation({ summary: '删除色彩设计项目' })
  @MCPCapable({ tool: 'color.removeProject', description: '删除色彩设计项目', category: 'product', industryScoped: true })
  async removeProject(@Param('id') id: string) {
    return this.colorService.removeProject(id)
  }

  // Project Colors
  @Post('project-colors')
  @ApiOperation({ summary: '添加项目颜色项' })
  @MCPCapable({ tool: 'color.addProjectColor', description: '添加项目颜色项', category: 'product', industryScoped: true })
  async addProjectColor(@Body() dto: CreateProjectColorDto) {
    return this.colorService.addProjectColor(dto)
  }

  @Delete('project-colors/:id')
  @ApiOperation({ summary: '删除项目颜色项' })
  @MCPCapable({ tool: 'color.removeProjectColor', description: '删除项目颜色项', category: 'product', industryScoped: true })
  async removeProjectColor(@Param('id') id: string) {
    return this.colorService.removeProjectColor(id)
  }

  @Get('projects/:id/colors')
  @ApiOperation({ summary: '查询项目颜色列表' })
  @MCPCapable({ tool: 'color.projectColors', description: '查询项目颜色列表', category: 'product', readOnly: true, industryScoped: true })
  async getProjectColors(@Param('id') id: string) {
    return this.colorService.getProjectColors(id)
  }
}
