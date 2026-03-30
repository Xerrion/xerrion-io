import { relations } from 'drizzle-orm'
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp
} from 'drizzle-orm/pg-core'

import type { ImageMetadata } from './image'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const photoSizeKeyEnum = pgEnum('photo_size_key', [
  'thumb',
  'medium',
  'full'
])

export type PhotoSizeKey = (typeof photoSizeKeyEnum.enumValues)[number]

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const adminUser = pgTable('admin_user', {
  id: serial().primaryKey(),
  username: text().notNull().unique(),
  passwordHash: text().notNull(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow()
})

export const category = pgTable('category', {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  sortOrder: integer().notNull().default(0),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow()
})

export const photo = pgTable('photo', {
  id: serial().primaryKey(),
  categoryId: integer()
    .notNull()
    .references(() => category.id, { onDelete: 'cascade' }),
  originalName: text().notNull(),
  metadata: jsonb().$type<ImageMetadata>(),
  uploadedAt: timestamp({ withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow()
})

export const photoSize = pgTable('photo_size', {
  id: serial().primaryKey(),
  photoId: integer()
    .notNull()
    .references(() => photo.id, { onDelete: 'cascade' }),
  size: photoSizeKeyEnum().notNull(),
  r2Key: text().notNull(),
  url: text().notNull(),
  width: integer(),
  height: integer(),
  byteSize: integer()
})

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const categoryRelations = relations(category, ({ many }) => ({
  photos: many(photo)
}))

export const photoRelations = relations(photo, ({ one, many }) => ({
  category: one(category, {
    fields: [photo.categoryId],
    references: [category.id]
  }),
  sizes: many(photoSize)
}))

export const photoSizeRelations = relations(photoSize, ({ one }) => ({
  photo: one(photo, {
    fields: [photoSize.photoId],
    references: [photo.id]
  })
}))

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type AdminUser = typeof adminUser.$inferSelect
export type NewAdminUser = typeof adminUser.$inferInsert

export type Category = typeof category.$inferSelect
export type NewCategory = typeof category.$inferInsert

export type Photo = typeof photo.$inferSelect
export type NewPhoto = typeof photo.$inferInsert

export type PhotoSize = typeof photoSize.$inferSelect
export type NewPhotoSize = typeof photoSize.$inferInsert
