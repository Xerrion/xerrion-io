<script lang="ts">
  import { motion } from '@humanspeak/svelte-motion'

  let { data } = $props()
</script>

<svelte:head>
  <title>Admin Dashboard | Xerrion</title>
</svelte:head>

<div class="dashboard">
  <motion.header
    class="dashboard-header"
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <h1>Dashboard</h1>
    <p class="greeting">Welcome back, {data.user?.username}</p>
  </motion.header>

  <motion.section
    class="action-group"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay: 0.05 }}
  >
    <h2 class="action-group-title">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle
          cx="9"
          cy="9"
          r="2"
        /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg
      >
      Gallery
    </h2>
    <div class="quick-actions">
      <motion.a
        href="/admin/gallery"
        class="action-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        whileHover={{ y: -4, transition: { duration: 0.15 } }}
        whileTap={{ scale: 0.98 }}
      >
        <div class="action-icon gallery">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle
              cx="9"
              cy="9"
              r="2"
            /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg
          >
        </div>
        <h3>Photos</h3>
        <p>View and manage uploaded photos</p>
      </motion.a>

      <motion.a
        href="/admin/gallery/upload"
        class="action-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        whileHover={{ y: -4, transition: { duration: 0.15 } }}
        whileTap={{ scale: 0.98 }}
      >
        <div class="action-icon upload">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
              points="17 8 12 3 7 8"
            /><line x1="12" x2="12" y1="3" y2="15" /></svg
          >
        </div>
        <h3>Upload</h3>
        <p>Add new photos to the gallery</p>
      </motion.a>

      <motion.a
        href="/admin/gallery/categories"
        class="action-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
        whileHover={{ y: -4, transition: { duration: 0.15 } }}
        whileTap={{ scale: 0.98 }}
      >
        <div class="action-icon categories">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path
              d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"
            /></svg
          >
        </div>
        <h3>Categories</h3>
        <p>Create and organize categories</p>
      </motion.a>
    </div>
  </motion.section>

  <motion.section
    class="action-group"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay: 0.45 }}
  >
    <h2 class="action-group-title">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><path
          d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
        /><polyline points="14 2 14 8 20 8" /><line
          x1="16"
          y1="13"
          x2="8"
          y2="13"
        /><line x1="16" y1="17" x2="8" y2="17" /><polyline
          points="10 9 9 9 8 9"
        /></svg
      >
      Blog
    </h2>
    <div class="quick-actions">
      <motion.a
        href="/admin/blog"
        class="action-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.5 }}
        whileHover={{ y: -4, transition: { duration: 0.15 } }}
        whileTap={{ scale: 0.98 }}
      >
        <div class="action-icon blog-posts">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><line x1="8" y1="6" x2="21" y2="6" /><line
              x1="8"
              y1="12"
              x2="21"
              y2="12"
            /><line x1="8" y1="18" x2="21" y2="18" /><line
              x1="3"
              y1="6"
              x2="3.01"
              y2="6"
            /><line x1="3" y1="12" x2="3.01" y2="12" /><line
              x1="3"
              y1="18"
              x2="3.01"
              y2="18"
            /></svg
          >
        </div>
        <h3>Posts</h3>
        <p>View and manage blog posts</p>
      </motion.a>

      <motion.a
        href="/admin/blog/new"
        class="action-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.6 }}
        whileHover={{ y: -4, transition: { duration: 0.15 } }}
        whileTap={{ scale: 0.98 }}
      >
        <div class="action-icon blog-new">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path
              d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
            /><polyline points="14 2 14 8 20 8" /><line
              x1="12"
              y1="18"
              x2="12"
              y2="12"
            /><line x1="9" y1="15" x2="15" y2="15" /></svg
          >
        </div>
        <h3>New Post</h3>
        <p>Write a new blog post</p>
      </motion.a>

      <motion.a
        href="/admin/blog/tags"
        class="action-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.7 }}
        whileHover={{ y: -4, transition: { duration: 0.15 } }}
        whileTap={{ scale: 0.98 }}
      >
        <div class="action-icon blog-tags">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path
              d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
            /><line x1="7" y1="7" x2="7.01" y2="7" /></svg
          >
        </div>
        <h3>Tags</h3>
        <p>Manage blog tags</p>
      </motion.a>
    </div>
  </motion.section>

  <motion.section
    class="action-group"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay: 0.8 }}
  >
    <h2 class="action-group-title">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path
          d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
        /></svg
      >
      Quick Links
    </h2>
    <div class="quick-actions">
      <motion.a
        href="/"
        class="action-card"
        target="_blank"
        rel="noopener"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.85 }}
        whileHover={{ y: -4, transition: { duration: 0.15 } }}
        whileTap={{ scale: 0.98 }}
      >
        <div class="action-icon site">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path
              d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
            /></svg
          >
        </div>
        <h3>View Site</h3>
        <p>Open the public website</p>
      </motion.a>
    </div>
  </motion.section>
</div>

<style>
  :global(.dashboard-header) {
    margin-bottom: var(--space-8);
  }

  :global(.dashboard-header) h1 {
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .greeting {
    color: var(--color-text-muted);
    margin-top: var(--space-2);
    font-size: var(--text-base);
  }

  .quick-actions {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--space-5);
  }

  :global(.action-group) {
    margin-bottom: var(--space-8);
  }

  .action-group-title {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 var(--space-4) 0;
  }

  :global(.action-card) {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    padding: var(--space-6);
    text-decoration: none;
    color: var(--color-text);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  :global(.action-card:hover) {
    border-color: var(--color-border-hover);
    box-shadow: var(--shadow-md);
  }

  .action-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-icon.upload {
    background: color-mix(in oklch, var(--color-primary) 10%, transparent);
    color: var(--color-primary);
  }

  .action-icon.gallery {
    background: color-mix(in oklch, var(--color-accent) 15%, transparent);
    color: var(--color-accent);
  }

  .action-icon.categories {
    background: color-mix(in oklch, var(--color-info) 10%, transparent);
    color: var(--color-info);
  }

  .action-icon.site {
    background: color-mix(in oklch, var(--color-primary) 10%, transparent);
    color: var(--color-primary-light);
  }

  .action-icon.blog-posts {
    background: color-mix(in oklch, var(--color-primary) 10%, transparent);
    color: var(--color-primary);
  }

  .action-icon.blog-new {
    background: color-mix(in oklch, var(--color-accent) 15%, transparent);
    color: var(--color-accent);
  }

  .action-icon.blog-tags {
    background: color-mix(in oklch, var(--color-warning) 15%, transparent);
    color: var(--color-warning-muted);
  }

  :global(.action-card) h3 {
    font-size: var(--text-base);
    font-weight: 600;
    margin: 0;
  }

  :global(.action-card) p {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin: 0;
  }
</style>
