<script lang="ts">
  import type { Snippet } from 'svelte'

  import PublicShell from '$lib/components/PublicShell.svelte'

  interface Props { children: Snippet }
  let { children }: Props = $props()
</script>

<PublicShell>{@render children()}</PublicShell>
