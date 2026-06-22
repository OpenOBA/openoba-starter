/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mock 生态刚需，mockImplementation 回调需要 any 绕过类型推断缺陷 */
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ColorService } from './color.service'
import { ColorMaterialMapping } from './entity/color-material-mapping.entity'
import { ColorSeasonalPalette } from './entity/color-seasonal-palette.entity'
import { ColorPaletteItem } from './entity/color-palette-item.entity'
import { ColorDesignProject } from './entity/color-design-project.entity'
import { ColorProjectColor } from './entity/color-project-color.entity'

function mockRepo() {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn().mockResolvedValue(null),
    getMany: jest.fn().mockResolvedValue([]),
  }
  return {
    create: jest.fn((d: any) => d),
    save: jest.fn((e: any) => Promise.resolve({ ...e, id: 'new-id' })),
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    count: jest.fn().mockResolvedValue(0),
  }
}

describe('ColorService', () => {
  let service: ColorService
  let mappingRepo: ReturnType<typeof mockRepo>
  let paletteRepo: ReturnType<typeof mockRepo>
  let paletteItemRepo: ReturnType<typeof mockRepo>
  let projectRepo: ReturnType<typeof mockRepo>
  let projectColorRepo: ReturnType<typeof mockRepo>

  beforeEach(async () => {
    mappingRepo = mockRepo()
    paletteRepo = mockRepo()
    paletteItemRepo = mockRepo()
    projectRepo = mockRepo()
    projectColorRepo = mockRepo()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColorService,
        { provide: getRepositoryToken(ColorMaterialMapping), useValue: mappingRepo },
        { provide: getRepositoryToken(ColorSeasonalPalette), useValue: paletteRepo },
        { provide: getRepositoryToken(ColorPaletteItem), useValue: paletteItemRepo },
        { provide: getRepositoryToken(ColorDesignProject), useValue: projectRepo },
        { provide: getRepositoryToken(ColorProjectColor), useValue: projectColorRepo },
      ],
    }).compile()

    service = module.get<ColorService>(ColorService)
  })

  describe('findAllMappings', () => {
    it('should return paginated mappings', async () => {
      const result = await service.findAllMappings({} as any)
      expect(result).toBeDefined()
      expect(result.items).toBeDefined()
    })
  })

  describe('createMapping', () => {
    it('should create a mapping', async () => {
      mappingRepo.findOne.mockResolvedValue(null)
      const result = await service.createMapping({
        colorCode: '#FF0000',
        colorName: 'Red',
        rValue: 255,
        gValue: 0,
        bValue: 0,
        colorType: 'solid',
        materialType: 'acetate',
      } as any)
      expect(result).toBeDefined()
      expect(mappingRepo.save).toHaveBeenCalled()
    })
  })

  describe('findOneMapping', () => {
    it('should throw on missing', async () => {
      await expect(service.findOneMapping('bad')).rejects.toThrow()
    })
  })

  describe('findAllPalettes', () => {
    it('should return palettes', async () => {
      const result = await service.findAllPalettes({} as any)
      expect(result).toBeDefined()
    })
  })

  describe('createPalette', () => {
    it('should create palette', async () => {
      const result = await service.createPalette({
        paletteName: 'Spring 2026',
        season: 'spring',
        year: 2026,
      } as any)
      expect(result).toBeDefined()
    })
  })
})
