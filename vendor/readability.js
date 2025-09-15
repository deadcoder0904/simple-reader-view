// Minimal Readability-compatible shim for Vesper Reader
// NOTE: This is a lightweight heuristic to avoid bundling the full library.
// It exposes the same class name and .parse() output shape.

(function(){
  function absoluteUrl(url, base) {
    try { return new URL(url, base).toString(); } catch { return url; }
  }

  class SimpleReadability {
    constructor(doc) { this._doc = doc; }
    parse() {
      const d = this._doc || document;
      const pick = (...sels) => sels.map(s => d.querySelector(s)).find(Boolean);

      // Candidate root
      let root = pick('article') || pick('main') || pick('#content, #main, #page, .post, .article, .entry, .content') || d.body;

      // Score paragraphs: parent + grandparent receive points for long text
      const scores = new Map();
      const paras = Array.from(root.querySelectorAll('p'));
      for (const p of paras) {
        const text = (p.textContent || '').trim();
        const len = text.length;
        if (len < 50) continue;
        const parent = p.parentElement;
        const grand = parent?.parentElement;
        const inc = 1 + Math.min(Math.floor(len / 100), 3);
        if (parent) scores.set(parent, (scores.get(parent) || 0) + inc);
        if (grand) scores.set(grand, (scores.get(grand) || 0) + inc / 2);
      }
      let best = null; let bestScore = 0;
      for (const [node, score] of scores.entries()) {
        if (score > bestScore) { best = node; bestScore = score; }
      }
      if (!best) best = root;

      // Build wrapper with only safe tags and cleaned attributes
      const wrapper = d.createElement('div');
      const allowed = new Set(['p','h1','h2','h3','h4','h5','h6','ul','ol','li','pre','code','blockquote','a','img','figure','figcaption','hr','strong','b','em','i']);
      const walker = d.createTreeWalker(best, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
      const stack = [wrapper];
      function push(el) { stack[stack.length-1].appendChild(el); stack.push(el); }
      function pop() { stack.pop(); }
      let curr = best;
      function cloneElement(el){
        const name = el.nodeName.toLowerCase();
        if (!allowed.has(name)) return null;
        const ne = d.createElement(name);
        if (name === 'a') {
          const href = el.getAttribute('href');
          if (href) ne.setAttribute('href', absoluteUrl(href, d.baseURI));
        }
        if (name === 'img') {
          const src = el.getAttribute('src');
          if (src) ne.setAttribute('src', absoluteUrl(src, d.baseURI));
          const alt = el.getAttribute('alt');
          if (alt) ne.setAttribute('alt', alt);
        }
        return ne;
      }
      // Manual stack walk to preserve structure of allowed tags
      (function walk(node){
        for (const child of Array.from(node.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = (child.nodeValue || '').replace(/\s+/g, ' ');
            if (text.trim()) stack[stack.length-1].appendChild(d.createTextNode(text));
            continue;
          }
          if (child.nodeType !== Node.ELEMENT_NODE) continue;
          const allow = cloneElement(child);
          // Skip obviously noisy nodes
          const s = (child.className || '') + ' ' + (child.id || '');
          if (/share|promo|advert|ad-|ads|banner|subscribe|newsletter|paywall|modal|overlay|tooltip|icon|badge|tag|chip|pill|avatar|logo|breadcrumbs|author|related|comments|popup/i.test(s)) continue;
          if (!allow) { walk(child); continue; }
          push(allow);
          walk(child);
          pop();
        }
      })(best);

      const title = (d.querySelector('meta[property="og:title"]')?.content) || d.title || '';
      const content = wrapper.innerHTML || '';
      const textContent = wrapper.textContent || '';
      return { title, content, textContent };
    }
  }

  window.Readability = SimpleReadability;
  window.isProbablyReaderable = function() { return true; };
})();
