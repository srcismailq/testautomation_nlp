import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createNgllamaStagehand } from "../stagehand-ngllama-client.js";
import type { Stagehand, PatchrightPage } from '@browserbasehq/stagehand';



/**
 * CRITICAL ARCHITECTURE NOTES - DO NOT REMOVE:
 * 
 * 1. bypassCSP: true 
 *    Problem: High-security sites (YouTube/Google) use Content Security Policy to block 
 *    injected scripts and "TrustedHTML" violations. This flag disables those checks.
 * 
 * 2. window.__name Helper
 *    Problem: ts-node/esbuild injects a `__name` helper for function naming. Since this 
 *    helper isn't defined in the browser, the script crashes instantly. This dummy 
 *    function "bridges" the gap.
 * 
 * 3. context.addInitScript (Order of Execution)
 *    Problem: If called after context.newPage() or page.goto(), the overlay won't 
 *    appear on the first load. It MUST be registered on the context before the page exists.
 * 
 * 4. document.readyState Check
 *    Problem: If the script fires before <body> exists, appendChild fails. If it fires 
 *    after DOMContentLoaded, the listener never triggers. This check handles both.
 * 
 * 5. Shadow DOM (in overlay.js)
 *    Problem: Site-wide CSS (like YouTube's) often "mangles" the overlay UI. Shadow DOM 
 *    encapsulates our styles so they stay consistent regardless of the host site.
 */

/* 
beautiful. now, this is what needs to happen. when i type something in the textarea, and click on start, that text will go in this code:
const [
action] = await stagehand.observe("Find the most relevant element:" + textarea content)

if i click on retry, this line of code runs again.but 

if i click on execute, this executes:  
if (action) {
  await stagehand.act(action);
}


*/
// custom bridhe function declaration for persistent state of verlay
declare global {
  interface Window {
    getGlobalState: () => Promise<{ text: string, json: string, view: string }>;
  }
}


// 1. Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Handle arguments
const [url, folderName] = process.argv.slice(2);

if (!url || !folderName) {
  console.error('Usage: ts-node launch.ts <url> <folder-name>');
  process.exit(1);
}

// 3. Create the folder (relative to project root)
// Define the base test directory
const BASE_TEST_DIR = 'testfolder';

// 2. Create the path: testfolder/<folderName>
const folderPath = path.resolve(process.cwd(), BASE_TEST_DIR, folderName);

if (!fs.existsSync(folderPath)) {
  fs.mkdirSync(folderPath, { recursive: true });
  console.log(`Created empty folder: ${folderPath}`);
} else {
  console.log(`Using existing folder: ${folderPath}`);
}

const stagehand = createNgllamaStagehand({ 
  modelName: 'ministral-3:14b', 
  cacheDir: folderPath // This now points to testfolder/whateverUserGave
});



