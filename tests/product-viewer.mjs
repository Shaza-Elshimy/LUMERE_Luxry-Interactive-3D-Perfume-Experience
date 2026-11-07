import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const url=process.env.TEST_URL||'http://localhost:5173';
async function state(page){return page.evaluate(async()=>{
 const entry=performance.getEntriesByType('resource').find(e=>e.name.includes('/@react-three_fiber.js?'));
 const {_roots}=await import(entry.name);const canvas=document.querySelector('.product-viewer canvas');
 const root=[..._roots.values()].map(r=>r.store.getState()).find(s=>s.gl.domElement===canvas);
 if(!root)return null;root.setDpr(.6);
 let meshes=0;root.scene.getObjectByName('product-bottle').traverse(o=>{if(o.isMesh)meshes++});
 return {camera:root.camera.position.toArray(),quaternion:root.camera.quaternion.toArray(),uuid:root.scene.getObjectByName('product-bottle').uuid,meshes,liquid:root.scene.getObjectByName('perfume-body').children[1].material.color.getHexString()};
});}
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
async function open(page,name){await page.getByRole('button',{name:`Discover ${name}`,exact:true}).click();await page.waitForSelector('.product-viewer[data-ready="true"]',{timeout:45000});await page.waitForTimeout(150);return page.locator('.product-viewer').boundingBox();}
async function waitMoved(page,before){for(let i=0;i<100;i++){const next=await state(page);if(distance(next.camera,before.camera)>.3)return next;await page.waitForTimeout(100);}throw Error('Drag did not change the actual 3D camera');}
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('#collection').scrollIntoViewIfNeeded();
 for(const [name,hex] of [['Lumière Noir','22150e'],['Lumière Blanc','c9b58b'],['Lumière Gold','81400c']]){
  const box=await open(page,name),initial=await state(page);assert(initial.meshes>=8,'Product must be real 3D geometry');assert.equal(initial.liquid,hex,'Selected fragrance material must match');
  await page.mouse.move(box.x+box.width*.25,box.y+box.height*.6);await page.waitForTimeout(250);assert(distance((await state(page)).camera,initial.camera)<.01,'Hover alone must not rotate the inspector');
  await page.mouse.move(box.x+box.width*.4,box.y+box.height*.6);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.35,{steps:12});await page.mouse.up();
  const moved=await waitMoved(page,initial);assert(distance(moved.quaternion,initial.quaternion)>.02);assert.equal(moved.uuid,initial.uuid);
  await page.getByRole('button',{name:'Reset 3D view'}).click();for(let i=0;i<100&&distance((await state(page)).camera,initial.camera)>.03;i++)await page.waitForTimeout(100);
  assert(distance((await state(page)).camera,initial.camera)<.03,`Reset must restore original view: ${JSON.stringify(initial.camera)} -> ${JSON.stringify((await state(page)).camera)}`);
  await page.locator('.product-viewer').focus();await page.keyboard.press('ArrowRight');await waitMoved(page,initial);
  await page.getByRole('button',{name:'Add to bag',exact:false}).click();assert(await page.locator('.bag-item').filter({hasText:name}).count());await page.getByRole('button',{name:'Close bag'}).click();
  await page.waitForTimeout(600);assert.equal(await page.locator('.product-viewer canvas').count(),0,'Viewer unmounts when modal closes');
  console.log(`PASS ${name}: live geometry, drag orbit, reset, keyboard, cart and cleanup`);
 }
 assert.deepEqual(errors,[]);await page.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(e.message));await mobile.goto(url,{waitUntil:'domcontentloaded'});
 const box=await open(mobile,'Lumière Gold'),initial=await state(mobile);const cdp=await mobile.context().newCDPSession(mobile);
 const x=box.x+box.width*.35,y=box.y+box.height*.6;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
 for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+box.width*.4*i/8,y:y-box.height*.15*i/8,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await waitMoved(mobile,initial);
 assert(await mobile.getByRole('dialog').isVisible());assert.equal(await mobile.locator('.product-viewer').evaluate(el=>getComputedStyle(el).touchAction),'none');
 await mobile.getByRole('button',{name:'Close product'}).click();assert.equal(await mobile.locator('.product-viewer').count(),0);assert.deepEqual(mobileErrors,[]);
 console.log('PASS mobile swipe, modal lifetime and close');await mobile.close();
}finally{await browser.close();}
