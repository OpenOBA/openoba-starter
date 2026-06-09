import { Module } from '@nestjs/common'
import { DictionaryService } from './dict.service'
import { DictController } from './dict.controller'

@Module({
  controllers: [DictController],
  providers: [DictionaryService],
  exports: [DictionaryService],
})
export class DictionaryModule {}
