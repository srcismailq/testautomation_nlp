import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { createOpenrouterStagehand } from "../stagehand-openrouter-client.js";
import { chromium } from "playwright-core";
import { createNgllamaStagehand } from "../stagehand-ngllama-client.js";

import readline from 'readline';


// Put this at the top once
const getMsg = (e: unknown) => e instanceof Error ? e.message : String(e);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const abortController = new AbortController();

// Helper to ask questions in CLI

const ask = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    // Sanitize for PowerShell
    const safeQuery = query.replace(/[\r\n]+/g, " ").replace(/'/g, "''");
    
    const psCommand = `
      Add-Type -AssemblyName System.Windows.Forms;
      $form = New-Object Windows.Forms.Form;
      $form.Text = 'Stagehand AI Control';
      $form.Size = New-Object Drawing.Size(400,180);
      $form.StartPosition = 'CenterScreen';
      $form.Topmost = $true;
      $form.FormBorderStyle = 'FixedDialog';
      $form.MaximizeBox = $false;

      $label = New-Object Windows.Forms.Label;
      $label.Location = New-Object Drawing.Point(20,20);
      $label.Size = New-Object Drawing.Size(350,30);
      $label.Text = '${safeQuery}';
      $form.Controls.Add($label);

      $textBox = New-Object Windows.Forms.TextBox;
      $textBox.Location = New-Object Drawing.Point(20,55);
      $textBox.Size = New-Object Drawing.Size(340,25);
      $form.Controls.Add($textBox);

      $btnOk = New-Object Windows.Forms.Button;
      $btnOk.Text = 'Send';
      $btnOk.Location = New-Object Drawing.Point(285,90);
      $btnOk.DialogResult = [Windows.Forms.DialogResult]::OK;
      $form.AcceptButton = $btnOk;
      $form.Controls.Add($btnOk);

      $form.Add_Shown({$textBox.Focus()});
      if ($form.ShowDialog() -eq [Windows.Forms.DialogResult]::OK) {
        Write-Output $textBox.Text;
      } else {
        Write-Output 'exit';
      }
    `;

    try {
      // Execute the PowerShell UI
      const result = execSync(`powershell -NoProfile -Command "${psCommand.replace(/\n/g, '')}"`, { encoding: 'utf8' }).trim();
      resolve(result || "exit");
    } catch (e) {
      resolve("exit");
    }
  });
};


// Allow "Ctrl+C" or a custom "stop" command to trigger the abort
rl.on('SIGINT', () => {
  console.log("\n[STOP] Termination signal received.");
  abortController.abort();
  process.exit();
});

//const stagehand = createOpenrouterStagehand({modelName:'nvidia/nemotron-nano-12b-v2-vl:free'}); 
const stagehand = createNgllamaStagehand({modelName:'ministral-3:14b', cacheDir:'act/test', verbose:0});

await stagehand.init();

const browser = await chromium.connectOverCDP(stagehand.connectURL());
  const context = await browser.newContext({ 
    bypassCSP: true // Essential for sites like YouTube
    
  });

  const pwPage = await context.newPage()

await pwPage?.goto("https://www.youtube.com");


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
        if (answer.toLowerCase() === 'n') break;
        

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

  rl.close();
  console.log("Session Ended.");
}

await startSession();
console.log('Success! Moving on...');
