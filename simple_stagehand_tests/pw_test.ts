import { createOpenrouterStagehand } from "../stagehand-openrouter-client.js";
import { chromium } from "playwright-core";
import { createNgllamaStagehand } from "../stagehand-ngllama-client.js";

//const stagehand = createOpenrouterStagehand({modelName:'nvidia/nemotron-nano-12b-v2-vl:free'}); 
const stagehand = createNgllamaStagehand({modelName:'ministral-3:14b', cacheDir:'act/test'});

await stagehand.init();

const browser = await chromium.connectOverCDP(stagehand.connectURL());
  const context = await browser.newContext({ 
    bypassCSP: true // Essential for sites like YouTube
    
  });

  const pwPage = await context.newPage()

await pwPage?.goto("https://www.saucedemo.com");

//await pwPage?.pause();
const [action] = await stagehand.observe('enter standard_user in username field')
if (action){
  console.log(action)
  await stagehand.act('enter standard_user in username field, use selector:' + action.selector)
} else {
  console.log('sorry hehehehe')
  await stagehand.close();
}

