import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MeiliSearch, { Index } from 'meilisearch';

export interface ProductSearchDocument {
  id: string;
  sku: string;
  nameTh: string;
  nameEn?: string;
  genericName?: string;
  brand?: string;
  manufacturer?: string;
  categoryId?: string;
  drugClassification?: string;
  requiresPrescription: boolean;
  requiresPharmacist: boolean;
  dosageForm?: string;
  strength?: string;
  shortDescription?: string;
  tags: string[];
  searchKeywords?: string[];
  sellPrice?: number;
  status: string;
  isFeatured: boolean;
  images: unknown[];
}

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private client!: MeiliSearch;
  private index!: Index<ProductSearchDocument>;
  private readonly INDEX_NAME = 'products';

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const host = this.config.get<string>('meilisearch.host') ?? 'http://localhost:7700';
    const apiKey = this.config.get<string>('meilisearch.apiKey') ?? '';

    this.client = new MeiliSearch({ host, apiKey });
    this.index = this.client.index<ProductSearchDocument>(this.INDEX_NAME);

    try {
      await this.setupIndex();
    } catch (err) {
      this.logger.warn(`Meilisearch setup skipped (not available): ${(err as Error).message}`);
    }
  }

  private async setupIndex() {
    const indexes = await this.client.getIndexes();
    const exists = indexes.results.some((i: { uid: string }) => i.uid === this.INDEX_NAME);

    if (!exists) {
      await this.client.createIndex(this.INDEX_NAME, { primaryKey: 'id' });
      this.logger.log(`Created Meilisearch index: ${this.INDEX_NAME}`);
    }

    await this.index.updateSettings({
      searchableAttributes: [
        'nameTh',
        'nameEn',
        'genericName',
        'brand',
        'tags',
        'searchKeywords',
        'shortDescription',
        'sku',
      ],
      filterableAttributes: [
        'categoryId',
        'requiresPrescription',
        'requiresPharmacist',
        'drugClassification',
        'status',
        'isFeatured',
      ],
      sortableAttributes: ['sellPrice', 'isFeatured'],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
      ],
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
      },
    });

    this.logger.log('Meilisearch index settings updated');
  }

  async indexProduct(product: ProductSearchDocument) {
    try {
      await this.index.addDocuments([product]);
    } catch (err) {
      this.logger.warn(`Failed to index product ${product.id}: ${(err as Error).message}`);
    }
  }

  async indexProducts(products: ProductSearchDocument[]) {
    if (products.length === 0) return;
    try {
      await this.index.addDocuments(products, { primaryKey: 'id' });
      this.logger.log(`Indexed ${products.length} products to Meilisearch`);
    } catch (err) {
      this.logger.warn(`Failed to bulk index products: ${(err as Error).message}`);
    }
  }

  async deleteProduct(id: string) {
    try {
      await this.index.deleteDocument(id);
    } catch (err) {
      this.logger.warn(`Failed to delete product ${id} from index: ${(err as Error).message}`);
    }
  }

  async search(
    query: string,
    options: {
      filter?: string;
      sort?: string[];
      limit?: number;
      offset?: number;
    } = {},
  ) {
    try {
      return await this.index.search(query, {
        limit: options.limit ?? 20,
        offset: options.offset ?? 0,
        filter: options.filter,
        sort: options.sort,
        attributesToHighlight: ['nameTh', 'nameEn', 'genericName'],
      });
    } catch (err) {
      this.logger.warn(`Meilisearch search failed: ${(err as Error).message}`);
      return { hits: [], estimatedTotalHits: 0, query, limit: 20, offset: 0 };
    }
  }
}
