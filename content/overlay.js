// content/overlay.js
const svgMoon = () =>
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 0 1 11.21 3a7 7 0 1 0 9.79 9.79Z"/></svg>'
const svgSun = () =>
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0 4a1 1 0 0 1-1-1v-1.5a1 1 0 1 1 2 0V21a1 1 0 0 1-1 1Zm0-17.5a1 1 0 0 1-1-1V2a1 1 0 1 1 2 0v1.5a1 1 0 0 1-1 1ZM3 13a1 1 0 1 1 0-2h1.5a1 1 0 1 1 0 2H3Zm16.5 0a1 1 0 1 1 0-2H21a1 1 0 1 1 0 2h-1.5ZM5.05 19.95a1 1 0 0 1 0-1.41l1.06-1.06a1 1 0 1 1 1.41 1.41L6.46 19.95a1 1 0 0 1-1.41 0Zm11.02-11.02a1 1 0 0 1 0-1.41l1.06-1.06a1 1 0 1 1 1.41 1.41l-1.06 1.06a1 1 0 0 1-1.41 0Zm0 11.02 1.06-1.06a1 1 0 1 1 1.41 1.41l-1.06 1.06a1 1 0 1 1-1.41-1.41ZM5.05 4.05 6.11 3a1 1 0 1 1 1.41 1.41L6.46 5.46A1 1 0 1 1 5.05 4.05Z"/></svg>'
;(() => {
  // If a previous toggle function exists, invoke it to close and exit (back-compat).
  try {
    if (typeof window.__READER_OPEN__ === 'function') {
      window.__READER_OPEN__()
      return
    }
    // Legacy alias from older builds
    if (typeof window.__VESPER_READER_OPEN__ === 'function') {
      window.__VESPER_READER_OPEN__()
      return
    }
  } catch {
    /* ignore */
  }

  // If an instance already exists (from a previous injection), close it safely.
  const existing = document.getElementById('reader-root')
  if (existing) {
    const prevHtml = existing.getAttribute('data-prev-html-overflow') || ''
    const prevBody = existing.getAttribute('data-prev-body-overflow') || ''
    document.documentElement.style.overflow = prevHtml
    document.body.style.overflow = prevBody
    try {
      existing.remove()
    } catch {}
    return
  }

  // Root host + shadow
  const host = document.createElement('div')
  host.id = 'reader-root'
  const shadow = host.attachShadow({ mode: 'open' })

  // Style: attach extension CSS inside shadow root
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = chrome.runtime.getURL('content/overlay.css')
  shadow.append(link)

  // Container
  const container = document.createElement('div')
  container.className = 'reader-container'

  // Theme preference (simple toggle persisted per-origin)
  const THEME_KEY = '__reader_theme'

  function withCountdown(btn, labelEl, baseText, seconds = 3) {
    const original = labelEl.textContent
    let remaining = seconds
    btn.disabled = true
    const step = () => {
      if (remaining > 0) {
        labelEl.textContent = `${baseText} (${remaining})`
        remaining -= 1
        setTimeout(step, 1000)
      } else {
        labelEl.textContent = original
        btn.disabled = false
      }
    }
    step()
  }

  function getMetaContent(sel, attr = 'content') {
    return document.querySelector(sel)?.getAttribute(attr) || ''
  }
  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || 'dark'
    } catch {
      return 'dark'
    }
  }
  function storeTheme(v) {
    try {
      localStorage.setItem(THEME_KEY, v)
    } catch {
      /* ignore */
    }
  }
  function applyTheme(v) {
    const t = v === 'light' ? 'light' : 'dark'
    host.setAttribute('data-theme', t)
    return t
  }
  // Initialize theme before rendering
  applyTheme(getStoredTheme())

  // Close helper toggled by toolbar click
  // Preserve original page scroll state to restore on close
  const prevHtmlOverflow = document.documentElement.style.overflow
  const prevBodyOverflow = document.body.style.overflow
  host.setAttribute('data-prev-html-overflow', prevHtmlOverflow || '')
  host.setAttribute('data-prev-body-overflow', prevBodyOverflow || '')

  const closeOverlay = () => {
    try {
      host.remove()
    } catch {}
    // Restore page scrollability
    document.documentElement.style.overflow = prevHtmlOverflow
    document.body.style.overflow = prevBodyOverflow
    try {
      delete window.__READER_OPEN__
      // Legacy alias cleanup
      delete window.__VESPER_READER_OPEN__
    } catch {}
  }
  // Expose current toggle and legacy alias for safety
  window.__READER_OPEN__ = closeOverlay
  // Legacy alias from older builds (no-op if unused)
  try {
    window.__VESPER_READER_OPEN__ = closeOverlay
  } catch {}

  // Parse article (Readability-like API)
  try {
    const clone = document.cloneNode(true)
    // Remove scripts and styles from clone to avoid issues
    clone.querySelectorAll('script, style, link[rel="stylesheet"]').forEach((el) => el.remove())
    // Readability is provided by @mozilla/readability (injected by background.js)
    const article = new Readability(clone).parse()
    if (!article || !article.content) {
      container.innerHTML = `<div class="reader-empty">No readable article found.</div>`
    } else {
      const articleEl = document.createElement('article')
      articleEl.className = 'reader-article'
      articleEl.innerHTML = article.content
      // Clean up non-article UI elements for nicer Markdown
      sanitizeArticle(articleEl)

      // Ensure a proper title block using meta if header is missing
      const meta = extractMeta()
      ensureTitleBlock(articleEl, meta)
      const titleText = deriveTitle(articleEl, meta.title || article.title || document.title)
      container.appendChild(buildTopBar(titleText))

      // Scrollable content wrapper so the page behind doesn't scroll
      const scroller = document.createElement('div')
      scroller.className = 'reader-scroll'
      scroller.appendChild(articleEl)
      container.appendChild(scroller)
    }
  } catch (e) {
    container.innerHTML = `<div class="reader-empty">Reader error: ${escapeHtml(String(e))}</div>`
  }

  // Mount
  shadow.append(container)
  document.documentElement.appendChild(host)

  // Lock background scroll while reader is open
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'

  // Close on ESC from anywhere
  const onKey = (e) => {
    if (e.key === 'Escape') closeOverlay()
  }
  shadow.addEventListener('keydown', onKey, { capture: true })
  document.addEventListener('keydown', onKey, { capture: true })

  function buildTopBar(title) {
    const bar = document.createElement('header')
    bar.className = 'reader-toolbar'
    bar.innerHTML = `
      <div class="reader-title">${escapeHtml(title || '')}</div>
      <div class="reader-actions">
        <button id="reader-theme" class="icon-btn" title="Toggle theme" aria-label="Toggle theme"></button>
        <button id="reader-copy"><span class="label">Copy Markdown</span></button>
        <button id="reader-download"><span class="label">Download Markdown</span></button>
        <button id="reader-close" aria-label="Close">×</button>
      </div>`

    bar.querySelector('#reader-close').addEventListener('click', () => closeOverlay())

    // Theme toggle
    const themeBtn = bar.querySelector('#reader-theme')
    const setThemeButtonIcon = () => {
      const cur = host.getAttribute('data-theme') || 'dark'
      themeBtn.innerHTML = cur === 'dark' ? svgSun() : svgMoon()
      themeBtn.title = cur === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
      themeBtn.setAttribute('aria-label', themeBtn.title)
    }
    setThemeButtonIcon()
    themeBtn.addEventListener('click', () => {
      const cur = host.getAttribute('data-theme') || 'dark'
      const next = cur === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      storeTheme(next)
      setThemeButtonIcon()
    })

    // Use meta title for filename to avoid site-specific structure issues
    const metaForFile = extractMeta()
    const titleName = safeName(metaForFile.title || title) + '.md'

    const genMarkdown = () => {
      const articleNode = container.querySelector('.reader-article')
      if (!articleNode) return ''
      try {
        const turndown = new TurndownService({
          headingStyle: 'atx',
          codeBlockStyle: 'fenced',
        })
        turndown.addRule('preCode', {
          filter: (node) => node.nodeName === 'PRE' && node.querySelector('code'),
          replacement: (content, node) => '```\n' + (node.textContent || '') + '\n```',
        })
        turndown.addRule('dropSmallLinks', {
          filter: (node) => node.nodeName === 'A' && (node.textContent || '').trim().length <= 2,
          replacement: () => '',
        })
        turndown.addRule('dropBadges', {
          filter: (node) =>
            node.nodeType === 1 &&
            /badge|tag|chip|pill|avatar|logo|icon|subscribe|share|comments|related/i.test(
              node.className || ''
            ),
          replacement: () => '',
        })
        return turndown.turndown(articleNode)
      } catch {
        return (articleNode.textContent || '').trim()
      }
    }

    const copyBtn = bar.querySelector('#reader-copy')
    const copyLabel = copyBtn.querySelector('.label')
    const downloadBtn = bar.querySelector('#reader-download')
    const downloadLabel = downloadBtn.querySelector('.label')

    bar.querySelector('#reader-copy').addEventListener('click', async () => {
      const md = genMarkdown()
      try {
        await chrome.runtime.sendMessage({
          type: 'COPY_MD',
          md,
          filename: titleName,
        })
      } catch {}
      withCountdown(copyBtn, copyLabel, 'Copied', 3)
    })
    bar.querySelector('#reader-download').addEventListener('click', async () => {
      const md = genMarkdown()
      const payload = { type: 'DOWNLOAD_MD', md, filename: titleName, title }
      try {
        const res = await new Promise((resolve) => {
          try {
            chrome.runtime.sendMessage(payload, (resp) => resolve(resp || { ok: false }))
          } catch {
            resolve({ ok: false })
          }
          // Failsafe timeout
          setTimeout(() => resolve({ ok: false }), 4000)
        })
        if (res && res.ok) return
      } catch {
        /* fall through to fallback */
      }

      // Fallback: download via Blob + anchor with explicit filename
      try {
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = titleName // ensures correct name instead of generic 'download'
        a.style.display = 'none'
        shadow.appendChild(a)
        a.click()
        setTimeout(() => {
          URL.revokeObjectURL(url)
          a.remove()
        }, 1000)
      } catch {
        /* ignore */
      }
      withCountdown(downloadBtn, downloadLabel, 'Downloaded', 3)
    })
    return bar
  }

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"]/g,
      (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]
    )
  }
  function safeName(s = 'article') {
    return (
      String(s)
        .replace(/[\\/:*?"<>|]+/g, ' ')
        .trim()
        .slice(0, 80) || 'article'
    )
  }
  function deriveTitle(articleEl, fallback) {
    const h = articleEl.querySelector('h1')
    const t = (h?.textContent || '').trim()
    if (t && t.length > 10) return t
    return fallback || document.title || 'Article'
  }
  function sanitizeArticle(root) {
    // Remove non-content UI and noisy elements
    const DROP = [
      'script',
      'style',
      'noscript',
      'svg',
      'iframe',
      'form',
      'input',
      'button',
      'select',
      'textarea',
      'label',
      'nav',
      'header',
      'footer',
      'aside',
    ]
    root.querySelectorAll(DROP.join(',')).forEach((n) => n.remove())
    const noisy =
      /share|social|promo|advert|ad-|ads|banner|subscribe|newsletter|paywall|modal|overlay|tooltip|icon|badge|tag|chip|pill|avatar|logo|breadcrumbs|related|comments|popup/i
    root.querySelectorAll('[class], [id]').forEach((el) => {
      const s = (el.className || '') + ' ' + (el.id || '')
      if (noisy.test(s)) el.remove()
    })
    // Drop links that only wrap images or short icon text
    Array.from(root.querySelectorAll('a')).forEach((a) => {
      const text = (a.textContent || '').trim()
      const hasImg = !!a.querySelector('img, svg')
      if (hasImg && (!text || text.length <= 2)) a.remove()
    })
    // Remove empty paragraphs
    Array.from(root.querySelectorAll('p')).forEach((p) => {
      if (!p.textContent || p.textContent.trim().length === 0) p.remove()
    })
  }
  function extractMeta() {
    const meta = {
      title: getMetaContent('meta[property="og:title"]') || document.title || '',
      subtitle: get('meta[name="description"]') || get('meta[property="og:description"]') || '',
      author: get('meta[name="author"]') || get('meta[property="article:author"]') || '',
      section: getMetaContent('meta[property="article:section"]') || '',
      date: getMetaContent('meta[property="article:published_time"]') || '',
    }
    // JSON-LD Article/BlogPosting
    try {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      for (const s of scripts) {
        const txt = s.textContent || ''
        if (!txt.trim()) continue
        const json = JSON.parse(txt)
        const data = Array.isArray(json)
          ? json.find((x) => x && (x['@type'] === 'Article' || x['@type'] === 'BlogPosting'))
          : json
        if (data && (data['@type'] === 'Article' || data['@type'] === 'BlogPosting')) {
          meta.title = data.headline || meta.title
          meta.subtitle = data.description || meta.subtitle
          meta.author =
            typeof data.author === 'string' ? data.author : data.author?.name || meta.author
          meta.section = data.articleSection || meta.section
          meta.date = data.datePublished || meta.date
          break
        }
      }
    } catch {}
    return meta
  }
  function ensureTitleBlock(articleEl, meta) {
    const existing = articleEl.querySelector('h1')
    if (existing && (existing.textContent || '').trim().length > 0) return
    const header = document.createElement('header')
    header.className = 'reader-title-block'
    const h1 = document.createElement('h1')
    h1.textContent = meta.title || document.title || 'Untitled'
    header.appendChild(h1)
    if (meta.subtitle) {
      const p = document.createElement('p')
      p.style.fontStyle = 'italic'
      p.textContent = meta.subtitle
      header.appendChild(p)
    }
    const bits = []
    if (meta.author) bits.push(`By ${meta.author}`)
    if (meta.section) bits.push(meta.section)
    if (meta.date) {
      let d = meta.date
      try {
        d = new Date(meta.date).toLocaleDateString()
      } catch {}
      bits.push(d)
    }
    if (bits.length) {
      const small = document.createElement('p')
      small.textContent = bits.join(' · ')
      header.appendChild(small)
    }
    articleEl.insertBefore(header, articleEl.firstChild)
  }
})()
