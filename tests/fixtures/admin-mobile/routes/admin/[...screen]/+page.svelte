<script lang="ts">
  import type { load } from './+page.server'
  import Dashboard from '../../../../../../src/routes/admin/+page.svelte'
  import Posts from '../../../../../../src/routes/admin/blog/+page.svelte'
  import NewPost from '../../../../../../src/routes/admin/blog/new/+page.svelte'
  import EditPost from '../../../../../../src/routes/admin/blog/[id]/+page.svelte'
  import Tags from '../../../../../../src/routes/admin/blog/tags/+page.svelte'
  import Gallery from '../../../../../../src/routes/admin/gallery/+page.svelte'
  import Categories from '../../../../../../src/routes/admin/gallery/categories/+page.svelte'
  import Upload from '../../../../../../src/routes/admin/gallery/upload/+page.svelte'
  import Login from '../../../../../../src/routes/admin/login/+page.svelte'

  interface Props {
    data: Awaited<ReturnType<typeof load>>
  }
  let { data }: Props = $props()
</script>

{#key data.screen}
  {#if data.screen === 'blog'}
    <Posts {data} />
  {:else if data.screen === 'blog/new'}
    <NewPost data={{ ...data, form: data.newPostForm }} />
  {:else if data.screen === 'blog/1'}
    <EditPost data={{ ...data, form: data.editPostForm }} />
  {:else if data.screen === 'blog/tags'}
    <Tags data={{ ...data, createForm: data.tagCreateForm, updateForm: data.tagUpdateForm }} />
  {:else if data.screen === 'gallery'}
    <Gallery {data} />
  {:else if data.screen === 'gallery/categories'}
    <Categories data={{ ...data, createForm: data.categoryCreateForm, updateForm: data.categoryUpdateForm }} />
  {:else if data.screen === 'gallery/upload'}
    <Upload {data} />
  {:else if data.screen === 'login'}
    <Login data={{ ...data, form: data.loginForm }} />
  {:else}
    <Dashboard {data} />
  {/if}
{/key}
