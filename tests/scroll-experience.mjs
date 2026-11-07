import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const url=process.env.TEST_URL||'http://localhost:5173';
async function read(page){return page.evaluate(async()=>{
 const dep=name=>performance.getEntriesByType('resource').find(e=>e.name.includes(`/${name}.js?`)).name;
 const {_roots}=await import(dep('@react-three_fiber'));const state=[..._roots.values()][0].store.getState();
 const {Box3,Vector3}=await import(dep('three'));const {default:gsap}=await import(dep('gsap'));const {ScrollTrigger}=await import(dep('gsap_ScrollTrigger'));
 const timeline=gsap.getById('perfume-reveal'),trigger=ScrollTrigger.getById('perfume-reveal-scroll');
 const group=state.scene.getObjectByName('perfume-presentation'),layout=state.scene.getObjectByName('perfume-layout');
 state.scene.updateMatrixWorld(true);state.camera.updateMatrixWorld(true);
 const c=document.querySelector('.scroll-scene').getBoundingClientRect();const b=new Box3().setFromObject(group),points=[];
 for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z]){const p=new Vector3(x,y,z).project(state.camera);points.push({x:c.left+(p.x+1)*c.width/2,y:c.top+(1-p.y)*c.height/2});}
 const rect=el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
 const hero=document.getElementById('home'),intro=document.getElementById('intro');
 return{yaw:group.rotation.y,position:group.position.toArray(),camera:state.camera.position.toArray(),mouse:state.scene.getObjectByName('perfume-interaction').rotation.y,uuid:group.uuid,
 box:{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))},
 intro:rect(document.querySelector('[data-perfume-slot="intro"]')),hero:rect(document.querySelector('[data-perfume-slot="hero"]')),canvas:rect(document.querySelector('.scroll-scene')),
 heroOpacity:Number(getComputedStyle(hero).opacity),introOpacity:Number(getComputedStyle(intro).opacity),heroInert:hero.inert,
 copy:rect(document.querySelector('.hero-copy')),heading:rect(document.querySelector('.intro-heading')),header:rect(document.querySelector('header')),
 visible:layout.visible&&c.bottom>0&&c.top<innerHeight,angle:Number(document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')),
 start:trigger?.start,end:trigger?.end,time:timeline?.totalProgress(),expected:trigger&&Math.max(0,Math.min(1,(scrollY-trigger.start)/(trigger.end-trigger.start))),
 label:timeline?.labels.rotationComplete,count:ScrollTrigger.getAll().filter(t=>t.vars.id==='perfume-reveal-scroll').length,oldCount:ScrollTrigger.getAll().filter(t=>t.vars.id==='perfume-cinematic').length,
 overflow:document.documentElement.scrollWidth>innerWidth,scroll:scrollY,bodyLocked:getComputedStyle(document.body).overflow==='hidden',
 };
});}
async function settle(page){for(let i=0;i<160;i++){const s=await read(page);if(s.time===undefined||Math.abs(s.time-s.expected)<0.00001){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));return;}await page.waitForTimeout(120);}throw Error('Reveal did not settle');}
async function seek(page,progress){const s=await read(page);await page.evaluate(y=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,y);},s.start+(s.end-s.start)*progress);await page.waitForTimeout(100);await settle(page);}
function noOverlap(a,b,label){const w=Math.min(a.right,b.right)-Math.max(a.left,b.left),h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);assert(w<3||h<3,`${label}: ${w}×${h} overlap`);}
function contained(box,slot,label){assert(box.left>=slot.left-4&&box.right<=slot.right+4&&box.top>=slot.top-4&&box.bottom<=slot.bottom+4,`${label}: outside presentation area ${JSON.stringify({box,slot})}`);}
try{
 for(const viewport of[{width:1280,height:900},{width:820,height:1180},{width:390,height:844}].filter(v=>!process.env.TEST_VIEWPORT||v.width===Number(process.env.TEST_VIEWPORT))){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('Page error:',e.message);});page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForSelector('#home');
  assert.equal(await page.locator('#intro').count(),1,'A dedicated 360° reveal must exist before Hero');
  assert(await page.evaluate(()=>!!(document.getElementById('intro').compareDocumentPosition(document.getElementById('home'))&Node.DOCUMENT_POSITION_FOLLOWING)));
  for(let i=0;i<150;i++){const ready=await page.evaluate(async()=>{const e=performance.getEntriesByType('resource').find(e=>e.name.includes('/@react-three_fiber.js?'));if(!e)return false;const {_roots}=await import(e.name);const state=[..._roots.values()][0]?.store.getState();if(!state?.scene.getObjectByName('perfume-layout'))return false;state.setDpr(.5);return true;});if(ready)break;await page.waitForTimeout(150);}
  await seek(page,0);const initial=await read(page);assert.equal(initial.count,1);assert.equal(initial.oldCount,0);assert(initial.heroInert);contained(initial.box,initial.intro,'intro');noOverlap(initial.box,initial.heading,'intro heading');
  const travelSamples=[initial];
  for(const fraction of[.25,.5,.75,1]){await seek(page,initial.label*fraction);const s=await read(page);travelSamples.push(s);assert(Math.abs(s.yaw-initial.yaw-Math.PI*2*fraction)<.025,`Actual mesh must rotate ${fraction*360} degrees: ${s.yaw}`);contained(s.box,s.intro,'rotating bottle');assert.equal(s.angle,Math.round(fraction*360));}
  const centersX=travelSamples.map(s=>(s.box.left+s.box.right)/2),centersY=travelSamples.map(s=>(s.box.top+s.box.bottom)/2);
  assert(Math.max(...centersX)-Math.min(...centersX)>viewport.width*.03,'Bottle must visibly travel sideways, not just rotate');
  assert(Math.max(...centersY)-Math.min(...centersY)>viewport.height*.02,'Bottle must visibly rise and fall');
  assert(Math.max(...travelSamples.map(s=>s.position[2]))-Math.min(...travelSamples.map(s=>s.position[2]))>.8,'Bottle must travel in depth');
  const turned=await read(page);assert(Math.abs(turned.yaw-initial.yaw-Math.PI*2)<.025);
  for(const p of[.82,.87,.92,.96,1]){await seek(page,p);const s=await read(page);assert(Math.abs(s.yaw-turned.yaw)<.025,'Handoff must not add another rotation');if(s.heroOpacity>.2)noOverlap(s.box,s.copy,`${viewport.width} Hero handoff ${p}`);assert.equal(s.bodyLocked,false);assert.equal(s.overflow,false);}
  const hero=await read(page);contained(hero.box,hero.hero,'Hero docking');assert(hero.heroOpacity>.99);assert(!hero.heroInert);assert.equal(hero.uuid,initial.uuid);
  await page.screenshot({path:`/tmp/lumiere-reveal-${viewport.width}-hero.png`});
  await page.mouse.move(viewport.width*.85,viewport.height*.3);for(let i=0;i<100&&(await read(page)).mouse<.08;i++)await page.waitForTimeout(100);const right=await read(page);
  await page.mouse.move(viewport.width*.15,viewport.height*.7);for(let i=0;i<100&&(await read(page)).mouse>-.08;i++)await page.waitForTimeout(100);assert(right.mouse-(await read(page)).mouse>.1,'Mouse tilt remains active');
  await seek(page,initial.label*.5);assert(Math.abs((await read(page)).yaw-initial.yaw-Math.PI)<.025,'Reverse scroll returns to 180 degrees');
  await page.screenshot({path:`/tmp/lumiere-reveal-${viewport.width}-intro.png`});
  await page.locator('.intro-skip').click();for(let i=0;i<200&&(await read(page)).expected<.999;i++)await page.waitForTimeout(100);await settle(page);assert((await read(page)).heroOpacity>.99,'Skip should reach completed Hero');
  await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,document.getElementById('story').getBoundingClientRect().top+scrollY)});await page.waitForTimeout(300);const story=await read(page);assert(!story.visible,'Bottle ends with opening experience');assert.equal(story.bodyLocked,false);assert(Math.abs(story.yaw-turned.yaw)<.025,'Later sections must not restart bottle rotation');
  const before=await page.locator('#story').evaluate(el=>el.getBoundingClientRect().top);await page.evaluate(()=>scrollBy(0,180));await page.waitForTimeout(200);const after=await page.locator('#story').evaluate(el=>el.getBoundingClientRect().top);assert(Math.abs((before-after)-180)<2,'Normal document scrolling resumes');
  await page.emulateMedia({reducedMotion:'reduce'});for(let i=0;i<100&&(await read(page)).count!==0;i++)await page.waitForTimeout(100);assert.equal((await read(page)).count,0);assert.equal(await page.locator('#intro').evaluate(el=>getComputedStyle(el).display),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});for(let i=0;i<100&&(await read(page)).count!==1;i++)await page.waitForTimeout(100);await seek(page,1);
  await page.setViewportSize({width:900,height:700});await page.waitForTimeout(500);await seek(page,1);const resized=await read(page);contained(resized.box,resized.hero,'resize');assert.equal(resized.uuid,initial.uuid);assert.equal(resized.count,1);
  assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}×${viewport.height}: exact 360°, continuous handoff, Hero alignment, reverse, pointer, skip, normal page scroll, reduced motion and resize`);await page.close();
 }
 const homePage=await browser.newPage({viewport:{width:1280,height:900}});
 await homePage.goto(`${url.replace(/\/$/,'')}\/#home`,{waitUntil:'domcontentloaded'});
 await homePage.waitForSelector('#home');
 for(let i=0;i<150;i++){const ready=await homePage.locator('#home').evaluate(el=>!el.inert&&Number(getComputedStyle(el).opacity)>.99);if(ready)break;await homePage.waitForTimeout(100);}
 assert(await homePage.locator('#home').evaluate(el=>!el.inert&&Number(getComputedStyle(el).opacity)>.99),'Direct #home URL must reach completed Hero '+JSON.stringify(await homePage.evaluate(async()=>{const h=document.getElementById('home'),c=document.getElementById('campaign');const e=performance.getEntriesByType('resource').find(e=>e.name.includes('/gsap.js?'));const{default:g}=await import(e.name);const t=g.getById('perfume-reveal');return{scroll:scrollY,height:c.offsetHeight,view:innerHeight,opacity:getComputedStyle(h).opacity,inert:h.inert,hash:location.hash,time:t?.time(),progress:t?.scrollTrigger?.progress,start:t?.scrollTrigger?.start,end:t?.scrollTrigger?.end,ready:document.readyState}})));
 const end=await homePage.locator('#campaign').evaluate(el=>el.offsetTop+el.offsetHeight-innerHeight);
 assert(Math.abs(await homePage.evaluate(()=>scrollY)-end)<3,'Direct #home must bypass the intro scroll distance');
 console.log('PASS direct #home navigation');await homePage.close();
}finally{await browser.close();}
