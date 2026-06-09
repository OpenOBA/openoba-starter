import { Module } from '@nestjs/common'
import { DictConstantsService } from './dict-constants'
import { DictionaryModule } from '../modules/dictionary/dictionary.module'

/**
 * 字典常量缓存模块
 *
 * 在应用启动时从数据库加载所有已注册字典表的数据到内存缓存。
 * 在 AppModule 中引入即可自动初始化。
 */
@Module({
  imports: [DictionaryModule],
  providers: [DictConstantsService],
  exports: [DictConstantsService],
})
export class DictConstantsModule {}
