<script lang="ts">
  import '$lib/styles/global.css'
  import AdminLayout from '../../../../src/routes/admin/+layout.svelte'
  import type { Snippet } from 'svelte'
  interface Props { children: Snippet; data: { user: { id: number; username: string } | null } }
  let { children, data }: Props = $props()
</script>

<AdminLayout {data}>{@render children()}</AdminLayout>
