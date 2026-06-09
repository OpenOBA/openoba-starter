import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ColorMaterialMapping } from './entity/color-material-mapping.entity'
import { ColorSeasonalPalette } from './entity/color-seasonal-palette.entity'
import { ColorPaletteItem } from './entity/color-palette-item.entity'
import { ColorDesignProject } from './entity/color-design-project.entity'
import { ColorProjectColor } from './entity/color-project-color.entity'
import { ColorController } from './color.controller'
import { ColorService } from './color.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([ColorMaterialMapping, ColorSeasonalPalette, ColorPaletteItem, ColorDesignProject, ColorProjectColor]),
  ],
  controllers: [ColorController],
  providers: [ColorService],
  exports: [ColorService],
})
export class ColorModule {}
