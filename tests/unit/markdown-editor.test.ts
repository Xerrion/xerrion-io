import { expect, test } from 'bun:test'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { GFM } from '@lezer/markdown'
import {
  prosemarkBasicSetup,
  prosemarkBaseThemeSetup,
  prosemarkMarkdownSyntaxExtensions
} from '@prosemark/core'
import { pasteRichTextExtension } from '@prosemark/paste-rich-text'

test('blog editor extensions initialize together and retain editable Markdown', () => {
  const content = '# Existing post\n\nThe saved **Markdown** content.'
  const editable = new Compartment()
  const extensions = [
    GFM,
    prosemarkMarkdownSyntaxExtensions
  ] as unknown as NonNullable<Parameters<typeof markdown>[0]>['extensions']
  const state = EditorState.create({
    doc: content,
    extensions: [
      markdown({ codeLanguages: languages, extensions }),
      prosemarkBasicSetup(),
      prosemarkBaseThemeSetup(),
      pasteRichTextExtension(),
      EditorView.updateListener.of(() => {}),
      editable.of(EditorView.editable.of(true))
    ]
  })

  expect(state.doc.toString()).toBe(content)
  const updated = state.update({
    changes: { from: content.length, insert: '\n\nNew paragraph.' },
    effects: editable.reconfigure(EditorView.editable.of(false))
  }).state
  expect(updated.doc.toString()).toBe(`${content}\n\nNew paragraph.`)
  expect(updated.facet(EditorView.editable)).toBe(false)
})
