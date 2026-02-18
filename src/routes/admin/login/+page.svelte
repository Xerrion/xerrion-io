<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zod4Client } from 'sveltekit-superforms/adapters';
  import { Field, Control, Label, FieldErrors } from 'formsnap';
  import { loginSchema } from '$lib/schemas/admin';
  import { motion, AnimatePresence } from '@humanspeak/svelte-motion';

  let { data } = $props();

  // svelte-ignore state_referenced_locally — superForm captures the initial value intentionally
  const form = superForm(data.form, {
    validators: zod4Client(loginSchema)
  });
  const { form: formData, enhance, submitting, errors } = form;
</script>

<div class="login-container">
  <div class="login-background"></div>
  
  <motion.div
    class="login-card"
    initial={{ opacity: 0, y: 20, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay: 0.15 }}
  >
    <motion.div
      class="brand"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
    >
      <div class="logo">X</div>
      <h1 class="title">Admin Access</h1>
    </motion.div>

    <AnimatePresence>
      {#if $errors.username}
        <motion.div
          key="error"
          class="error-message"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          {$errors.username[0]}
        </motion.div>
      {/if}
    </AnimatePresence>

    <form 
      method="POST" 
      action="?/login" 
      use:enhance
    >
      <Field {form} name="username">
        <Control>
          {#snippet children({ props })}
            <motion.div
              class="form-group"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.45 }}
            >
              <Label>Username</Label>
              <input 
                {...props}
                type="text" 
                autocomplete="username"
                bind:value={$formData.username}
                required
                disabled={$submitting}
              />
            </motion.div>
          {/snippet}
        </Control>
        <FieldErrors />
      </Field>

      <Field {form} name="password">
        <Control>
          {#snippet children({ props })}
            <motion.div
              class="form-group"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.55 }}
            >
              <Label>Password</Label>
              <input 
                {...props}
                type="password" 
                autocomplete="current-password"
                bind:value={$formData.password}
                required
                disabled={$submitting}
              />
            </motion.div>
          {/snippet}
        </Control>
        <FieldErrors />
      </Field>

      <motion.button
        type="submit"
        disabled={$submitting}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.65 }}
        whileHover={{ scale: 1.02, transition: { duration: 0.12 } }}
        whileTap={{ scale: 0.98 }}
      >
        {#if $submitting}
          <span class="spinner"></span>
          Signing in...
        {:else}
          Sign In
        {/if}
      </motion.button>
    </form>

    <motion.div
      class="footer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.75 }}
    >
      <a href="/">← Back to site</a>
    </motion.div>
  </motion.div>
</div>

<style>
  .login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    background: var(--color-bg);
    padding: var(--space-4);
  }

  .login-background {
    position: absolute;
    inset: 0;
    z-index: 0;
    opacity: 0.4;
    pointer-events: none;
    background: 
      radial-gradient(circle at 15% 50%, var(--color-primary-light) 0%, transparent 25%),
      radial-gradient(circle at 85% 30%, var(--color-accent) 0%, transparent 25%);
    filter: blur(60px);
  }

  .login-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 400px;
    background: var(--color-surface);
    padding: var(--space-8);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--color-border);
    backdrop-filter: blur(12px);
  }

  .brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: var(--space-8);
  }

  .logo {
    width: 48px;
    height: 48px;
    background: var(--color-primary);
    color: white;
    font-family: var(--font-mono);
    font-size: var(--text-2xl);
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-4);
    box-shadow: var(--shadow-md);
  }

  .title {
    font-family: var(--font-sans);
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--color-text);
    letter-spacing: -0.02em;
    margin: 0;
  }

  .error-message {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    margin-bottom: var(--space-6);
    text-align: center;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .login-container :global(label) {
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-left: var(--space-1);
  }

  input {
    width: 100%;
    padding: var(--space-3);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    color: var(--color-text);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    transition: all var(--transition-base);
    outline: none;
  }

  input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-light);
    background: var(--color-bg);
  }

  input:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .login-container :global(button) {
    margin-top: var(--space-2);
    width: 100%;
    padding: var(--space-3);
    background: var(--color-text);
    color: var(--color-bg);
    border: none;
    border-radius: var(--radius-lg);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
  }

  .login-container :global(button:hover:not(:disabled)) {
    background: var(--color-primary);
    color: white;
    box-shadow: var(--shadow-md);
  }

  .login-container :global(button:disabled) {
    opacity: 0.7;
    cursor: wait;
  }

  .login-container :global(.footer) {
    margin-top: var(--space-6);
    text-align: center;
  }

  .login-container :global(.footer a) {
    color: var(--color-text-muted);
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    text-decoration: none;
    transition: color var(--transition-base);
  }

  .login-container :global(.footer a:hover) {
    color: var(--color-text);
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
