<script lang="ts">
  import { enhance } from '$app/forms'
  import { toastStore } from '$lib/stores/toast.svelte'
  import { superForm } from 'sveltekit-superforms'
  import { zod4Client } from 'sveltekit-superforms/adapters'
  import { Field, Control, Label, FieldErrors } from 'formsnap'
  import { tagCreateSchema } from '$lib/schemas/blog'

  let { data } = $props()
  let editingId = $state<number | null>(null)

  // svelte-ignore state_referenced_locally
  const createForm = superForm(data.createForm, {
    validators: zod4Client(tagCreateSchema),
    resetForm: true,
    onResult({ result }) {
      if (result.type === 'success' && result.data?.form?.message) {
        toastStore.success(result.data.form.message as string)
      }
    }
  })
  const {
    form: createFormData,
    enhance: createEnhance,
    submitting: createSubmitting
  } = createForm

  function toggleEdit(id: number | null) {
    editingId = id
  }
</script>

<svelte:head>
  <title>Blog Tags | Admin</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Tags <span class="count">({data.tags.length})</span></h1>
  </header>

  <section class="create-section">
    <h2>Add New Tag</h2>
    <form method="POST" action="?/create" use:createEnhance class="form-row">
      <Field form={createForm} name="name">
        <Control>
          {#snippet children({ props })}
            <div class="field">
              <Label>Name</Label>
              <input
                {...props}
                type="text"
                placeholder="e.g. SvelteKit"
                bind:value={$createFormData.name}
                disabled={$createSubmitting}
              />
            </div>
          {/snippet}
        </Control>
        <FieldErrors />
      </Field>
      <div class="form-action">
        <button type="submit" class="btn primary" disabled={$createSubmitting}>
          {$createSubmitting ? 'Creating...' : 'Create Tag'}
        </button>
      </div>
    </form>
  </section>

  <section class="list-section">
    {#if data.tags.length === 0}
      <div class="empty-state">
        <p>No tags yet. Create one above.</p>
      </div>
    {:else}
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Posts</th>
              <th>Created</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each data.tags as tag (tag.id)}
              <tr class:editing={editingId === tag.id}>
                {#if editingId === tag.id}
                  <td colspan="5" class="edit-cell">
                    <form
                      method="POST"
                      action="?/update"
                      use:enhance={() => {
                        return async ({ result, update }) => {
                          if (result.type === 'success')
                            toastStore.success('Tag updated')
                          else if (result.type === 'failure')
                            toastStore.error(
                              (result.data?.error as string) ||
                                'Failed to update'
                            )
                          await update()
                          editingId = null
                        }
                      }}
                      class="edit-form"
                    >
                      <input type="hidden" name="id" value={tag.id} />
                      <div class="edit-fields">
                        <div class="field-mini grow">
                          <label for="edit-name-{tag.id}">Name</label>
                          <input
                            type="text"
                            id="edit-name-{tag.id}"
                            name="name"
                            value={tag.name}
                            required
                          />
                        </div>
                        <div class="edit-actions">
                          <button type="submit" class="btn primary small"
                            >Save</button
                          >
                          <button
                            type="button"
                            class="btn text small"
                            onclick={() => toggleEdit(null)}>Cancel</button
                          >
                        </div>
                      </div>
                    </form>
                  </td>
                {:else}
                  <td class="tag-name">{tag.name}</td>
                  <td><code class="slug-code">{tag.slug}</code></td>
                  <td>{tag.postCount}</td>
                  <td>{new Date(tag.createdAt).toLocaleDateString()}</td>
                  <td class="row-actions">
                    <button
                      class="btn icon"
                      title="Edit"
                      onclick={() => toggleEdit(tag.id)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><path
                          d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                        /><path
                          d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                        /></svg
                      >
                    </button>
                    <form
                      method="POST"
                      action="?/delete"
                      use:enhance={() => {
                        return async ({ result, update }) => {
                          if (result.type === 'success')
                            toastStore.success('Tag deleted')
                          else if (result.type === 'failure')
                            toastStore.error(
                              (result.data?.error as string) ||
                                'Failed to delete'
                            )
                          await update()
                        }
                      }}
                      onsubmit={(e) =>
                        !confirm('Delete this tag?') && e.preventDefault()}
                    >
                      <input type="hidden" name="id" value={tag.id} />
                      <button
                        type="submit"
                        class="btn icon danger"
                        title="Delete"
                        disabled={tag.postCount > 0}
                        aria-label="Delete tag"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          ><polyline points="3 6 5 6 21 6" /><path
                            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                          /></svg
                        >
                      </button>
                    </form>
                  </td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</div>

<style>
  .page {
    max-width: 900px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-8);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .page-header h1 {
    font-size: var(--text-2xl);
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
  }

  .count {
    color: var(--color-text-secondary);
    font-weight: 400;
    font-size: var(--text-lg);
  }

  .create-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    margin-bottom: var(--space-6);
  }

  .create-section h2 {
    font-size: var(--text-base);
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 var(--space-4) 0;
  }

  .form-row {
    display: flex;
    gap: var(--space-4);
    align-items: flex-end;
  }

  .form-action {
    flex-shrink: 0;
    padding-bottom: 1px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    flex: 1;
  }

  .field :global(label) {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .field input {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: var(--text-sm);
    width: 100%;
  }

  .field input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px
      color-mix(in oklch, var(--color-primary) 20%, transparent);
  }

  .empty-state {
    text-align: center;
    padding: var(--space-12);
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    border: 1px dashed var(--color-border);
    color: var(--color-text-secondary);
  }

  .table-container {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  thead tr {
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
  }

  th {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    font-weight: 600;
    color: var(--color-text-secondary);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
    vertical-align: middle;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover:not(.editing) {
    background: var(--color-surface-hover);
  }

  .tag-name {
    font-weight: 500;
  }

  .slug-code {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    background: var(--color-bg-secondary);
    padding: 2px var(--space-2);
    border-radius: var(--radius-sm);
  }

  .actions-col {
    width: 100px;
  }

  .row-actions {
    display: flex;
    gap: var(--space-1);
    align-items: center;
  }

  .row-actions form {
    display: contents;
  }

  .edit-cell {
    padding: var(--space-3) var(--space-4);
    background: color-mix(in oklch, var(--color-primary) 5%, transparent);
  }

  .edit-form {
    width: 100%;
  }

  .edit-fields {
    display: flex;
    gap: var(--space-4);
    align-items: flex-end;
  }

  .field-mini {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .field-mini label {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .field-mini input {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: var(--text-sm);
  }

  .field-mini.grow {
    flex: 1;
  }

  .edit-actions {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }
</style>