async function launch() {
  const overlayPath = path.resolve(__dirname, 'overlay.js');
  const recorderPath = path.resolve(__dirname, 'recorder.js');
  
  
  if (!fs.existsSync(overlayPath)) {
    console.error(`Error: Could not find overlay file at ${overlayPath}`);
    process.exit(1);
  }
  
  const overlayCode = fs.readFileSync(overlayPath, 'utf8');
  const recorderCode = fs.readFileSync(recorderPath, 'utf8');

  // 4. Setup Browser and Context
  await stagehand.init();
  const browser = await chromium.connectOverCDP(stagehand.connectURL());
  const context = await browser.newContext({ 
    bypassCSP: true // Essential for sites like YouTube
    
  });
  

 interface UIState {
  text: string;
  json: string;
  view: string;
  action: string | null; // This allows both strings and nulls
}

// Initialize with the type
let uiState: UIState = { 
  text: '', 
  json: '', 
  view: 'initial', 
  action: null 
};



  console.log('Playwright: Initial uiState:', uiState); // <-- Add this
await context.exposeFunction('pullState', () => {
  console.log('Playwright: pullState called, returning:', uiState);
  return uiState;
});

await context.exposeFunction('pushState', async (text: string, json: string, view: string, action: string) => {
  // Use '|| null' to clean up 'undefined' or empty strings
  const cleanAction = action || null;
  
  console.log(`DEBUG 2: Node received - View: ${view}, Action: ${cleanAction}`);

  uiState = { 
    text: text || '', 
    json: json || '', 
    view: view || 'initial', 
    action: cleanAction 
  };

  context.pages().forEach(p => {
    p.evaluate((data) => {
      // DEBUG 3:
      console.log("DEBUG 3: Sending to page:", data);
      window.dispatchEvent(new CustomEvent('sync-ui', { detail: data }));
    }, uiState).catch(() => {}); 
  });
});


  // 5. Register the Init Script BEFORE creating the page
  
  // DEFINE THE MISSING HELPER FIRST
  await context.addInitScript(() => {
  // This satisfies esbuild's naming helper
  (window as any).__name = (func: any) => func;
  });




// NOW register your actual overlay script
// finalbrain.ts
 await context.addInitScript((code) => {
  if (window.self !== window.top) return; // Ignore iframes

  const inject = async () => {
    // 1. Prevent double injection
    if (document.getElementById('my-ai-overlay-host')) return;

    // 2. Inject the UI
    const script = document.createElement('script');
    script.textContent = code;
    document.body.appendChild(script);

    document.addEventListener('fullscreenchange', () => {
          const host = document.getElementById('my-ai-overlay-host');
          const full = document.fullscreenElement;
          if (host && full) full.appendChild(host);
          else if (host && !full) document.body.appendChild(host);
        });

    // 3. THE HYDRATOR: Retry until the Node bridge is "Hot"
    let attempts = 0;
    const sync = async () => {
      // Check if Playwright has finished wiring the bridge
      if (typeof (window as any).pullState === 'function') {
        const data = await (window as any).pullState();
        window.dispatchEvent(new CustomEvent('sync-ui', { detail: data }));
      } else if (attempts < 20) { // Try for up to 1 second
        attempts++;
        setTimeout(sync, 50);
      }
    };
    sync();
  };

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
}, overlayCode);

  

  // Inject the Recorder (Logic only, no UI elements)
  await context.addInitScript((code) => {
  if (window.self !== window.top) return;

  const injectRecorder = () => {
    const script = document.createElement('script');
    script.textContent = code;
    (document.head || document.documentElement).appendChild(script);
    console.log("🚀 Recorder Script Injected");
  };

  if (document.body) {
    injectRecorder();
  } else {
    // Wait for body if it's not ready
    const observer = new MutationObserver(() => {
      if (document.body) {
        injectRecorder();
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true , subtree:true});
  }
}, recorderCode);



  // 6. Now open the page and navigate
  const page = await context.newPage();
  

  // --- FILE SYSTEM BRIDGE ---
  // This allows the browser to ask Node for a list of files in your specific folder
  await page.exposeFunction('listFiles', async () => {
    if (!fs.existsSync(folderPath)) return [];
    return fs.readdirSync(folderPath); // returns just the filenames
  });

  // This allows the browser to tell Node to delete a specific file
  await page.exposeFunction('removeFile', async (fileName: string) => {
    const filePath = path.join(folderPath, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[File System] Deleted: ${fileName}`);
      return true;
    }
    return false;
  });
  //toggle button element text.
  await page.exposeFunction('saveToNode', (payload: any) => {
  console.log("[Capture] Element intercepted:", payload.target.text || payload.target.selector);
  // This sends the data back to the overlay via a custom event
  page.evaluate((data) => {
    window.dispatchEvent(new CustomEvent('element-captured', { detail: data }));
  }, payload);
  });

  // --- STAGEHAND AI BRIDGE ---
  let currentAction: any = null;

  // 1. Handles 'Start' and 'Retry' - This "Observes" the page
  await page.exposeFunction('startStagehand', async (instruction: string, rawJson: string) => {
      // If there is no instruction, we don't even call the AI
    if (!instruction || instruction.trim() === "") {
      console.error("[AI] Error: No user intent provided.");
      return false;
    }

    console.log(`[AI] Starting Observation...`);
    try {
      // We combine your manual typing + the recorder's technical data for a "Super Prompt"
      const prompt = rawJson ? `Intent: ${instruction} | Context: ${rawJson}` : instruction;

      
      const [action] = await stagehand.observe("UNRELATED HIGH LEVEL COMMAND:Dont say click(), say click in your response. command:" + prompt);
      
      currentAction = action; // Store it globally in this file for the Execute step
      console.log(`[AI] Observation complete. Element found: ${!!action}`);
      
      currentAction = action;
      // for highlighting observed element in the dom!
      if (action?.selector) {
        await page.evaluate((sel) => {
          // 1. Cleanup: Remove highlight from any previous elements
          document.querySelectorAll('[data-ai-found]').forEach(el => {
            (el as HTMLElement).style.outline = '';
            el.removeAttribute('data-ai-found');
          });

          // 2. XPath Format Fix: Remove 'xpath=' prefix if Stagehand added it
          const cleanSelector = sel.startsWith('xpath=') ? sel.replace('xpath=', '') : sel;

          // 3. Robust Finder: Try CSS first, then XPath
          let el: HTMLElement | null = null;
          try {
            el = document.querySelector(cleanSelector);
          } catch (e) {
            // If querySelector fails (likely an XPath), use evaluate
            const result = document.evaluate(cleanSelector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            el = result.singleNodeValue as HTMLElement;
          }

          if (el) {
            // 4. Apply Neon Highlight
            el.style.setProperty('outline', '5px solid #00ff00', 'important');
            el.style.outlineOffset = '-5px';
            el.setAttribute('data-ai-found', 'true'); // Mark it for cleanup later
            
            // 5. Scroll but don't get stuck under the Overlay
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, action.selector);
      }
      
      return !!action; // Returns true/false to the overlay
    } catch (e) {
      console.error("[AI] Observation Error:", e);
      return false;
    }
  });

  // 2. Handles 'Execute' - This performs the "Act"
  await page.exposeFunction('executeStagehand', async () => {
    //const allPages = context.pages();
   // const activePage = allPages[allPages.length - 1];

  // 1. IMPORTANT: Tell Stagehand to focus on the new page
  // This ensures the 'act' command is sent to the right tab
  

    // removes observe hightlight
    await page!.evaluate(() => {
      const el = document.querySelector('[data-ai-found]') as HTMLElement;
      if (el) el.style.outline = '';
    }).catch(() => {});

    if (!currentAction) {
      console.error("[AI] No action stored. Did you click Start first?");
      return false;
    }
    
    console.log(`[AI] Executing Action...`);

     const userGoal = uiState.text; 
     // 1. Get the current text from the UI state 
    // (Assuming uiState.text contains your textarea content)
    try {
      // 3. Perform the act
      console.log('THIS IS CURRENT ACTION')
      console.log(currentAction)
      const combinedPrompt = `Using the element with selector "${currentAction.selector}", ${userGoal}`;

      await stagehand.act(combinedPrompt, {
        page: page as unknown as PatchrightPage
      }); 
      
      // 4. ONLY WIPE ON SUCCESS
      // This way, if it fails, currentAction is still saved for the next click!
      currentAction = null; 
      return true;
    } catch (e) {
      console.error("[AI] Execution Error:", e);
      // We do NOT set currentAction to null here
      return false;
    }
  });
  //////////// STAGEHAND AI BRIDGE ENDS////////////////

  

  console.log(`Navigating to: ${url}`);
  await page.goto(url!);

  console.log('UI Overlay registered. Browser is ready.');
}

launch().catch(err => {
  console.error("Failed to launch:", err);
});
