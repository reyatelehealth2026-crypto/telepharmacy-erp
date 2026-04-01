import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, desc, sql, ilike, arrayContains } from 'drizzle-orm';
import { content } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import type { CreateContentDto } from './dto/create-content.dto';
import type { UpdateContentDto } from './dto/update-content.dto';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async create(dto: CreateContentDto, authorId: string) {
    const existing = await this.db.query.content.findFirst({
      where: eq(content.slug, dto.slug),
    });
    if (existing) {
      throw new ConflictException('Slug นี้ถูกใช้แล้ว');
    }

    const [item] = await this.db
      .insert(content)
      .values({
        type: dto.type,
        titleTh: dto.titleTh,
        titleEn: dto.titleEn ?? null,
        slug: dto.slug,
        body: dto.body ?? null,
        excerpt: dto.excerpt ?? null,
        tags: dto.tags ?? [],
        seoKeywords: dto.seoKeywords ?? [],
        metaTitle: dto.metaTitle ?? null,
        metaDescription: dto.metaDescription ?? null,
        featuredImageUrl: dto.featuredImageUrl ?? null,
        relatedProductIds: dto.relatedProductIds ?? [],
        status: 'draft',
        authorId,
      })
      .returning();

    this.logger.log(`Content "${dto.slug}" created by staff ${authorId}`);
    return { success: true, data: item };
  }

  async update(id: string, dto: UpdateContentDto) {
    await this.findOneEntity(id);

    if (dto.slug) {
      const existing = await this.db.query.content.findFirst({
        where: and(eq(content.slug, dto.slug), sql`${content.id} != ${id}`),
      });
      if (existing) {
        throw new ConflictException('Slug นี้ถูกใช้แล้ว');
      }
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.titleTh !== undefined) updateData.titleTh = dto.titleTh;
    if (dto.titleEn !== undefined) updateData.titleEn = dto.titleEn;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.body !== undefined) updateData.body = dto.body;
    if (dto.excerpt !== undefined) updateData.excerpt = dto.excerpt;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.seoKeywords !== undefined) updateData.seoKeywords = dto.seoKeywords;
    if (dto.metaTitle !== undefined) updateData.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined) updateData.metaDescription = dto.metaDescription;
    if (dto.featuredImageUrl !== undefined) updateData.featuredImageUrl = dto.featuredImageUrl;
    if (dto.relatedProductIds !== undefined) updateData.relatedProductIds = dto.relatedProductIds;

    const [updated] = await this.db
      .update(content)
      .set(updateData)
      .where(eq(content.id, id))
      .returning();

    return { success: true, data: updated };
  }

  async publish(id: string) {
    await this.findOneEntity(id);
    const [updated] = await this.db
      .update(content)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(content.id, id))
      .returning();
    return { success: true, data: updated };
  }

  async unpublish(id: string) {
    await this.findOneEntity(id);
    const [updated] = await this.db
      .update(content)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(content.id, id))
      .returning();
    return { success: true, data: updated };
  }

  async findAll(filters: {
    type?: string;
    tags?: string;
    q?: string;
    page?: number;
    limit?: number;
    publishedOnly?: boolean;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters.publishedOnly) {
      conditions.push(eq(content.status, 'published'));
    }
    if (filters.type) {
      conditions.push(eq(content.type, filters.type as any));
    }
    if (filters.tags) {
      const tagList = filters.tags.split(',').map((t) => t.trim());
      conditions.push(arrayContains(content.tags, tagList));
    }
    if (filters.q) {
      conditions.push(
        sql`(${content.titleTh} ILIKE ${'%' + filters.q + '%'} OR ${content.titleEn} ILIKE ${'%' + filters.q + '%'} OR ${content.body} ILIKE ${'%' + filters.q + '%'})`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await this.db
      .select()
      .from(content)
      .where(whereClause)
      .orderBy(desc(content.createdAt))
      .limit(limit)
      .offset(offset);

    return { success: true, data, meta: { page, limit } };
  }

  async findBySlug(slug: string) {
    const item = await this.db.query.content.findFirst({
      where: and(eq(content.slug, slug), eq(content.status, 'published')),
    });
    if (!item) {
      throw new NotFoundException('ไม่พบบทความ');
    }
    return { success: true, data: item };
  }

  async incrementViewCount(id: string) {
    await this.findOneEntity(id);
    await this.db
      .update(content)
      .set({ viewCount: sql`${content.viewCount} + 1` })
      .where(eq(content.id, id));
    return { success: true };
  }

  async findOne(id: string) {
    const item = await this.findOneEntity(id);
    return { success: true, data: item };
  }

  async delete(id: string) {
    await this.findOneEntity(id);
    await this.db.delete(content).where(eq(content.id, id));
    return { success: true, message: 'ลบบทความเรียบร้อย' };
  }

  private async findOneEntity(id: string) {
    const item = await this.db.query.content.findFirst({
      where: eq(content.id, id),
    });
    if (!item) {
      throw new NotFoundException('ไม่พบบทความ');
    }
    return item;
  }
}
