import { spawn } from 'child_process';
import path from 'path';

import fs from 'fs';

import { createOpenrouterStagehand } from "./stagehand-openrouter-client.js";
import { chromium } from "playwright-core";
import { createNgllamaStagehand } from "./stagehand-ngllama-client.js";


const getMsg = (e: unknown) => e instanceof Error ? e.message : String(e);

// Find the electron binary inside your cltron folder
const cltronPath = path.join(process.cwd(), 'cltron');

// 2. Use 'npx electron' - it's the most reliable way to find the binary on Windows
const ui = spawn('npx', ['electron', '.'], { 
    cwd: cltronPath,
    shell: true, // Crucial for Windows to handle npx/cmd
    stdio: ['pipe', 'pipe', 'inherit'] 
});

// Kill UI when main script dies
process.on('exit', () => ui.kill());
process.on('SIGINT', () => { ui.kill(); process.exit(); });
const ask = (query: string): Promise<string> => {
  // Create a small text file that Electron will watch
  const promptPath = path.join(process.cwd(), 'cltron', 'prompt.txt');
  fs.writeFileSync(promptPath, query);

  return new Promise((resolve) => {
    const handler = (data: Buffer) => {
      const str = data.toString();
      if (str.includes('USER_CMD:')) {
        const parts = str.split('USER_CMD:');
        const cmd = parts[parts.length - 1]!.trim();
        ui.stdout!.off('data', handler);
        resolve(cmd);
      }
    };
    ui.stdout!.on('data', handler);
  });
};

const stagehand = createNgllamaStagehand({modelName:'ministral-3:14b', cacheDir:'act/test', verbose:0});

await stagehand.init();

const browser = await chromium.connectOverCDP(stagehand.connectURL());
  const context = await browser.newContext({ 
    bypassCSP: true // Essential for sites like YouTube
    
  });

  const pwPage = await context.newPage()

await pwPage?.goto("https://www.opencart.com");


async function startSession() {
  while (true) { // Master Session Loop
    const instruction = await ask("\n[NEW TASK] What should I do next? (or type 'exit'): ");
    if (instruction.toLowerCase() === 'exit') break;

    // Fix: Re-create controller so 'Stop' works for every new instruction
    let currentAbortController = new AbortController();

    while (true) { // Observation/Act Loop
      if (currentAbortController.signal.aborted) break;

      try {
        console.log(`[AI] Observing: ${instruction}...`);
        const [action] = await stagehand.observe(`try finding: ${instruction}`);

        if (!action) {
            console.log('Not found yet.');
            const retryChoice = await ask("AI can't find it. (r = Retry, n = New Instruction, s = Stop): ");
            
            if (retryChoice.toLowerCase() === 'n') {
                break; // Breaks the observation loop to ask for a [NEW TASK]
            }
            if (retryChoice.toLowerCase() === 's') {
                process.exit(); 
            }
        // If 'r', it just continues the loop naturally
        continue; 
        }

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

        const answer = await ask("Satisfied? (y = Yes, n = No, s = Stop, rn=Retry with new instruction): "); // at this stage, i want ability to pass rn - retry with new instruction
        if (answer.toLowerCase() === 's') return; 
        if (answer.toLowerCase() === 'n') continue;
        if (answer.toLowerCase() === 'rn') break;
        

        // --- ACT RETRY LOOP ---
        let actionSuccessful = false;
        let shouldReObserve = false;

        while (!actionSuccessful && !shouldReObserve) {
          try {
            console.log("[AI] Executing Action...");
            const actResult = await stagehand.act(`${instruction}, use selector: ${action.selector}`);

            if (actResult && actResult.success === false) {
                console.log(`[!] AI reported a problem: ${actResult.message}`);
                // We jump to the catch block manually
                throw new Error(actResult.message || "AI failed to perform the specific method.");
            }

            actionSuccessful = true; 
          } catch (actError) {
            console.error(`[!] Action Failed: ${getMsg(actError)}`);
            const retryChoice = await ask("Action failed. (r = Retry, o = Re-Observe, s = Stop): ");
            
            if (retryChoice.toLowerCase() === 's') {
              currentAbortController.abort();
              break; 
            }
            if (retryChoice.toLowerCase() === 'o') {
              shouldReObserve = true; // Flag to exit inner loop and restart observation
              break; 
            }
            console.log("Retrying the action...");
          }
        }
       
        if (actionSuccessful) {
          console.log("Success! Task complete.");

        await pwPage.evaluate(() => {
            document.querySelectorAll('[data-ai-found]').forEach(el => {
            (el as HTMLElement).style.outline = '';
            });
        }).catch(() => {});

          break; // Exit Observation loop -> Back to Master Loop for new instruction
        }
        
        if (shouldReObserve) continue; // Restarts the Observation loop
        if (currentAbortController.signal.aborted) break; // Exits to Master Loop

      } catch (error) {
        console.error('Observation error:', getMsg(error));
        break; 
      }
    }
  }

  console.log("Session Ended.");
}

await startSession();
if (fs.existsSync('./cltron/prompt.txt')) fs.unlinkSync('./cltron/prompt.txt');
//console.log('Success! Moving on...');
