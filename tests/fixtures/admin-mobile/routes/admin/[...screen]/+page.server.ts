import { superValidate } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  loginSchema
} from '$lib/schemas/admin'
import {
  postCreateSchema,
  postUpdateSchema,
  tagCreateSchema,
  tagUpdateSchema
} from '$lib/schemas/blog'

const date = '2026-09-30T12:00:00.000Z'
const longName = 'A long name that must remain readable on a small phone screen'
const image =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="lightgray"/></svg>'
  )
const tag = {
  id: 1,
  name: longName,
  slug: 'a-very-long-tag-slug-without-shortening',
  postCount: 1,
  createdAt: date
}
const category = {
  id: 1,
  name: longName,
  slug: 'a-very-long-category-slug',
  description: longName,
  sortOrder: 0,
  createdAt: date
}
const post = {
  id: 1,
  title: longName,
  slug: 'a-very-long-blog-post-slug-that-cannot-overflow',
  description: 'An existing description.',
  content:
    '# Existing content\n\nA paragraph with a long URL: https://example.com/' +
    'long'.repeat(40),
  status: 'draft' as const,
  tagIds: [1],
  coverUrl: image,
  coverR2Key: '',
  coverR2KeyFull: '',
  readingTime: 1,
  publishedAt: null,
  createdAt: date,
  updatedAt: date,
  tagCount: 1
}

export async function load({
  params,
  url
}: {
  params: { screen?: string }
  url: URL
}) {
  const screen = params.screen ?? ''
  return {
    screen,
    user: screen === 'login' ? null : { id: 1, username: 'UI test' },
    posts: url.searchParams.has('empty') ? [] : [post],
    post,
    tags: url.searchParams.has('empty') ? [] : [tag],
    categories: [category],
    photos: url.searchParams.has('empty')
      ? []
      : [
          {
            id: 1,
            categoryId: 1,
            categoryName: longName,
            categorySlug: category.slug,
            originalName:
              'a-very-long-photo-filename-for-mobile-layout-testing.jpg',
            width: 800,
            height: 600,
            fullSize: 2400000,
            mediumSize: 120000,
            thumbSize: 20000,
            fullUrl: image,
            mediumUrl: image,
            thumbUrl: image,
            uploadedAt: date,
            metadata: null
          }
        ],
    loginForm: await superValidate(zod4(loginSchema)),
    newPostForm: await superValidate(zod4(postCreateSchema)),
    editPostForm: await superValidate(
      {
        ...post,
        existingCoverR2Key: '',
        existingCoverR2KeyFull: ''
      },
      zod4(postUpdateSchema)
    ),
    tagCreateForm: await superValidate(zod4(tagCreateSchema)),
    tagUpdateForm: await superValidate(tag, zod4(tagUpdateSchema)),
    categoryCreateForm: await superValidate(zod4(categoryCreateSchema)),
    categoryUpdateForm: await superValidate(
      category,
      zod4(categoryUpdateSchema)
    ),
    usePocketId: !url.searchParams.has('password'),
    loginError: null
  }
}
