import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Menu, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import RevealExperience from './components/RevealExperience';
import type { FragranceVariant } from './components/PerfumeBottle';
const ProductViewer = lazy(() => import('./components/ProductViewer'));
gsap.registerPlugin(ScrollTrigger);
const products: { name: string; mood: string; notes: string; price: number; color: FragranceVariant; description: string }[] = [
  { name: 'Lumière Noir', mood: 'THE ALLURE OF MYSTERY', notes: 'Black amber · Oud · Vanilla', price: 185, color: 'noir', description: 'A bold, enveloping composition. Smoked woods meet the warmth of black amber, leaving an unforgettable trail.' },
  { name: 'Lumière Blanc', mood: 'THE ESSENCE OF PURITY', notes: 'White jasmine · Musk · Neroli', price: 165, color: 'blanc', description: 'The quiet beauty of a new morning. Luminous white florals unfold into soft musk and delicate neroli.' },
  { name: 'Lumière Gold', mood: 'THE WARMTH OF RADIANCE', notes: 'Bergamot · Rose · Sandalwood', price: 195, color: 'gold', description: 'Golden hour, captured. Sparkling bergamot and velvet rose settle into a warm sandalwood embrace.' },
];
function ProductBottle({ color }: { color: string }) { return <div className={`mini-bottle ${color}`}><div className="bottle-label">LUMIÈRE<small>EAU DE PARFUM</small><span>PARIS</span></div></div>; }
export default function App() {
  const root = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [bag, setBag] = useState<number[]>([]);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>('.reveal').forEach(el => gsap.from(el, { y: 35, opacity: 0, duration: 1, scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
      }, root);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);
  useEffect(() => {
    if (selected === null && !bagOpen && !menu) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    dialog?.querySelector<HTMLElement>('button')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelected(null); setBagOpen(false); setMenu(false); }
      if (e.key === 'Tab' && dialog) { const items = dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'); const first = items[0]; const last = items[items.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, [selected, bagOpen, menu]);
  const links = <>{[['Home', '#home'], ['Collection', '#collection'], ['Our story', '#story'], ['The experience', '#experience'], ['Contact', '#contact']].map(([label, href]) => <a key={href} href={href} onClick={() => setMenu(false)}>{label}</a>)}</>;
  const navigation = <header><a className="wordmark" href="#home">LUMIÈRE<span>PARIS</span></a><nav aria-label="Main navigation">{links}</nav><div className="header-actions"><button className="bag-button" aria-label={`Open shopping bag, ${bag.length} items`} onClick={() => setBagOpen(true)}><ShoppingBag size={18}/><span>{bag.length.toString().padStart(2, '0')}</span></button><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMenu(true)}><Menu/></button></div></header>;
  return <div ref={root}>
    <a className="skip-link" href="#main">Skip to content</a>

    <main id="main">
      <RevealExperience navigation={navigation}>
      <section className="hero" id="home"><div className="eclipse"/><div className="hero-grain"/><div className="hero-copy"><p className="eyebrow"><span/> AN INVITATION TO THE EXTRAORDINARY</p><h1>The art of<br/>being <em>remembered.</em></h1><p className="hero-description">A fragrance that speaks before you do.<br/>An expression of elegance. An unforgettable impression.</p><div className="hero-buttons"><a className="button filled" href="#notes">Discover the scent <ArrowUpRight size={15}/></a><a className="text-link" href="#collection">Explore collection <ArrowRight size={16}/></a></div><div className="hero-footnote"><span className="little-line"/>CRAFTED IN FRANCE. REMEMBERED EVERYWHERE.</div></div><div className="scene-slot scene-slot--hero" data-perfume-slot="hero" aria-hidden="true"><ProductBottle color="gold"/></div><div className="bottle-caption"><span>01 / SIGNATURE EAU DE PARFUM</span><p>Lumière Gold</p><span>100 ML · A MOMENT MADE ETERNAL</span></div><a className="scroll-cue" href="#story"><span>SCROLL TO DISCOVER</span><ArrowDown size={15}/></a><div className="hero-side">THE INVISIBLE. MADE UNFORGETTABLE.</div><div className="edition">EST. PARIS <span>2024</span></div></section>
      </RevealExperience>
      <div className="brand-strip"><span>EXCEPTIONAL INGREDIENTS</span><i>✧</i><span>THE ART OF FRENCH PERFUMERY</span><i>✧</i><span>CRAFTED TO BE REMEMBERED</span><i>✧</i><span>TIMELESS BY NATURE</span></div>
      <section className="story section-wrap" id="story"><div className="story-art"><div className="story-orbit"/><ProductBottle color="gold"/><span className="art-caption">THE BEAUTY IS IN THE DETAILS.</span><span className="art-number">01 — THE MAISON</span></div><div className="story-copy reveal"><p className="eyebrow">THE WORLD OF LUMIÈRE</p><h2>More than<br/>a <em>fragrance.</em></h2><div className="gold-rule"/><p>Some moments never leave you.<br/>Neither should your fragrance.</p><p className="muted">Every fragrance tells a story. LUMIÈRE transforms the art of perfumery into an unforgettable sensory experience, where every detail is carefully crafted.</p><p className="muted">Born in Paris. Shaped by emotion. Created for the moments that become a part of you.</p><a className="text-link" href="#experience">Enter our world <ArrowUpRight size={15}/></a></div></section>
      <section className="notes section-wrap" id="notes"><div className="section-heading reveal"><p className="eyebrow">A COMPOSITION OF CONTRASTS</p><h2>Unfolding in <em>layers.</em></h2><p className="muted">A first impression. A deeper connection. A lasting memory.</p></div><div className="scene-slot scene-slot--notes" aria-hidden="true"><ProductBottle color="gold"/></div><div className="notes-grid">{[{n:'01',title:'The first encounter',kind:'TOP NOTES',text:'Bergamot · Pink Pepper · Mandarin',symbol:'◌',desc:'Bright. Vibrant. Effortlessly captivating.'},{n:'02',title:'At the heart',kind:'HEART NOTES',text:'Jasmine · Rose · Orange Blossom',symbol:'✳',desc:'Soft florals with an unexpected depth.'},{n:'03',title:'What remains',kind:'BASE NOTES',text:'Vanilla · Amber · Sandalwood',symbol:'◈',desc:'Warmth that lingers long after you leave.'}].map(note=><article className="note reveal" key={note.n}><span className="note-number">{note.n}</span><div className="note-symbol">{note.symbol}</div><p className="eyebrow">{note.kind}</p><h3>{note.title}</h3><p>{note.text}</p><small>{note.desc}</small></article>)}</div></section>
      <section className="collection section-wrap" id="collection"><div className="collection-heading reveal"><div><p className="eyebrow">THREE EXPRESSIONS. ONE SIGNATURE.</p><h2>The signature <em>collection.</em></h2></div><span className="collection-count">EAU DE PARFUM / 100 ML</span></div><div className="product-grid">{products.map((p,i)=><article className="product reveal" key={p.name}><button className={`product-visual ${p.color}`} onClick={()=>setSelected(i)} aria-label={`Discover ${p.name}`}><span className="product-index">N° 0{i+1}</span><ProductBottle color={p.color}/><span className="visual-discover">EXPLORE THE FRAGRANCE <Plus size={14}/></span></button><p className="eyebrow">{p.mood}</p><div className="product-title"><h3>{p.name}</h3><span>€{p.price}</span></div><p className="product-notes">{p.notes}</p><button className="text-link" onClick={()=>setSelected(i)}>Discover <ArrowUpRight size={14}/></button></article>)}</div></section>
      <section className="experience" id="experience"><div className="experience-halo"/><div className="experience-stars"/><div className="reveal"><p className="eyebrow">FELT. NEVER FORGOTTEN.</p><h2>Scent is an<br/>invisible <em>signature.</em></h2><p>You don't have to say a word.</p><a className="button" href="#collection">Find your signature <ArrowUpRight size={15}/></a></div><div className="scene-slot scene-slot--final" aria-hidden="true"><ProductBottle color="gold"/></div><span className="experience-bottom">L'ART DU PARFUM · LUMIÈRE PARIS</span></section>
      <section className="newsletter section-wrap" id="contact"><div className="reveal"><p className="eyebrow">A CLOSER CONNECTION</p><h2>Stay in the world<br/>of <em>Lumière.</em></h2><p className="muted">New creations, quiet inspirations, and invitations. Just for you.</p></div><form className="reveal" onSubmit={e=>{e.preventDefault();setSubscribed(true);}}><label htmlFor="email">YOUR EMAIL ADDRESS</label><div className="email-field"><input id="email" type="email" autoComplete="email" placeholder="Enter your email" required value={email} onChange={e=>{setEmail(e.target.value);setSubscribed(false);}}/><button aria-label="Subscribe" type="submit"><ArrowRight size={22}/></button></div><p className="form-message" role="status">{subscribed ? 'Thank you. Your interest is noted — this demo does not send or store emails.' : 'An occasional note. Always thoughtfully composed.'}</p></form></section>
    </main>
    <footer><div className="footer-top"><a className="wordmark" href="#home">LUMIÈRE<span>PARIS</span></a><p>The art of being remembered.</p><a href="mailto:bonjour@lumiere.example">Say bonjour <ArrowUpRight size={14}/></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} LUMIÈRE. A CONCEPT FRAGRANCE HOUSE.</span><a href="#collection">THE COLLECTION</a><span>INSTAGRAM — COMING SOON</span><a href="#home">BACK TO TOP ↑</a></div></footer>
    {menu&&<div className="mobile-panel" role="dialog" aria-modal="true" aria-label="Navigation"><button className="close" aria-label="Close navigation" onClick={()=>setMenu(false)}><X/></button><span className="wordmark">LUMIÈRE</span>{links}</div>}
    {selected!==null&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-name" onClick={e=>e.stopPropagation()}><button className="close" aria-label="Close product" onClick={()=>setSelected(null)}><X/></button><div className={`modal-visual ${products[selected].color}`}><Suspense fallback={<div className="product-viewer-loading" role="status">Preparing your fragrance…</div>}><ProductViewer variant={products[selected].color} name={products[selected].name}/></Suspense></div><div className="modal-copy"><p className="eyebrow">{products[selected].mood}</p><h2 id="product-name">{products[selected].name}</h2><p>{products[selected].description}</p><p className="muted">{products[selected].notes}</p><p>EAU DE PARFUM · 100 ML · €{products[selected].price}</p><button className="button filled" onClick={()=>{setBag([...bag,selected]);setSelected(null);setBagOpen(true);}}>Add to bag <Plus size={16}/></button><small>Portfolio demo. No payments or orders are processed.</small></div></div></div>}
    {bagOpen&&<div className="modal-backdrop" onClick={()=>setBagOpen(false)}><aside className="bag-panel" role="dialog" aria-modal="true" aria-labelledby="bag-title" onClick={e=>e.stopPropagation()}><button className="close" aria-label="Close bag" onClick={()=>setBagOpen(false)}><X/></button><p className="eyebrow">YOUR PERSONAL COLLECTION</p><h2 id="bag-title">The bag <em>({bag.length})</em></h2>{bag.length? <>{products.map((p,i)=>{const count=bag.filter(x=>x===i).length;return count?<div className="bag-item" key={p.name}><div><h3>{p.name}</h3><p>{count} × €{p.price}</p></div><button aria-label={`Remove one ${p.name}`} onClick={()=>{const next=[...bag];next.splice(next.indexOf(i),1);setBag(next);}}><Minus size={16}/></button></div>:null;})}<div className="bag-total"><span>Subtotal</span><span>€{bag.reduce((sum,i)=>sum+products[i].price,0)}</span></div><p className="demo-note"><Check size={16}/> Your selection is saved for this visit. This is a portfolio demo; checkout is unavailable.</p></>:<p className="muted">Your signature is waiting to be discovered.</p>}<button className="button" onClick={()=>{setBagOpen(false);document.querySelector('#collection')?.scrollIntoView({behavior:'smooth'});}}>Explore the collection <ArrowRight size={16}/></button></aside></div>}
  </div>;
}
