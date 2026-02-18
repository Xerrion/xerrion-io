<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { superForm } from 'sveltekit-superforms';
  import { zod4Client } from 'sveltekit-superforms/adapters';
  import { Field, Control, Label, FieldErrors } from 'formsnap';
  import { categoryCreateSchema } from '$lib/schemas/admin';

  let { data } = $props();
  let editingId = $state<number | null>(null);

  // svelte-ignore state_referenced_locally — superForm captures the initial value intentionally
  const createForm = superForm(data.createForm, {
    validators: zod4Client(categoryCreateSchema),
    resetForm: true
  });
  const { form: createFormData, enhance: createEnhance, submitting: createSubmitting, message: createMessage } = createForm;

  function toggleEdit(id: number | null) {
    editingId = id;
  }
</script>

<div class="page">
  <header class="header">
    <h1>Categories <span class="count">({data.categories.length})</span></h1>
    {#if page.form?.error}
      <p class="message error">{page.form.error}</p>
    {/if}
    {#if page.form?.success}
      <p class="message success">Success</p>
    {/if}
    {#if $createMessage}
      <p class="message success">{$createMessage}</p>
    {/if}
  </header>

  <section class="create-section">
    <h2>Add New Category</h2>
    <form method="POST" action="?/create" use:createEnhance class="form-grid">
      <Field form={createForm} name="name">
        <Control>
          {#snippet children({ props })}
            <div class="field">
              <Label>Name</Label>
              <input 
                {...props}
                type="text" 
                placeholder="e.g. Landscapes"
                bind:value={$createFormData.name}
                disabled={$createSubmitting}
              />
            </div>
          {/snippet}
        </Control>
        <FieldErrors />
      </Field>
      
      <Field form={createForm} name="sortOrder">
        <Control>
          {#snippet children({ props })}
            <div class="field">
              <Label>Sort Order</Label>
              <input 
                {...props}
                type="number" 
                bind:value={$createFormData.sortOrder}
                disabled={$createSubmitting}
              />
            </div>
          {/snippet}
        </Control>
        <FieldErrors />
      </Field>

      <Field form={createForm} name="description">
        <Control>
          {#snippet children({ props })}
            <div class="field full">
              <Label>Description</Label>
              <textarea 
                {...props}
                rows="2"
                bind:value={$createFormData.description}
                disabled={$createSubmitting}
              ></textarea>
            </div>
          {/snippet}
        </Control>
        <FieldErrors />
      </Field>

      <div class="actions">
        <button type="submit" class="btn primary" disabled={$createSubmitting}>
          {#if $createSubmitting}
            Creating...
          {:else}
            Create Category
          {/if}
        </button>
      </div>
    </form>
  </section>

  <section class="list-section">
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Sort</th>
            <th>Name / Slug</th>
            <th>Description</th>
            <th>Created</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each data.categories as category (category.id)}
            <tr class:editing={editingId === category.id}>
              {#if editingId === category.id}
                <td colspan="5" class="edit-cell">
                  <form method="POST" action="?/update" use:enhance={() => { return async ({ update }) => { await update(); editingId = null; }; }} class="edit-form">
                    <input type="hidden" name="id" value={category.id} />
                    
                    <div class="edit-fields">
                      <div class="field-mini">
                        <label for="edit-sort-{category.id}">Sort</label>
                        <input type="number" id="edit-sort-{category.id}" name="sortOrder" value={category.sortOrder} />
                      </div>
                      <div class="field-mini">
                        <label for="edit-name-{category.id}">Name</label>
                        <input type="text" id="edit-name-{category.id}" name="name" value={category.name} required />
                      </div>
                      <div class="field-mini grow">
                        <label for="edit-desc-{category.id}">Description</label>
                        <input type="text" id="edit-desc-{category.id}" name="description" value={category.description || ''} />
                      </div>
                    </div>

                    <div class="edit-actions">
                      <button type="submit" class="btn primary small">Save</button>
                      <button type="button" class="btn secondary small" onclick={() => toggleEdit(null)}>Cancel</button>
                    </div>
                  </form>
                </td>
              {:else}
                <td>{category.sortOrder}</td>
                <td>
                  <div class="name-col">
                    <span class="name">{category.name}</span>
                    <span class="slug">{category.slug}</span>
                  </div>
                </td>
                <td class="desc-col" title={category.description}>{category.description || '-'}</td>
                <td class="date">{new Date(category.createdAt).toLocaleDateString()}</td>
                <td class="actions-col">
                  <button class="btn icon" onclick={() => toggleEdit(category.id)} aria-label="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 1 22l1.5-6.5L17 3z"></path></svg>
                  </button>
                  <form method="POST" action="?/delete" use:enhance class="inline-form" onsubmit={(e) => !confirm('Delete this category?') && e.preventDefault()}>
                    <input type="hidden" name="id" value={category.id} />
                    <button type="submit" class="btn icon danger" aria-label="Delete">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </form>
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>

<style>
  .page {
    padding: var(--space-6);
    max-width: 1200px;
    margin: 0 auto;
    color: var(--color-text);
  }

  .header {
    margin-bottom: var(--space-8);
    display: flex;
    align-items: baseline;
    gap: var(--space-4);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-4);
  }

  h1 {
    font-size: var(--text-2xl);
    font-weight: 600;
    margin: 0;
  }

  .count {
    color: var(--color-text-secondary);
    font-size: var(--text-lg);
    font-weight: 400;
  }

  .message {
    font-size: var(--text-sm);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
  }

  .message.error {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .message.success {
    background-color: #dcfce7;
    color: #166534;
  }

  .create-section {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    margin-bottom: var(--space-8);
  }

  h2 {
    font-size: var(--text-lg);
    margin-top: 0;
    margin-bottom: var(--space-4);
    color: var(--color-text-secondary);
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
    align-items: end;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .field.full {
    grid-column: 1 / -1;
  }

  label {
    font-size: var(--text-xs);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
  }

  input, textarea {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    transition: border-color var(--transition-fast);
  }

  input:focus, textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-light);
  }

  .actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    margin-top: var(--space-2);
  }

  .table-container {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
    background: var(--color-surface);
  }

  th {
    background: var(--color-bg-secondary);
    text-align: left;
    padding: var(--space-3) var(--space-4);
    font-weight: 500;
    color: var(--color-text-secondary);
    border-bottom: 1px solid var(--color-border);
    font-size: var(--text-xs);
    text-transform: uppercase;
  }

  td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  .name-col {
    display: flex;
    flex-direction: column;
  }

  .name {
    font-weight: 500;
    color: var(--color-text);
  }

  .slug {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
  }

  .desc-col {
    color: var(--color-text-secondary);
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .date {
    color: var(--color-text-secondary);
    font-size: var(--text-xs);
    white-space: nowrap;
  }

  .actions-col {
    display: flex;
    gap: var(--space-1);
    justify-content: flex-end;
  }

  .inline-form {
    display: inline;
  }

  .edit-cell {
    background-color: var(--color-bg-secondary);
    padding: var(--space-3);
  }

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .edit-fields {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .field-mini {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .field-mini.grow {
    flex: 1;
    min-width: 200px;
  }

  .edit-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
  }

  input:disabled, textarea:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .btn:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  :global([data-fs-error]) {
    font-size: var(--text-xs);
    color: #ef4444;
    margin-top: var(--space-1);
  }
</style>
