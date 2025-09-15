// background.js - service worker for Simple Reader

chrome.action.onClicked.addListener(async (tab,) => {
	try {
		if (!tab || !tab.id) return
		// Avoid injecting on restricted/internal pages (e.g., chrome://)
		const url = tab.url || ''
		if (
			/^(chrome|edge|about|devtools|view-source):/i.test(url,) ||
			url.startsWith('chrome-extension://',)
		) {
			try {
				await chrome.action.setBadgeBackgroundColor?.({ color: '#cc3333', },)
				await chrome.action.setBadgeText?.({ text: 'X', tabId: tab.id, },)
				setTimeout(
					() => chrome.action.setBadgeText?.({ text: '', tabId: tab.id, },),
					2000,
				)
			} catch (_) { /* ignore */ }
			console.warn('Simple Reader: cannot run on restricted URL:', url,)
			return
		}
		// Inject vendor libs then content script
		await chrome.scripting.executeScript({
			target: { tabId: tab.id, },
			files: [
				'vendor/readability.js',
				'vendor/turndown.js',
				'content/overlay.js',
			],
		},)
	} catch (e) {
		console.error('Simple Reader injection failed:', e,)
	}
},)

// Clipboard via offscreen document (MV3 pattern)
async function ensureOffscreen() {
	const OFFSCREEN_URL = chrome.runtime.getURL('offscreen.html',)
	try {
		const has = await chrome.offscreen.hasDocument?.()
		if (!has) {
			await chrome.offscreen.createDocument({
				url: OFFSCREEN_URL,
				reasons: [chrome.offscreen.Reason.CLIPBOARD,],
				justification: 'Write Markdown to clipboard.',
			},)
		}
	} catch (e) {
		// Some Chrome versions may lack hasDocument; try to create blindly.
		try {
			await chrome.offscreen.createDocument({
				url: OFFSCREEN_URL,
				reasons: [chrome.offscreen.Reason.CLIPBOARD,],
				justification: 'Write Markdown to clipboard.',
			},)
		} catch (_) {
			// ignore if already exists
		}
	}
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse,) => {
	;(async () => {
		try {
			if (msg?.type === 'COPY_MD') {
				await ensureOffscreen()
				chrome.runtime.sendMessage({ type: 'OFFSCREEN_COPY', md: msg.md, },)
				sendResponse({ ok: true, },)
			} else if (msg?.type === 'DOWNLOAD_MD') {
				const filename = deriveFilename(msg, sender,) + '.md'
				// Use the offscreen document (DOM context) to create a Blob URL and download
				await ensureOffscreen()
				const ok = await new Promise((resolve,) => {
					try {
						chrome.runtime.sendMessage({
							type: 'OFFSCREEN_DOWNLOAD',
							md: msg.md || '',
							filename,
						}, (resp,) => {
							resolve(!!(resp && resp.ok),)
						},)
						// Failsafe timeout
						setTimeout(() => resolve(false,), 5000,)
					} catch (_) {
						resolve(false,)
					}
				},)
				sendResponse({ ok, },)
			}
		} catch (e) {
			console.error('Simple Reader message handling error:', e,)
			sendResponse({ ok: false, error: String(e,), },)
		}
	})()
	return true // keep message channel open for async
},)

function deriveFilename(msg, sender,) {
	const base = (msg && typeof msg.filename === 'string' && msg.filename.trim())
		? msg.filename.replace(/\.(md|markdown)$/i, '',)
		: (msg && typeof msg.title === 'string' && msg.title.trim())
		? msg.title
		: (sender?.tab?.title || 'article')
	return sanitizeFilename(base,).slice(0, 120,) || 'article'
}

// no-op: download is delegated to offscreen DOM

function sanitizeFilename(name,) {
	return String(name,)
		.replace(/[\n\r]+/g, ' ',)
		.replace(/[\\/:*?"<>|]+/g, ' ',)
		.replace(/\s+/g, ' ',)
		.trim()
}
