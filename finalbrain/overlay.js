// overlay.js
/**
 * OVERLAY UI - CRITICAL IMPLEMENTATION DETAILS:
 * 
 * 1. IIFE Wrapper (function() { ... })()
 *    Prevents "variable pollution." Without this, variables like 'isDragging' 
 *    could collide with the website's own scripts and crash the page.
 * 
 * 2. Shadow DOM Mode: 'open'
 *    If set to 'closed', shadow.getElementById() returns null. We use 'open' 
 *    so our script can find the #panel to attach drag listeners.
 * 
 * 3. Z-Index: 2147483647
 *    The maximum 32-bit integer. Necessary to stay above YouTube's "always-on-top" 
 *    video player layers and popups.
 * 
 * 4. Coordinate Offsets
 *    Calculated on mousedown to prevent the "snapping" jump. It stores the 
 *    distance between the mouse click and the corner of the host element.
 * 
 * 5. Isolation
 *    All styles are inside the Shadow DOM so the website's CSS (like YouTube's 
 *    Global styles) doesn't break our buttons or fonts.
 */
(function() {
  /**
   * DYNAMIC UI LOGIC:
   * - State 1 (Initial): Shows 'Start' and 'Finish'
   * - State 2 (Active): Shows 'Retry', 'Execute', and 'Next'
   * - 'Next' resets the UI back to State 1.
   */
  console.log('overlay.js: Script loaded at', new Date().toISOString());

  let onConfirm = null; 
  let backState = 'initial'; 
  let currentData = { view: 'initial' };

// Check if pullState is available immediately
if (typeof pullState === 'function') {
  console.log('overlay.js: pullState is available right away');
} else {
  console.log('overlay.js: pullState is NOT available yet');
}

// Check for preloaded state
if (window.__INITIAL_STATE__) {
  console.log('overlay.js: Found preloaded state:', window.__INITIAL_STATE__);
} else {
  console.log('overlay.js: No preloaded state found');
}
  const host = document.createElement('div');
  host.id = 'my-ai-overlay-host';
  host.style.cssText = 'position: fixed; top: 20px; left: 20px; z-index: 2147483647;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      #panel {
        width: 240px; background: #1a1a1a; color: white; border-radius: 12px;
        font-family: system-ui, sans-serif; box-shadow: 0 8px 30px rgba(0,0,0,0.5); border: 1px solid #333;
        overflow: hidden; /* Needed for minimize rounded corners */
      }
      #header { 
        background: #333; padding: 8px 12px; cursor: move; 
        display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid #444;
      }
      #body-content { padding: 15px; } /* Wrapper for content to hide it */
      .section { margin-bottom: 12px; }
      
      /* Change input to textarea */
      textarea { 
        width: 100%; height: 80px; padding: 6px; background: #000; border: 1px solid #444; 
        color: #fff; border-radius: 4px; box-sizing: border-box; resize: none;
      }
      
      .btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
      button { 
        flex: 1; padding: 6px 10px; cursor: pointer; border-radius: 6px; 
        border: none; background: #444; color: white; font-weight: bold; 
      }
      #min-btn { flex: none; width: 25px; padding: 2px; background: #555; font-size: 10px; }
      .hidden { display: none; }
      
      /* Toggle Switch Styles remain the same... */
      .switch { position: relative; display: inline-block; width: 40px; height: 20px; }
      .switch input { opacity: 0; width: 0; height: 0; }
      .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #444; transition: .4s; border-radius: 20px; }
      .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
      input:checked + .slider { background-color: #2563eb; }
      input:checked + .slider:before { transform: translateX(20px); }
    </style>

    <div id="panel">
      <!-- Added Header with Minimize Button -->
      <div id="header">
        <span style="font-size: 11px;">AI TOOLBOX</span>
        <button id="min-btn">_</button>
      </div>

      <div id="body-content">
        <div class="section">
          <!-- Swapped input for textarea -->
          <textarea id="main-input" placeholder="Enter command..."></textarea>
        </div>

        <div class="section" style="display: flex; align-items: center; gap: 10px;">
          <label class="switch"><input type="checkbox" id="main-toggle"><span class="slider"></span></label>
          <span style="font-size: 12px;">Toggle Option</span>
          <span id="capture-status" style="font-size: 10px; color: #0f0; margin-left: auto;"></span>

        </div>

        <div class="section">
            <!-- Change the label to "Protect Menu" -->
            <button id="freeze-btn" style="background: #6b21a8; width: 100%; margin-bottom: 8px;">Protect Menu: OFF</button>
        </div>

        <div id="state-initial" class="btn-row">
          <button id="start-btn" class="start-btn">Start</button>
          <button id="finish-btn">Finish</button>
        </div>

        <div id="state-active" class="btn-row hidden">
            <button id="retry-btn">Retry</button>
            <button id="execute-btn" style="background: #059669;">Execute</button>
            <button id="delete-btn" style="background: #dc2626;">Delete</button>
            <button id="save-btn" style="background: #2563eb;">Save</button>
        </div>

        <div id="state-confirm" class="btn-row hidden">
            <div style="width: 100%; text-align: center; font-size: 11px; margin-bottom: 8px; color: #ff9800;" id="confirm-msg">Are you sure?</div>
            <button id="confirm-yes" style="background: #059669;">Yes</button>
            <button id="confirm-no" style="background: #444;">No</button>
        </div>

        <div class="section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <span style="font-size: 11px; color: #aaa;">Raw Capture Data:</span>
                <button id="toggle-raw-btn" style="flex:none; width:auto; font-size:9px; padding: 2px 5px; background:#333;">Show</button>
            </div>
            <!-- This is the second textarea, hidden by default -->
            <textarea id="raw-data-viewer" class="hidden"  style="height: 100px; font-size: 10px; color: #4ade80; border-color: #333;"></textarea>
        </div>

        <div id="file-section" class="section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <span style="font-size: 11px; color: #aaa;">Recorded Steps:</span>
                <button id="refresh-btn" style="flex:none; width:auto; font-size:9px; padding: 2px 5px;">Refresh</button>
            </div>
            <div id="file-list" style="max-height: 100px; overflow-y: auto; font-size: 10px; background: #000; padding: 5px; border-radius: 4px; border: 1px solid #333;">
                <!-- Files will be injected here -->
            </div>
        </div>

      </div>
    </div>
  `;

  // Element Selectors
  const bodyContent = shadow.getElementById('body-content'); // New
  const minBtn = shadow.getElementById('min-btn');           // New
  const header = shadow.getElementById('header');           // New
  const stateInitial = shadow.getElementById('state-initial');
  const stateActive = shadow.getElementById('state-active');
  const startBtn = shadow.getElementById('start-btn');
  const panel = shadow.getElementById('panel');
  const deleteBtn = shadow.getElementById('delete-btn');
  const saveBtn = shadow.getElementById('save-btn');
  const retryBtn = shadow.getElementById('retry-btn');
  const executeBtn = shadow.getElementById('execute-btn');

  const stateConfirm = shadow.getElementById('state-confirm');
  const confirmMsg = shadow.getElementById('confirm-msg');
  const confirmYes = shadow.getElementById('confirm-yes');
  const confirmNo = shadow.getElementById('confirm-no');

  const mainToggle = shadow.getElementById('main-toggle');

  const rawViewer = shadow.getElementById('raw-data-viewer');
  const toggleRawBtn = shadow.getElementById('toggle-raw-btn');

  let isMinimized = false;
  minBtn.onclick = () => {
    isMinimized = !isMinimized;
    bodyContent.classList.toggle('hidden', isMinimized);
    minBtn.textContent = isMinimized ? '▢' : '_';
    panel.style.width = isMinimized ? '140px' : '240px';
  };

  // STATE TOGGLE LOGIC
  startBtn.onclick = async () => {

    const text = shadow.getElementById('main-input').value.trim();
    const json = shadow.getElementById('raw-data-viewer').value.trim();
        if (!text) {
        alert("Please enter a command/intent in the main textarea first.");
        return;
    }

    startBtn.disabled = true;
    startBtn.textContent = "AI Thinking...";

    const success = await window.startStagehand(text, json);

    startBtn.disabled = false;
    startBtn.textContent = "Start";

    if (success) {
        
        await window.pushState(text, json, 'active');
    } else {
        alert("AI couldn't find a matching element.");
    }
  };



    // Handle "Yes" click
  confirmYes.onclick = async () => {
  if (onConfirm) {
    confirmYes.disabled = true;
    await onConfirm(); 
    confirmYes.disabled = false;
  }
  // Clear action and go back to initial
  await window.pushState(shadow.getElementById('main-input').value, '', 'initial', null);
  onConfirm = null; 
};

confirmNo.onclick = async () => {
  onConfirm = null;
  // Use the globally stored currentData to decide where to go back to
  const returnView = (currentData.view === 'confirm') ? 'active' : 'initial'; 
  await window.pushState(shadow.getElementById('main-input').value, '', returnView, null);
};
  

    saveBtn.onclick = async () => {
  console.log("DEBUG 1: Save Button Clicked");
  
  // Use the local shadow variables to get the latest values
  const textVal = shadow.getElementById('main-input').value;
  const jsonVal = shadow.getElementById('raw-data-viewer').value;

  // IMPORTANT: Ensure you are passing FOUR arguments. 
  // If you pass 3, 'action' becomes undefined in Node.
  await window.pushState(textVal, jsonVal, 'confirm', 'save');
};

 deleteBtn.onclick = async () => {
  console.log('ATTEMPTING to delete push');
  
  // Get values directly from the shadow DOM to be safe
  const text = shadow.getElementById('main-input').value;
  const json = shadow.getElementById('raw-data-viewer').value;
  
  try {
    // Explicitly pass all 4 arguments
    await window.pushState(text, json, 'confirm', 'delete');
    console.log('DEBUG: PushState call finished');
  } catch (err) {
    console.error('DEBUG: PushState FAILED:', err);
  }
};


  // Logic for Retry/Execute (Placeholder for your future backend calls)
  retryBtn.onclick = async () => {
    const text = shadow.getElementById('main-input').value.trim();
    const json = shadow.getElementById('raw-data-viewer').value.trim();
    retryBtn.textContent = "...";
    await window.startStagehand(text, json);
    retryBtn.textContent = "Retry";
  };

executeBtn.onclick = async () => {
  executeBtn.disabled = true;
  executeBtn.textContent = "Acting...";

  try {
    // 1. We MUST await the result so we don't reset too early
    const success = await window.executeStagehand(); 

    if (success) {
      executeBtn.textContent = "Success!";
    } else {
      executeBtn.textContent = "Failed";
    }
  } catch (e) {
    console.error("Execution error:", e);
    executeBtn.textContent = "Error";
  }

  // 2. Only reset the UI after the AI is completely finished
  setTimeout(async () => {
    executeBtn.disabled = false;
    executeBtn.textContent = "Execute";
    // Now it's safe to tell the other tabs we are going back to 'initial'
    await window.pushState(mainInput.value, rawViewer.value, 'initial');
  }, 15000);
};
  
// TOGGLING THE ELEMENT CAPTURE RECORDER
    mainToggle.onchange = (e) => {
        const isActive = e.target.checked;
        console.log("Toggle flipped:", isActive);
        
        if (typeof window.setRecordingMode === 'function') {
                window.setRecordingMode(isActive);
            } else {
                console.error("setRecordingMode not found! Recorder script failed to load.");
            }
    };

    //TOGGLING THE RAW ELEMENT CAPTURE OUTPUT
    toggleRawBtn.onclick = () => {
    const isHidden = rawViewer.classList.toggle('hidden');
    toggleRawBtn.textContent = isHidden ? 'Show' : 'Hide';
    };

  // DRAG LOGIC
   let isDragging = false, offset = { x: 0, y: 0 };
  header.onmousedown = (e) => {
    // 1. CRITICAL: Stop the website underneath from seeing this click
    e.stopPropagation(); 
    // 2. Prevent the browser from trying to "select" text or images while dragging
    e.preventDefault(); 


    if (e.target === minBtn) return; // Don't drag if clicking the minimize button
    isDragging = true;
    offset = { x: host.offsetLeft - e.clientX, y: host.offsetTop - e.clientY };
  };
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    host.style.left = (e.clientX + offset.x) + 'px';
    host.style.top = (e.clientY + offset.y) + 'px';
  });
  document.addEventListener('mouseup', () => isDragging = false);

  //////////////////////////////////////////////////////////////////////

  const fBtn = shadow.getElementById('freeze-btn');
fBtn.textContent = "Hotkey: Alt+Shift+S";
fBtn.style.background = "#444";

fBtn.onmousedown = (e) => {
  e.preventDefault(); // Don't steal focus!
  const oldText = fBtn.textContent;
  fBtn.textContent = "Hover & Press Alt+Shift+S";
  fBtn.style.background = "#6b21a8";
  
  setTimeout(() => {
    fBtn.textContent = oldText;
    fBtn.style.background = "#444";
  }, 3000);
};

  ////////////////////////////////////////////////////////
const fileList = shadow.getElementById('file-list');
const refreshBtn = shadow.getElementById('refresh-btn');

const refreshFiles = async () => {
  // Call the bridge function we defined in finalbrain.ts
  const files = await window.listFiles();
  fileList.innerHTML = ''; 

  if (files.length === 0) {
    fileList.innerHTML = '<div style="color: #666; text-align: center; padding: 5px;">No steps found</div>';
    return;
  }

  // Natural numeric sort: Step 1, Step 2, Step 10
  files.sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));

  files.forEach(f => {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #222;';
    row.innerHTML = `<span style="color: #4ade80;">${f}</span><span class="del-btn" style="color: red; cursor: pointer; padding: 0 5px;">×</span>`;
    
    row.querySelector('.del-btn').onclick = async () => {
      confirmMsg.textContent = `Delete ${f}?`;
      
      backState = 'initial'; 

      // 2. Define the confirm logic specifically for this file
      onConfirm = async () => {
        console.log(`Deleting file: ${f}`);
        await window.removeFile(f);
        if (typeof refreshFiles === 'function') await refreshFiles();
      };

      // 3. PASS 4 ARGUMENTS: View must be 'confirm', Action must be 'delete'
      const textVal = shadow.getElementById('main-input').value;
      const jsonVal = shadow.getElementById('raw-data-viewer').value;
      await window.pushState(textVal, jsonVal, 'confirm', 'delete');
    };
    fileList.appendChild(row);
  });
};

// Hook up triggers
refreshBtn.onclick = refreshFiles;

refreshFiles(); // Run once on startup

window.addEventListener('element-captured', (e) => {
  const data = e.detail;
  const statusLabel = shadow.getElementById('capture-status');
  const rawViewer = shadow.getElementById('raw-data-viewer');
  
  // 1. Show vague message to user
  statusLabel.textContent = `Captured <${data.target.tag.toLowerCase()}>`;
  
  // 1. Convert the JSON object to a pretty-printed string
  // The '2' at the end adds nice indentation/spaces
  rawViewer.value = JSON.stringify(data, null, 2);
  
  // 2. Automatically show the raw viewer so the user sees the data arrived
  rawViewer.classList.remove('hidden');
  shadow.getElementById('toggle-raw-btn').textContent = 'Hide';
  
  
});



// 2. The "Sync" Listener (For Broadcasts)
window.addEventListener('sync-ui', (e) => {
  const data = e.detail;
  if (!data) return;

  console.log("DEBUG 4: Browser received sync-ui event. Data:", data);

  currentData = data; // Store this for confirmNo to use later

  const mInput = shadow.getElementById('main-input');
  const rViewer = shadow.getElementById('raw-data-viewer');


  // 1. Sync text (don't overwrite if the user is currently typing in this tab)
  if (shadow.activeElement !== mInput) {
    mInput.value = data.text || '';
  }
  if (shadow.activeElement !== rViewer) {
    rViewer.value = data.json || '';
  }

  if (data.action === 'save') {
    confirmMsg.textContent = "Confirm SAVE?";
    onConfirm = async () => {
      console.log("Saving to file:", data.text);
      //await window.saveStepToFile(data.text); // Ensure this function exists in finalbrain.ts
    };
  } else if (data.action === 'delete') {

    const isFileDelete = confirmMsg.textContent.startsWith("Delete");
    
    if (!isFileDelete) {
      confirmMsg.textContent = "Confirm DELETE text?";
      onConfirm = async () => {
      console.log("DEBUG: Executing Delete...");
      // Clear the inputs locally
      mInput.value = '';
      rViewer.value = '';
      // Tell the bridge to clear the central state
      await window.pushState('', '', 'initial', null);
    };

    }
  
  }
  // 2. Sync visibility (Single source of truth)
  stateInitial.classList.toggle('hidden', data.view !== 'initial');
  stateActive.classList.toggle('hidden', data.view !== 'active');
  stateConfirm.classList.toggle('hidden', data.view !== 'confirm');
});

window.pullState().then(data => {
    console.log('overlay.js: pullState returned:', data);
  if (data) {
    // We manually fire the 'sync-ui' event so our listener handles the setup
    window.dispatchEvent(new CustomEvent('sync-ui', { detail: data }));
  }
}).catch(err => {
  console.error("overlay.js: Initial hydration failed:", err);
  // Fallback: use preloaded state or default
  const fallbackState = window.__INITIAL_STATE__ || { text: '', json: '', view: 'initial' };
  console.log('overlay.js: Using fallback state:', fallbackState);
  window.dispatchEvent(new CustomEvent('sync-ui', { detail: fallbackState }));
});

// Initial file list load
if (typeof refreshFiles === 'function') refreshFiles();

})();