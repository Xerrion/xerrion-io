export interface BlogTag {
  id: number
  slug: string
  name: string
}

export interface BlogPostCard {
  id: number
  slug: string
  title: string
  description: string | null
  coverUrl: string | null
  readingTime: number | null
  publishedAt: string | null
  tags: BlogTag[]
}

export interface BlogPostNavLink {
  slug: string
  title: string
}

export interface BlogPost extends BlogPostCard {
  /** Raw Markdown content */
  content: string
  /** Server-rendered HTML from renderMarkdown() */
  renderedContent: string
  editorMode: 'markdown' | 'tiptap'
  updatedAt: string
  nextPost: BlogPostNavLink | null
  prevPost: BlogPostNavLink | null
}
