// Minimal TurndownService-compatible shim for Vesper Reader
// Implements a subset of HTML->Markdown suitable for article content.
;(function () {
	class RuleSet {
		constructor() {
			this.rules = []
		}
		add(rule,) {
			this.rules.push(rule,)
		}
		forNode(node,) {
			return this.rules.filter((r,) => r.filter(node,))
		}
	}

	class TurndownService {
		constructor(options = {},) {
			this.options = options
			this.rules = new RuleSet()
		}
		addRule(_name, { filter, replacement, },) {
			this.rules.add({ filter, replacement, },)
		}
		turndown(input,) {
			if (typeof input === 'string') {
				const div = document.createElement('div',)
				div.innerHTML = input
				return this.nodeToMd(div,).trim().replace(/\n{3,}/g, '\n\n',)
			}
			return this.nodeToMd(input,).trim().replace(/\n{3,}/g, '\n\n',)
		}

		nodeToMd(node,) {
			if (!node) return ''
			if (node.nodeType === Node.TEXT_NODE) {
				return node.nodeValue.replace(/\s+/g, ' ',)
			}
			if (node.nodeType !== Node.ELEMENT_NODE) return ''
			const el = node

			// Custom rules first
			for (const rule of this.rules.forNode(el,)) {
				return rule.replacement(this.childrenToMd(el,), el,)
			}

			const name = el.nodeName.toLowerCase()
			switch (name) {
				case 'h1':
					return `# ${this.inline(el,)}\n\n`
				case 'h2':
					return `## ${this.inline(el,)}\n\n`
				case 'h3':
					return `### ${this.inline(el,)}\n\n`
				case 'h4':
					return `#### ${this.inline(el,)}\n\n`
				case 'h5':
					return `##### ${this.inline(el,)}\n\n`
				case 'h6':
					return `###### ${this.inline(el,)}\n\n`
				case 'p':
					return `${this.inline(el,)}\n\n`
				case 'br':
					return `\n`
				case 'em':
				case 'i':
					return `*${this.inline(el,)}*`
				case 'strong':
				case 'b':
					return `**${this.inline(el,)}**`
				case 'code': {
					// Inline code if parent not PRE
					if (el.parentElement && el.parentElement.nodeName === 'PRE') {
						return el.textContent || ''
					}
					const t = (el.textContent || '').replace(/`/g, '\u200b`',)
					return '`' + t + '`'
				}
				case 'pre': {
					const text = el.textContent || ''
					return '```\n' + text.replace(/\n$/, '',) + '\n```\n\n'
				}
				case 'a': {
					const href = el.getAttribute('href',) || ''
					const text = this.inline(el,) || href
					return `[${text}](${href})`
				}
				case 'img': {
					const alt = el.getAttribute('alt',) || ''
					const src = el.getAttribute('src',) || ''
					return `![${alt}](${src})`
				}
				case 'ul':
					return this.list(el, '- ',)
				case 'ol':
					return this.list(el, (i,) => `${i + 1}. `,)
				case 'li':
					return this.childrenToMd(el,) + '\n'
				case 'blockquote':
					return this.blockquote(el,)
				case 'hr':
					return `\n---\n\n`
				default:
					// Drop scripts/styles, etc.
					if (/^(script|style|noscript|svg|iframe)$/i.test(name,)) return ''
					return this.childrenToMd(el,)
			}
		}

		childrenToMd(el,) {
			let out = ''
			for (const child of Array.from(el.childNodes,)) {
				out += this.nodeToMd(child,)
			}
			return out
		}

		inline(el,) {
			return this.childrenToMd(el,).replace(/\n+/g, ' ',).trim()
		}

		list(el, bullet,) {
			const items = []
			let i = 0
			for (const li of Array.from(el.children,)) {
				if (li.nodeName.toLowerCase() !== 'li') continue
				const mark = (typeof bullet === 'function') ? bullet(i,) : bullet
				items.push(mark + this.childrenToMd(li,).trim().replace(/\n+/g, ' ',),)
				i++
			}
			return items.join('\n',) + '\n\n'
		}

		blockquote(el,) {
			const text = this.childrenToMd(el,).trim().split(/\n/,).map((l,) => '> ' + l)
				.join('\n',)
			return text + '\n\n'
		}
	}

	window.TurndownService = TurndownService
})()
