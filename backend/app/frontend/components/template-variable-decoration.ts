// TipTap extension that visually highlights template variables —
// {{agent_name}}, {{company_name}}, {{user_name}}, {{role}}, and any other
// mustache token — as styled chips while keeping the underlying text exactly
// as written. No custom node, no serializer munging: the engine still sees
// the raw `{{name}}` tokens in the saved markdown, AgentTemplate#render
// continues to substitute them, and the editor just paints them so the
// author can see where the substitutions land.

import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import type { Node as PMNode } from "@tiptap/pm/model"

const TOKEN_REGEX = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g

// Known names from AgentTemplate#render — get a brand tint so they pop. Anything
// else still gets highlighted, just with the neutral fallback color.
const KNOWN: Record<string, string> = {
  agent_name: "aui-tplvar-agent",
  company_name: "aui-tplvar-company",
  user_name: "aui-tplvar-user",
  role: "aui-tplvar-role",
}

function decorate(doc: PMNode): DecorationSet {
  const decorations: Decoration[] = []
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    const text = node.text
    TOKEN_REGEX.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = TOKEN_REGEX.exec(text)) !== null) {
      const from = pos + match.index
      const to = from + match[0].length
      const variant = KNOWN[match[1]] ?? "aui-tplvar-other"
      decorations.push(
        Decoration.inline(from, to, {
          class: `aui-tplvar ${variant}`,
          title: `Template variable — replaced with the agent's ${match[1].replace(/_/g, " ")} at install time`,
        }),
      )
    }
  })
  return DecorationSet.create(doc, decorations)
}

export const TemplateVariableDecoration = Extension.create({
  name: "templateVariableDecoration",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("templateVariableDecoration"),
        state: {
          init: (_, { doc }) => decorate(doc),
          apply: (tr, old) => (tr.docChanged ? decorate(tr.doc) : old),
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})
