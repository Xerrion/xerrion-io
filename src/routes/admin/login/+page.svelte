<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  let submitting = $state(false);
</script>

<div class="login-container">
  <div class="login-background"></div>
  
  <div 
    class="login-card" 
    in:fly={{ y: 20, duration: 600, delay: 200, easing: cubicOut }}
  >
    <div class="brand">
      <div class="logo">X</div>
      <h1 class="title">Admin Access</h1>
    </div>

    {#if page.form?.error}
      <div class="error-message" transition:fade>
        {page.form.error}
      </div>
    {/if}

    <form 
      method="POST" 
      action="?/login" 
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          await update();
          submitting = false;
        };
      }}
    >
      <div class="form-group">
        <label for="username">Username</label>
        <input 
          type="text" 
          id="username" 
          name="username" 
          autocomplete="username"
          value={page.form?.username ?? ''}
          required
          disabled={submitting}
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input 
          type="password" 
          id="password" 
          name="password" 
          autocomplete="current-password"
          required
          disabled={submitting}
        />
      </div>

      <button type="submit" disabled={submitting}>
        {#if submitting}
          <span class="spinner"></span>
          Signing in...
        {:else}
          Sign In
        {/if}
      </button>
    </form>

    <div class="footer">
      <a href="/">← Back to site</a>
    </div>
  </div>
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

  label {
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

  button {
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
    transition: all var(--transition-base);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
  }

  button:hover:not(:disabled) {
    background: var(--color-primary);
    color: white;
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  button:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .footer {
    margin-top: var(--space-6);
    text-align: center;
  }

  .footer a {
    color: var(--color-text-muted);
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    text-decoration: none;
    transition: color var(--transition-base);
  }

  .footer a:hover {
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
