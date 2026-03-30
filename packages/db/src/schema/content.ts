import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { contentTypeEnum } from "./enums";
import { staff } from "./staff";

export const content = pgTable("content", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: contentTypeEnum("type").default("health_article"),
  titleTh: varchar("title_th", { length: 255 }).notNull(),
  titleEn: varchar("title_en", { length: 255 }),
  slug: varchar("slug", { length: 300 }).unique().notNull(),
  body: text("body"),
  excerpt: text("excerpt"),
  relatedProductIds: text("related_product_ids").array().default([]),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  tags: text("tags").array().default([]),
  seoKeywords: text("seo_keywords").array().default([]),
  featuredImageUrl: text("featured_image_url"),
  status: varchar("status", { length: 20 }).default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  authorId: uuid("author_id").references(() => staff.id),
  viewCount: integer("view_count").default(0).notNull(),
  shareCount: integer("share_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
