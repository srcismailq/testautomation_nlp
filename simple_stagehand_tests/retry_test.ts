import { createOpenrouterStagehand } from "../stagehand-openrouter-client.js";
import { chromium } from "playwright-core";
import { createNgllamaStagehand } from "../stagehand-ngllama-client.js";

import readline from 'readline';


// Put this at the top once
const getMsg = (e: unknown) => e instanceof Error ? e.message : String(e);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const abortController = new AbortController();

// Helper to ask questions in CLI
const ask = (query: string) => new Promise<string>((resolve) => rl.question(query, resolve));

// Allow "Ctrl+C" or a custom "stop" command to trigger the abort
rl.on('SIGINT', () => {
  console.log("\n[STOP] Termination signal received.");
  abortController.abort();
  process.exit();
});

//const stagehand = createOpenrouterStagehand({modelName:'nvidia/nemotron-nano-12b-v2-vl:free'}); 
const stagehand = createNgllamaStagehand({modelName:'ministral-3:14b', cacheDir:'act/test'});

await stagehand.init();

const browser = await chromium.connectOverCDP(stagehand.connectURL());
  const context = await browser.newContext({ 
    bypassCSP: true // Essential for sites like YouTube
    
  });

  const pwPage = await context.newPage()

await pwPage?.goto("https://www.youtube.com");

const instruction = 'click on guide button in the  navbar'

while (true) {
  if (abortController.signal.aborted) break;

  try {
    console.log(`[AI] Observing: ${instruction}...`);
    const [action] = await stagehand.observe(`try finding: ${instruction}`);

    if (action) {
    if (action?.selector) {
        await pwPage.evaluate((sel) => {
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
      console.log(`[AI] Highlighted selector: ${action.selector}`);

      const answer = await ask("Satisfied? (y = Yes, n = No, s = Stop): ");
      if (answer.toLowerCase() === 's') break;
      if (answer.toLowerCase() === 'n') continue;

      // --- ACT RETRY LOOP ---
      let actionSuccessful = false;
      while (!actionSuccessful) {
        try {
          console.log("[AI] Executing Action...");
          await stagehand.act(`${instruction}, use selector: ${action.selector}`);
          actionSuccessful = true; // If it reaches here, it succeeded
        } catch (actError) {
          console.error(`[!] Action Failed: ${getMsg(actError)}`);
          
          const retryChoice = await ask("Action failed. (r = Retry Act, o = Re-Observe, s = Stop): ");
          
          if (retryChoice.toLowerCase() === 's') {
            abortController.abort();
            break; 
          }
          if (retryChoice.toLowerCase() === 'o') {
            // This breaks the INNER loop but stays in the OUTER loop to re-observe
            break; 
          }
          // If 'r', the while(!actionSuccessful) loop runs again
          console.log("Retrying the action...");
        }
      }

      if (actionSuccessful) {
        console.log("Success! Step complete.");
        break; 
      }
      
      // If we broke out of the inner loop via 'o' (Re-Observe), 
      // we check if we should continue the outer loop
      if (abortController.signal.aborted) break;
      continue; 

    } else {
      console.log('Not found yet, retrying...');
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (error) {
    console.error('Observation error:', getMsg(error));
    break; 
  }
}

console.log('Success! Moving on...');
