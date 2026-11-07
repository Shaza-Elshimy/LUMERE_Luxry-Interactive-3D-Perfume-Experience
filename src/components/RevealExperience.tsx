import { lazy, Suspense, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REVEAL_TURN_END, type RevealController } from './revealController';
const PerfumeScene = lazy(() => import('./PerfumeScene'));
gsap.registerPlugin(ScrollTrigger);

export default function RevealExperience({ navigation, children }: { navigation: ReactNode; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const initialHashHandled = useRef(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const controller = useMemo<RevealController>(() => ({ motion: { handoff: 0 }, timeline: null, subscribers: new Set() }), []);
  useLayoutEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useLayoutEffect(() => {
    const element = track.current!;
    const intro = element.querySelector<HTMLElement>('#intro')!;
    const hero = element.querySelector<HTMLElement>('#home')!;
    const progress = element.querySelector<HTMLElement>('[role="progressbar"]')!;
    const angle = element.querySelector<HTMLElement>('[data-reveal-angle]')!;
    let mounted = true;
    const context = gsap.context(() => {
      controller.motion.handoff = reduced ? 1 : 0;
      if (reduced) {
        gsap.set(hero, { opacity: 1 }); gsap.set(intro, { opacity: 0 });
        hero.inert = false; hero.removeAttribute('aria-hidden');
        intro.inert = true; intro.setAttribute('aria-hidden', 'true');
        controller.timeline = null;
        controller.subscribers.forEach(bind => bind(null));
        return;
      }
      gsap.set(hero, { opacity: 0 }); gsap.set(intro, { opacity: 1 });
      const update = () => {
        const time = timeline.time();
        const turn = Math.min(1, time / REVEAL_TURN_END);
        progress.style.setProperty('--reveal-progress', String(turn));
        progress.setAttribute('aria-valuenow', String(Math.round(turn * 360)));
        angle.textContent = `${Math.round(turn * 360).toString().padStart(3, '0')}°`;
        hero.inert = time < 0.9;
        hero.setAttribute('aria-hidden', String(time < 0.9));
        intro.inert = time > 0.9;
        intro.setAttribute('aria-hidden', String(time > 0.9));
      };
      const timeline = gsap.timeline({
        id: 'perfume-reveal', defaults: { ease: 'power2.inOut' },
        scrollTrigger: { id: 'perfume-reveal-scroll', trigger: element, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true },
        onUpdate: update,
      });
      timeline.addLabel('reveal', 0).addLabel('rotationComplete', REVEAL_TURN_END).addLabel('hero', 1);
      timeline.to(controller.motion, { handoff: 1, duration: 1 - REVEAL_TURN_END }, REVEAL_TURN_END);
      timeline.to(intro, { opacity: 0, duration: 0.16 }, REVEAL_TURN_END);
      timeline.to(hero, { opacity: 1, duration: 0.1 }, 0.9);
      controller.timeline = timeline;
      controller.subscribers.forEach(bind => bind(timeline));
      timeline.scrollTrigger!.refresh();
      timeline.totalProgress(timeline.scrollTrigger!.progress);
      update();
    }, element);
    // Home means the completed reveal, including navigation from the footer or URL hash.
    const homeTop = () => element.getBoundingClientRect().top + scrollY + Math.max(0, element.offsetHeight - innerHeight);
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href="#home"]');
      if (!anchor || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      history.replaceState(null, '', '#home');
      window.scrollTo({ top: homeTop(), behavior: reduced ? 'instant' : 'smooth' });
    };
    document.addEventListener('click', navigate);
    let frame = 0;
    if (!initialHashHandled.current) {
      if (location.hash === '#home') frame = requestAnimationFrame(() => {
        initialHashHandled.current = true;
        window.scrollTo({ top: homeTop(), behavior: 'instant' });
      });
      else initialHashHandled.current = true;
    }
    document.fonts.ready.then(() => { if (mounted) ScrollTrigger.refresh(); });
    return () => {
      mounted = false; cancelAnimationFrame(frame); document.removeEventListener('click', navigate);
      controller.timeline = null; controller.subscribers.forEach(bind => bind(null));
      context.revert(); hero.inert = false; hero.removeAttribute('aria-hidden'); intro.inert = false; intro.removeAttribute('aria-hidden');
    };
  }, [controller, reduced]);

  return <div id="campaign" ref={track} className="campaign reveal-track" data-reduced={String(reduced)}>
    {navigation}
    <Suspense fallback={null}><PerfumeScene controller={controller}/></Suspense>
    <section id="intro" className="intro-panel" aria-label="360 degree fragrance reveal">
      <div className="intro-heading"><p className="eyebrow">LUMIÈRE · SIGNATURE EAU DE PARFUM</p><h2>Every angle.<br className="intro-mobile-break"/> <em>An impression.</em></h2></div>
      <div className="scene-slot intro-visual" data-perfume-slot="intro" aria-hidden="true"><div className="mini-bottle gold"><div className="bottle-label">LUMIÈRE<small>EAU DE PARFUM</small><span>PARIS</span></div></div></div>
      <div className="intro-footer"><span className="intro-scroll"><ArrowDown size={14}/> SCROLL TO REVEAL</span><div className="reveal-progress" role="progressbar" aria-label="Perfume rotation" aria-valuemin={0} aria-valuemax={360} aria-valuenow={0}><span/></div><span data-reveal-angle>000°</span><a href="#home" className="intro-skip">Skip to the fragrance <ArrowUpRight size={12}/></a></div>
    </section>
    {children}
  </div>;
}
