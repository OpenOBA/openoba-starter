import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Get, Param, Res, UseGuards } from '@nestjs/common'
import * as crypto from 'crypto'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { Response } from 'express'
import { existsSync, mkdirSync } from 'fs'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

const PRODUCT_IMAGE_DIR = join(process.cwd(), 'uploads', 'product-images')
const KNOWLEDGE_DIR = join(process.cwd(), 'uploads', 'knowledge')

if (!existsSync(KNOWLEDGE_DIR)) mkdirSync(KNOWLEDGE_DIR, { recursive: true })

const ALLOWED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']
const ALLOWED_KB_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv', '.json', '.xml']

@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {

  // ══════════════════════════════════════
  // 通用单文件上传（知识库附件等）
  // ══════════════════════════════════════

  @Post('single')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: KNOWLEDGE_DIR,
        filename: (req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase()
          const timestamp = Date.now()
          const random = crypto.randomUUID().replace(/-/g, '').substring(0, 8)
          cb(null, `kb_${timestamp}_${random}${ext}`)
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase()
        if (!ALLOWED_KB_TYPES.includes(ext)) {
          return cb(new BadRequestException(`不支持的文件类型: ${ext}`), false)
        }
        cb(null, true)
      },
    }),
  )
  uploadSingle(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择要上传的文件')
    return {
      url: `/uploads/knowledge/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    }
  }

  // ══════════════════════════════════════
  // 商品图片上传
  // ══════════════════════════════════════

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: PRODUCT_IMAGE_DIR,
        filename: (req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase()
          const timestamp = Date.now()
          const random = crypto.randomUUID().replace(/-/g, '').substring(0, 8)
          const filename = `img_${timestamp}_${random}${ext}`
          cb(null, filename)
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase()
        if (!ALLOWED_IMAGE_TYPES.includes(ext)) {
          return cb(new BadRequestException(`不支持的文件类型: ${ext}，仅支持 ${ALLOWED_IMAGE_TYPES.join(', ')}`), false)
        }
        cb(null, true)
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择要上传的图片')
    return {
      url: `/uploads/product-images/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      width: null,
      height: null,
    }
  }

  @Post('images-batch')
  @UseInterceptors(
    FileInterceptor('files', {
      storage: diskStorage({
        destination: PRODUCT_IMAGE_DIR,
        filename: (req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase()
          const timestamp = Date.now()
          const random = crypto.randomUUID().replace(/-/g, '').substring(0, 8)
          const filename = `img_${timestamp}_${random}${ext}`
          cb(null, filename)
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase()
        if (!ALLOWED_IMAGE_TYPES.includes(ext)) {
          return cb(new BadRequestException(`不支持的文件类型: ${ext}`), false)
        }
        cb(null, true)
      },
    }),
  )
  uploadImagesBatch(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择要上传的图片')
    return {
      url: `/uploads/product-images/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    }
  }
}