import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ProductSpu } from '../product/entity/product-spu.entity';
import { ProductSku } from '../product/entity/product-sku.entity';
import { ProductCategory } from '../product/entity/product-category.entity';

@Injectable()
export class WebsiteCatalogService {
  constructor(
    @InjectRepository(ProductSpu) private spuRepo: Repository<ProductSpu>,
    @InjectRepository(ProductSku) private skuRepo: Repository<ProductSku>,
    @InjectRepository(ProductCategory) private catRepo: Repository<ProductCategory>,
  ) {}

  async getHome() {
    const featured = await this.getFeaturedProducts(8);
    const bestsellers = await this.getBestsellers(8);
    const newArrivals = await this.getNewArrivals(8);
    return { featured, bestsellers, newArrivals };
  }

  private async getFeaturedProducts(limit: number) {
    const spus = await this.spuRepo.find({
      where: { status: 'on_sale', isDeleted: false } as any,
      take: limit,
      order: { createdAt: 'DESC' } as any,
    });
    return this.mapSpuCards(spus as any);
  }

  private async getBestsellers(limit: number) {
    const spus = await this.spuRepo.find({
      where: { status: 'on_sale', isDeleted: false } as any,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return this.mapSpuCards(spus as any);
  }

  private async getNewArrivals(limit: number) {
    const spus = await this.spuRepo.find({
      where: { status: 'on_sale', isDeleted: false } as any,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return this.mapSpuCards(spus as any);
  }

  async getCatalog(query: any) {
    const { page = 1, pageSize = 20, categoryId, gender, status = 'on_sale', sort = 'newest' } = query;
    const qb = this.spuRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.category', 'cat')
      .where('s.status = :st', { st: status })
      .andWhere('s.isDeleted = :del', { del: false });
    if (categoryId) qb.andWhere('cat.categoryId = :cid', { cid: categoryId });
    if (gender) qb.andWhere('s.gender = :g', { g: gender });
    qb.orderBy(sort === 'price_asc' ? 's.retailPrice' : 's.createdAt', sort === 'price_asc' ? 'ASC' : 'DESC');
    const [items, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items: await this.mapSpuCards(items as any), total };
  }

  async search(query: any) {
    const { keyword, page = 1, pageSize = 20 } = query;
    const qb = this.spuRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.category', 'cat')
      .where('s.status = :st', { st: 'on_sale' })
      .andWhere('s.isDeleted = :del', { del: false })
      .andWhere('(s.spu_name LIKE :kw OR s.spu_code LIKE :kw)', { kw: `%${keyword}%` });
    const [items, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items: await this.mapSpuCards(items as any), total, keyword };
  }

  private async mapSpuCards(spus: any[]): Promise<any[]> {
    return spus.map((spu: any) => ({
      spuId: spu.spuId,
      spuCode: spu.spuCode,
      spuName: spu.spuName,
      primaryImage: spu.mainImage,
      retailPrice: spu.retailPrice,
      gender: spu.gender,
      category: spu.category?.categoryName || null,
      productTier: spu.productTier,
      sceneTags: spu.sceneTags,
    }));
  }
}
