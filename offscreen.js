// offscreen.js - dedicated to clipboard writes with robust fallback

async function writeClipboard(text,) {
	// Try Async Clipboard API first
	try {
		await navigator.clipboard.writeText(text,)
		return true
	} catch (e) {
		// Fallback to execCommand path (works with clipboardWrite permission)
		try {
			const ta = document.createElement('textarea',)
			ta.value = text
			ta.style.position = 'fixed'
			ta.style.opacity = '0'
			document.body.appendChild(ta,)
			ta.focus()
			ta.select()
			const ok = document.execCommand('copy',)
			ta.remove()
			if (ok) return true
		} catch (_) { /* ignore */ }
		console.error('Offscreen copy failed:', e,)
		return false
	}
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse,) => {
	;(async () => {
		if (msg?.type === 'OFFSCREEN_COPY' && typeof msg.md === 'string') {
			const ok = await writeClipboard(msg.md,)
			sendResponse?.({ ok, },)
		} else if (msg?.type === 'OFFSCREEN_DOWNLOAD' && typeof msg.md === 'string') {
			try {
				const blob = new Blob([msg.md,], { type: 'text/markdown;charset=utf-8', },)
				const url = URL.createObjectURL(blob,)
				try {
					await chrome.downloads.download({
						url,
						filename: msg.filename || 'article.md',
						conflictAction: 'uniquify',
						saveAs: false,
					},)
					sendResponse?.({ ok: true, },)
				} finally {
					setTimeout(() => URL.revokeObjectURL(url,), 15000,)
				}
			} catch (e) {
				console.error('Offscreen download failed:', e,)
				sendResponse?.({ ok: false, error: String(e,), },)
			}
		}
	})()
	return true // keep message channel for async sendResponse
},)
