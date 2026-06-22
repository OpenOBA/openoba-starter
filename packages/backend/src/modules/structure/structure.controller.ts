import * as crypto from 'crypto'
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger'
import { StructureService } from './structure.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import {
  CreateStructureStandardDto,
  UpdateStructureStandardDto,
  CreateAttachmentDto,
  CreateCompatibilityDto,
  QueryStructureDto,
} from './dto/structure.dto'
import { PageResponse } from '../../common/dto/response.dto'
import { MCPCapable } from '../../common/decorators/mcp-capable.decorator'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { Roles } from '../../common/decorators/roles.decorator'

// 文件上传配置 — 2D/3D/CAD 全覆盖
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'structure')
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

// 按扩展名白名单校验（CAD/3D 文件 MIME 不统一，用扩展名更可靠）
const ALLOWED_EXTS = new Set([
  // 图片
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  // 文档
  '.pdf',
  // 2D CAD
  '.dwg',
  '.dxf',
  // 3D 模型
  '.stl',
  '.stp',
  '.step',
  '.obj',
  '.fbx',
  '.iges',
  '.igs',
  '.3mf',
  // 其他工程文件
  '.dwf',
  '.dgn',
  '.skp',
])

// 文件分类映射
const FILE_CATEGORIES: Record<string, string> = {
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.gif': 'image',
  '.webp': 'image',
  '.svg': 'image',
  '.bmp': 'image',
  '.pdf': 'document',
  '.dwg': 'cad-2d',
  '.dxf': 'cad-2d',
  '.dwf': 'cad-2d',
  '.dgn': 'cad-2d',
  '.stl': 'model-3d',
  '.stp': 'model-3d',
  '.step': 'model-3d',
  '.obj': 'model-3d',
  '.fbx': 'model-3d',
  '.iges': 'model-3d',
  '.igs': 'model-3d',
  '.3mf': 'model-3d',
  '.skp': 'model-3d',
}

@ApiTags('结构标准库')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin', 'operator')
@Controller('structures')
export class StructureController {
  constructor(private readonly structureService: StructureService) {}

  @Get()
  @ApiOperation({ summary: '结构标准列表（分页）' })
  @MCPCapable({
    tool: 'structure.list',
    description: '查询结构标准列表（分页）',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async findAll(@Query() query: QueryStructureDto) {
    const result = await this.structureService.findAll(query)
    return new PageResponse(result.items, result.total, result.page, result.pageSize)
  }

  @Get(':id')
  @ApiOperation({ summary: '结构标准详情' })
  @MCPCapable({
    tool: 'structure.detail',
    description: '查询结构标准详情',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async findOne(@Param('id') id: string) {
    return this.structureService.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: '创建结构标准' })
  @MCPCapable({ tool: 'structure.create', description: '创建结构标准', category: 'product', industryScoped: true })
  async create(@Body() dto: CreateStructureStandardDto) {
    // 标准编号自动生成：宽度×高度（如 51×47 = 5147）
    const standardCode = `${Math.round(dto.width)}${Math.round(dto.height)}`
    return this.structureService.create({ ...dto, externalCode: standardCode })
  }

  @Put(':id')
  @ApiOperation({ summary: '更新结构标准' })
  @MCPCapable({ tool: 'structure.update', description: '更新结构标准信息', category: 'product', industryScoped: true })
  async update(@Param('id') id: string, @Body() dto: UpdateStructureStandardDto) {
    return this.structureService.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除结构标准（软删除）' })
  async remove(@Param('id') id: string) {
    await this.structureService.remove(id)
    return { message: '删除成功' }
  }

  // Attachments
  @Post('attachments')
  @ApiOperation({ summary: '添加附件' })
  async addAttachment(@Body() dto: CreateAttachmentDto) {
    return this.structureService.addAttachment(dto)
  }

  @Delete('attachments/:id')
  @ApiOperation({ summary: '删除附件' })
  async removeAttachment(@Param('id') id: string) {
    await this.structureService.removeAttachment(id)
    return { message: '附件删除成功' }
  }

  // 文件上传（2D/3D/CAD/文档）
  @Post(':id/upload')
  @ApiOperation({ summary: '上传附件（支持图片/PDF/2D CAD/3D 模型）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '文件（JPG/PNG/GIF/WEBP/SVG/PDF/DWG/DXF/STL/STP/STEP/OBJ/FBX/IGES/3MF）',
        },
        description: { type: 'string', description: '附件说明' },
        isPublic: { type: 'boolean', description: '是否公开', default: false },
        sortOrder: { type: 'number', description: '排序', default: 0 },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase()
          const uniqueName = `${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}${ext}`
          cb(null, uniqueName)
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase()
        if (!ALLOWED_EXTS.has(ext)) {
          return cb(new BadRequestException(`不支持的文件类型: ${ext || '(无扩展名)'}`), false)
        }
        cb(null, true)
      },
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB（3D 文件较大）
    }),
  )
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description?: string,
    @Body('isPublic') isPublic?: string,
    @Body('sortOrder') sortOrder?: string,
  ) {
    const ext = extname(file.originalname).toLowerCase()
    const fileType = FILE_CATEGORIES[ext] || 'document'
    const attachment = await this.structureService.addAttachment({
      structureId: id,
      fileType,
      fileName: file.originalname,
      fileUrl: `/uploads/structure/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype || 'application/octet-stream',
      description: description || undefined,
      isPublic: isPublic === 'true',
      sortOrder: parseInt(sortOrder || '0', 10),
    })
    return { message: '上传成功', data: attachment }
  }

  // Compatibilities
  @Post('compatibilities')
  @ApiOperation({ summary: '添加兼容性关联' })
  async addCompatibility(@Body() dto: CreateCompatibilityDto) {
    return this.structureService.addCompatibility(dto)
  }

  @Delete('compatibilities/:id')
  @ApiOperation({ summary: '删除兼容性关联' })
  async removeCompatibility(@Param('id') id: string) {
    await this.structureService.removeCompatibility(id)
    return { message: '兼容性删除成功' }
  }

  @Get(':code/frames')
  @ApiOperation({ summary: '查询结构标准兼容镜框列表（按结构标准编码）' })
  @MCPCapable({
    tool: 'structure.compatibleFrames',
    description: '查询结构标准兼容镜框列表',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async getCompatibleFrames(@Param('code') code: string) {
    return this.structureService.getCompatibleFrames(code)
  }
}
