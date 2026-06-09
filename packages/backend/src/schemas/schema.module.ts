// ============================================
// Schema 模块 — AI-BOS V2.0
// ============================================

import { Global, Module } from '@nestjs/common'
import { SchemaResolver } from './schema-resolver.service'
import { SchemaController } from '../modules/schema/schema.controller'

@Global()
@Module({
  controllers: [SchemaController],
  providers: [SchemaResolver],
  exports: [SchemaResolver],
})
export class SchemaModule {}
