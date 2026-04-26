
(() => {


    console.log("🚀 Recorder Active in Browser");
    

    let recordingActive = false;
    window.setRecordingMode = (state) => { 
        recordingActive = state; 
        console.log("Recording Mode:", recordingActive ? "ON (Hijacking)" : "OFF (Normal)");
    };

    const getStableSelector = (el) => {
      try {
        if (el.id && !/^(ooui-|[0-9]|yt-)/.test(el.id)) return "#" + el.id;
        const testAttr = el.getAttribute('data-testid') || el.getAttribute('data-test');
        if (testAttr) return "[data-testid='" + testAttr + "']";

        const path = [];
        let current = el;
        for (let i = 0; i < 2 && current && current.tagName !== 'BODY'; i++) {
          let segment = current.tagName.toLowerCase();
          const validClasses = Array.from(current.classList)
            .filter(c => c.length < 20 && !/\\d/.test(c))
            .join('.');
          if (validClasses) segment += "." + validClasses;
          path.unshift(segment);
          current = current.parentElement;
        }
        return path.join(' > ');
      } catch (e) { return 'unknown'; }
    };

    window.addEventListener('mousedown', (e) => {
        const isOverlay = e.composedPath().some(el => el.id === 'my-ai-overlay-host');
        if (isOverlay) return; 

      if (recordingActive) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      try {
        const eventPath = e.composedPath();
        const targetNode = eventPath[0];
        if (!targetNode || targetNode.nodeType !== 1) return;

        const interactive = eventPath.find(el => {
          if (!(el instanceof HTMLElement)) return false;
          const isGraphic = ['SVG', 'PATH', 'IMG', 'YT-ICON', 'CIRCLE', 'I'].includes(el.tagName);
          const isRipple = el.className?.toString().includes('feedback') || el.className?.toString().includes('fill');
          if (isGraphic || isRipple) return false;

          const hasLabel = !!(el.getAttribute('aria-label') || el.getAttribute('title') || el.id);
          const hasText = el.innerText?.trim().length > 0;
          return hasLabel || el.tagName.includes('-') || ['BUTTON', 'A', 'INPUT'].includes(el.tagName) || (hasText && el.tagName !== 'DIV');
        }) || targetNode;

        const rawAttrs = {
           label: interactive.getAttribute('aria-label') || 
                    interactive.getAttribute('title') || 
                    interactive.querySelector('[aria-label]')?.getAttribute('aria-label') ||
                    interactive.querySelector('[title]')?.getAttribute('title'),
            role: interactive.getAttribute('role') || undefined,
            id: (interactive.id && !interactive.id.includes('__')) ? interactive.id : undefined,
          // class: interactive.className?.toString().trim() || undefined,
        };

        const cleanAttributes = Object.fromEntries(
          Object.entries(rawAttrs).filter(([_, v]) => v !== undefined && v !== "")
        );

        const lines = (interactive.innerText || '').split('\\n').map(l => l.trim()).filter(l => l.length > 0);
        const cleanText = lines.length > 0 ? lines[0].substring(0, 60) : "";

        const payload = {
          // url: window.location.href,
          // area: (eventPath.find(el => el instanceof HTMLElement && ['NAV', 'HEADER', 'MAIN'].includes(el.tagName)) || {tagName: 'BODY'}).tagName,
          target: {
             tag: interactive.tagName,
            selector: getStableSelector(interactive),
            text: cleanText,
            attributes: cleanAttributes
          }
        };

        window.saveToNode(payload);
      } catch (err) { console.error("Capture Error:", err); }
    }, { capture: true });

    window.addEventListener('click', (e) => {
      if (e.composedPath().some(el => el.id === 'my-ai-overlay-host')) return;
      if (recordingActive) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, { capture: true });
//for menu freezing
    (function() {
  let mX = 0, mY = 0;
  window.addEventListener('mousemove', (e) => { mX = e.clientX; mY = e.clientY; }, true);

  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      e.stopPropagation();

      // Fix 1: Ensure we target the Host specifically
      const host = document.getElementById('my-ai-overlay-host');
      if (host) host.style.pointerEvents = 'none';

      let el = document.elementFromPoint(mX, mY);

      // Fix 2: Enhanced Bubble Logic with SVG safety
      while (el && el.parentElement && el.tagName !== 'BODY') {
        const className = (el.className && typeof el.className === 'string') ? el.className.toLowerCase() : '';
        const isTarget = ['LI', 'BUTTON', 'A', 'INPUT', 'TEXTAREA'].includes(el.tagName);
        const hasRole = el.getAttribute('role'); 
        const isItem = className.includes('item') || className.includes('suggestion') || className.includes('menu');

        if (isTarget || hasRole || isItem) break;
        el = el.parentElement;
      }

      if (host) host.style.pointerEvents = 'auto';

      if (el && typeof window.saveToNode === 'function') {
        const originalOutline = el.style.outline;
        el.style.outline = '4px solid #a855f7';
        el.style.outlineOffset = '-4px';
        setTimeout(() => { el.style.outline = originalOutline; }, 400);

        window.saveToNode({
          target: {
            tag: el.tagName,
            selector: `xpath=${getCleanXPath(el)}`,
            text: el.innerText || el.value || ""
          }
        });
      }
    }
  }, true);

  // Fix 3: XPath generator that ignores "Garbage" dynamic IDs
  function getCleanXPath(el) {
    // If ID starts with a number or contains common dynamic prefixes, skip it
    if (el.id && !/^[0-9]|sbse|ooui-|yt-/.test(el.id)) return `//*[@id="${el.id}"]`;
    const parts = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let nb = 0;
      let s = el.previousSibling;
      while (s) {
        if (s.nodeType === Node.ELEMENT_NODE && s.tagName === el.tagName) nb++;
        s = s.previousSibling;
      }
      parts.unshift(`${el.tagName.toLowerCase()}[${nb + 1}]`);
      el = el.parentNode;
    }
    return parts.length ? `/${parts.join('/')}` : '';
  }
})();
  })();