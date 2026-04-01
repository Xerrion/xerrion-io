<script lang="ts">
  import { browser } from '$app/environment'
  import { untrack } from 'svelte'

  interface Props {
    content: string
    onchange: (content: string) => void
    disabled?: boolean
    ariaLabel?: string
  }
  let {
    content,
    onchange,
    disabled = false,
    ariaLabel = 'Content editor'
  }: Props = $props()

  let containerEl = $state<HTMLElement | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let editorView = $state<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let editableCompartment: any = null

  $effect(() => {
    if (!browser || !containerEl) return
    if (untrack(() => editorView)) return

    let isDestroyed = false
    const initialContent = untrack(() => content)
    const isDisabled = untrack(() => disabled)

    Promise.all([
      import('@codemirror/view'),
      import('@codemirror/state'),
      import('@codemirror/lang-markdown'),
      import('@lezer/markdown'),
      import('@codemirror/language-data'),
      import('@prosemark/core'),
      import('@prosemark/paste-rich-text')
    ]).then(
      ([
        { EditorView },
        { Compartment },
        { markdown },
        { GFM },
        { languages },
        {
          prosemarkBasicSetup,
          prosemarkBaseThemeSetup,
          prosemarkMarkdownSyntaxExtensions
        },
        { pasteRichTextExtension }
      ]) => {
        if (isDestroyed || !containerEl) return

        editableCompartment = new Compartment()

        editorView = new EditorView({
          doc: initialContent,
          parent: containerEl,
          extensions: [
            markdown({
              codeLanguages: languages,
              extensions: [GFM, prosemarkMarkdownSyntaxExtensions]
            }),
            prosemarkBasicSetup(),
            prosemarkBaseThemeSetup(),
            pasteRichTextExtension(),
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                onchange(update.state.doc.toString())
              }
            }),
            editableCompartment.of(EditorView.editable.of(!isDisabled))
          ]
        })
      }
    )

    return () => {
      isDestroyed = true
      if (editorView) {
        editorView.destroy()
        editorView = null
      }
      editableCompartment = null
    }
  })

  // Reconfigure editable state when disabled prop or editorView changes
  $effect(() => {
    const isDisabled = disabled
    const view = editorView
    const compartment = editableCompartment
    if (!view || !compartment) return

    import('@codemirror/view').then(({ EditorView }) => {
      view.dispatch({
        effects: compartment.reconfigure(EditorView.editable.of(!isDisabled))
      })
    })
  })
</script>

<div
  class="prosemark-editor"
  bind:this={containerEl}
  role="group"
  aria-label={ariaLabel}
></div>

<style>
  .prosemark-editor {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    min-height: 400px;
    background: var(--color-bg);
    cursor: text;

    /* Bridge project theme to Prosemark variables */
    --pm-header-mark-color: var(--color-primary);
    --pm-link-color: var(--color-primary);
    --pm-muted-color: var(--color-text-muted);
    --pm-code-background-color: var(--color-bg-secondary);
    --pm-code-font: var(--font-mono);
    --pm-code-btn-background-color: var(--color-bg-secondary);
    --pm-code-btn-hover-background-color: var(--color-border);
    --pm-blockquote-vertical-line-background-color: var(--color-border);
    --pm-cursor-color: var(--color-text);
  }

  .prosemark-editor:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px
      color-mix(in oklch, var(--color-primary) 20%, transparent);
  }

  .prosemark-editor :global(.cm-editor) {
    min-height: 400px;
    font-size: var(--text-sm);
    line-height: 1.7;
    padding: var(--space-4);
  }

  .prosemark-editor :global(.cm-editor .cm-content) {
    font-family: inherit;
  }

  .prosemark-editor :global(.cm-editor.cm-focused) {
    outline: none;
  }
</style>
