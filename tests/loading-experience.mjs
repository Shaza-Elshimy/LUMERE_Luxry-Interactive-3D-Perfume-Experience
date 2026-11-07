import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 let release;const gate=new Promise(resolve=>{release=resolve;});
 await page.route('**/src/components/PerfumeScene.tsx*',async route=>{await gate;await route.continue();});
 await page.goto(process.env.TEST_URL||'http://localhost:5173',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#intro');
 const placeholderVisibility=await page.locator('#intro .mini-bottle').evaluate(el=>getComputedStyle(el).visibility);
 console.log('Before 3D chunk loads:',placeholderVisibility);
 release();
 assert.equal(placeholderVisibility,'hidden','Reload must not show a substitute perfume before the 3D scene loads');
 await page.waitForSelector('#campaign[data-webgl="ready"]',{timeout:45000});
 assert.equal(await page.locator('#home .mini-bottle').evaluate(el=>getComputedStyle(el).visibility),'hidden');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#intro');
 assert.equal(await page.locator('#intro .mini-bottle').evaluate(el=>getComputedStyle(el).visibility),'hidden');
 console.log('PASS slow scene loading and reload without placeholder flash');
 const fallback=await browser.newPage();
 await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2'||type==='webgl'||type==='experimental-webgl')return null;return original.call(this,type,...args);};});
 await fallback.goto(process.env.TEST_URL||'http://localhost:5173',{waitUntil:'domcontentloaded'});
 await fallback.waitForSelector('#campaign[data-webgl=unavailable]');
 assert.equal(await fallback.locator('#intro .mini-bottle').evaluate(el=>getComputedStyle(el).visibility),'visible');
 assert.equal(await fallback.locator('#home .mini-bottle').evaluate(el=>getComputedStyle(el).visibility),'visible');
 console.log('PASS fallback appears only when WebGL is unavailable');await fallback.close();
 await page.close();
}finally{await browser.close();}
