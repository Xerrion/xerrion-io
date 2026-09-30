<script lang="ts">
  import { superForm } from 'sveltekit-superforms'
  import { zod4Client } from 'sveltekit-superforms/adapters'
  import { Field, Control, Label, FieldErrors } from 'formsnap'
  import type { PageData, ActionData } from './$types'

  import { loginSchema } from '$lib/schemas/admin'

  interface Props {
    data: PageData
    form?: ActionData
  }
  let { data, form: actionData }: Props = $props()

  // svelte-ignore state_referenced_locally
  const form = superForm(data.form, { validators: zod4Client(loginSchema) })
  const { form: formData, enhance, submitting, errors } = form
  const loginError = $derived(actionData?.loginError ?? data.loginError)
</script>

<div class="login-container">
  <div class="login-card">
    <div class="brand">
      <div class="logo" aria-hidden="true">X</div>
      <h1 class="title">Admin Access</h1>
    </div>

    {#if loginError || $errors.username}
      <p class="error-message" role="alert">
        {loginError ?? $errors.username?.[0]}
      </p>
    {/if}

    {#if data.usePocketId}
      <p class="description">
        Sign in with your Pocket ID account to manage the site.
      </p>
      <form method="POST" action="?/pocketId">
        <button type="submit">Sign in with Pocket ID</button>
      </form>
    {:else}
      <form method="POST" action="?/login" use:enhance>
        <Field {form} name="username">
          <Control>
            {#snippet children({ props })}
              <div class="form-group">
                <Label>Username</Label>
                <input
                  {...props}
                  type="text"
                  autocomplete="username"
                  bind:value={$formData.username}
                  required
                  disabled={$submitting}
                />
              </div>
            {/snippet}
          </Control>
          <FieldErrors />
        </Field>
        <Field {form} name="password">
          <Control>
            {#snippet children({ props })}
              <div class="form-group">
                <Label>Password</Label>
                <input
                  {...props}
                  type="password"
                  autocomplete="current-password"
                  bind:value={$formData.password}
                  required
                  disabled={$submitting}
                />
              </div>
            {/snippet}
          </Control>
          <FieldErrors />
        </Field>
        <button type="submit" disabled={$submitting}
          >{$submitting ? 'Signing in...' : 'Sign In'}</button
        >
      </form>
    {/if}

    <div class="footer"><a href="/">← Back to site</a></div>
  </div>
</div>

<style>
  .login-container {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: var(--space-6);
    background: var(--color-bg);
    color: var(--color-text);
  }
  .login-card {
    width: 100%;
    max-width: 26rem;
    padding: var(--space-10);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2xl);
    background: var(--color-surface);
    box-shadow: var(--shadow-lg);
    animation: appear 300ms ease-out;
  }
  .brand {
    text-align: center;
    margin-bottom: var(--space-8);
  }
  .logo {
    display: grid;
    place-items: center;
    width: var(--space-16);
    height: var(--space-16);
    margin: 0 auto var(--space-4);
    border-radius: var(--radius-xl);
    background: var(--color-primary);
    color: var(--color-text-inverse);
    font-size: var(--text-3xl);
    font-weight: 700;
  }
  .title {
    font-size: var(--text-2xl);
    font-weight: 600;
  }
  .description {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-6);
    text-align: center;
  }
  .error-message {
    color: var(--color-danger);
    margin-bottom: var(--space-4);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  input {
    width: 100%;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: var(--text-base);
  }
  button {
    padding: var(--space-3) var(--space-4);
    border: 0;
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: var(--color-text-inverse);
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
  }
  button:hover {
    background: var(--color-primary-hover);
  }
  button:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  button:focus-visible,
  input:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 3px;
  }
  .footer {
    margin-top: var(--space-6);
    text-align: center;
    font-size: var(--text-sm);
  }
  a {
    color: var(--color-text-secondary);
  }
  @keyframes appear {
    from {
      opacity: 0;
      transform: translateY(var(--space-3));
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .login-card {
      animation: none;
    }
  }
  @media (max-width: 480px) {
    .login-card {
      padding: var(--space-6);
    }
  }
</style>
