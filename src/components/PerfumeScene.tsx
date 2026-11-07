import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import PerfumeBottle from './PerfumeBottle';
import { useBottleLayout } from './useBottleLayout';
import { REVEAL_TURN_END, type RevealController } from './revealController';

function Bottle({ reduced, host, controller }: { reduced: boolean; host: RefObject<HTMLDivElement | null>; controller: RevealController }) {
  const layout = useRef<THREE.Group>(null);
  const presentation = useRef<THREE.Group>(null);
  const interaction = useRef<THREE.Group>(null);
  const cap = useRef<THREE.Group>(null);
  const effects = useRef<THREE.Group>(null);
  const keyLight = useRef<THREE.SpotLight>(null);
  const { camera, size } = useThree();
  const compact = size.width <= 760;
  const backdrop = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(1, '#ffffff00');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => glow.dispose(), [glow]);
  const target = useMemo(() => new THREE.Vector3(0, 0.25, 0), []);
  const pointerInside = useRef(false);
  const pointerTarget = useRef(new THREE.Vector2());
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const rect = host.current?.getBoundingClientRect();
      if (!rect) return;
      pointerInside.current = event.clientY >= rect.top && event.clientY <= rect.bottom;
      pointerTarget.current.set(
        THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1),
        THREE.MathUtils.clamp(-(event.clientY - rect.top) / rect.height * 2 + 1, -1, 1),
      );
    };
    const leave = () => { pointerInside.current = false; };
    window.addEventListener('pointermove', move);
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      window.removeEventListener('blur', leave);
    };
  }, [host]);
  useLayoutEffect(() => {
    if (!presentation.current || !cap.current || !keyLight.current) return;
    const group = presentation.current;
    keyLight.current.target = group;
    let binding: gsap.Context | undefined;
    const bind = (timeline: gsap.core.Timeline | null) => {
      binding?.revert();
      binding = gsap.context(() => {
        group.position.set(0, 0, 0); group.rotation.set(0, -0.16, 0); group.scale.setScalar(1);
        camera.position.set(0, 0.5, 8.5); target.set(0, 0.25, 0); cap.current!.position.set(0, 0, 0);
        if (!timeline || reduced) return;
        // Exactly one full turn. Pointer tilt lives on the separate child group.
        timeline.to(group.rotation, { y: Math.PI * 2 - 0.16, duration: REVEAL_TURN_END, ease: 'none' }, 0);
        // A traveling, rising-and-falling arc rather than a turntable in one spot.
        const travel = compact ? 0.65 : 1;
        const quarter = REVEAL_TURN_END / 4;
        [
          { x: -0.85, y: 0.32, z: 0.55, pitch: 0.16, roll: -0.12, scale: 0.98 },
          { x: 0.7, y: -0.24, z: -0.35, pitch: -0.1, roll: 0.08, scale: 1.08 },
          { x: -0.5, y: 0.2, z: 0.8, pitch: 0.1, roll: -0.1, scale: 1.02 },
          { x: 0, y: 0, z: 0, pitch: 0, roll: 0, scale: 1 },
        ].forEach((pose, index) => {
          const at = quarter * index;
          timeline.to(group.position, { x: pose.x * travel, y: pose.y * travel, z: pose.z, duration: quarter, ease: 'sine.inOut' }, at);
          timeline.to(group.rotation, { x: pose.pitch * travel, z: pose.roll * travel, duration: quarter, ease: 'sine.inOut' }, at);
          timeline.to(group.scale, { x: pose.scale, y: pose.scale, z: pose.scale, duration: quarter, ease: 'sine.inOut' }, at);
        });
        timeline.to(group.scale, { x: 0.95, y: 0.95, z: 0.95, duration: 1 - REVEAL_TURN_END }, REVEAL_TURN_END);
        timeline.to(camera.position, { x: 0.2, y: 0.6, z: 7.8, duration: REVEAL_TURN_END / 2 }, 0);
        timeline.to(camera.position, { x: 0, y: 0.5, z: 8.5, duration: REVEAL_TURN_END / 2 }, REVEAL_TURN_END / 2);
        timeline.to(target, { y: 0.3, duration: REVEAL_TURN_END / 2 }, 0);
        timeline.to(target, { y: 0.25, duration: REVEAL_TURN_END / 2 }, REVEAL_TURN_END / 2);
        timeline.to(keyLight.current!, { intensity: 90, duration: REVEAL_TURN_END / 2 }, 0);
        timeline.to(keyLight.current!, { intensity: 65, duration: 1 - REVEAL_TURN_END / 2 }, REVEAL_TURN_END / 2);
        if (backdrop.current) timeline.to(backdrop.current, { opacity: 0.15, duration: REVEAL_TURN_END }, 0);
        if (effects.current) timeline.to(effects.current.rotation, { z: 0.3, duration: 1 }, 0);
        // A late-loaded scene or resize resumes at the actual scroll progress.
        timeline.totalProgress(timeline.scrollTrigger!.progress);
      });
    };
    controller.subscribers.add(bind);
    bind(controller.timeline);
    return () => { controller.subscribers.delete(bind); binding?.revert(); };
  }, [camera, compact, controller, reduced, target]);
  useFrame(({ clock }, delta) => {
    if (!interaction.current) return;
    const ease = 1 - Math.exp(-Math.min(delta, 0.1) * 4);
    const active = !reduced && pointerInside.current;
    interaction.current.rotation.y = THREE.MathUtils.lerp(interaction.current.rotation.y, active ? pointerTarget.current.x * 0.16 : 0, ease);
    interaction.current.rotation.x = THREE.MathUtils.lerp(interaction.current.rotation.x, active ? -pointerTarget.current.y * 0.07 : 0, ease);
    interaction.current.position.y = reduced ? 0 : Math.sin(clock.elapsedTime * 0.65) * 0.035;
    camera.lookAt(target);
  });
  useBottleLayout(layout, presentation, host, controller);
  return <group ref={layout} name="perfume-layout">
    <mesh name="atmospheric-backdrop" position={[0, 0, -4]}>
      <planeGeometry args={[6, 7]}/>
      <meshBasicMaterial ref={backdrop} map={glow} color="#a66a36" transparent opacity={0.07} depthWrite={false} blending={THREE.AdditiveBlending}/>
    </mesh>
    <spotLight ref={keyLight} name="perfume-key-light" position={[3, 5, 4]} intensity={65} color="#ffcf8a" angle={0.5} penumbra={1}/>
    <group ref={effects} name="presentation-effects"><Atmosphere reduced={reduced}/></group>
    <group ref={presentation} name="perfume-presentation"><group ref={interaction} name="perfume-interaction">
    <PerfumeBottle capRef={cap}/>
  </group></group></group>;

}
function Atmosphere({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => { if (ref.current && !reduced) ref.current.rotation.y += delta * 0.022; });
  return <group ref={ref}>{Array.from({ length: 32 }, (_, i) => <mesh key={i} position={[Math.sin(i * 12.9) * 3.8, Math.cos(i * 4.2) * 3, Math.sin(i * 8.1) * 2 - 1]} rotation={[i, i * 0.8, i * 0.4]} scale={i % 8 === 0 ? [1, 0.18, 0.65] : [1, 1, 1]}>
    {i % 8 === 0 ? <sphereGeometry args={[0.12, 12, 8]}/> : <sphereGeometry args={[0.009, 4, 4]}/>}
    <meshStandardMaterial color={i % 8 === 0 ? '#a56b46' : '#dfb574'} emissive="#a06a25" emissiveIntensity={0.3} roughness={0.7}/>
    {i % 8 === 0 && <mesh scale={[1.7, 0.25, 0.8]}><sphereGeometry args={[0.15, 12, 8]}/><meshStandardMaterial color="#b77958" side={THREE.DoubleSide}/></mesh>}
  </mesh>)}</group>;
}
export default function PerfumeScene({ controller }: { controller: RevealController }) {
  const host = useRef<HTMLDivElement>(null);
  const [supported] = useState(() => { try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch { return false; } });
  const [visible, setVisible] = useState(() => !document.hidden);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [active, setActive] = useState(true);
  useLayoutEffect(() => {
    if (supported) return;
    const campaign = document.getElementById('campaign');
    if (campaign) campaign.dataset.webgl = 'unavailable';
    return () => {
      if (campaign?.dataset.webgl === 'unavailable') delete campaign.dataset.webgl;
    };
  }, [supported]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const campaign = document.getElementById('campaign');
    if (!campaign) return;
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
    observer.observe(campaign);
    const visibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  if (!supported) return <p className="sr-only">3D preview unavailable. Static product visuals are displayed.</p>;
  return <div ref={host} className={`perfume-canvas scroll-scene ${active ? 'is-active' : ''} ${reduced ? 'is-reduced' : ''} ${!supported ? 'is-fallback' : ''}`} role="img" aria-label="Interactive 3D LUMIÈRE amber perfume bottle with a champagne gold cap. Move your pointer to rotate.">
    <Canvas camera={{ position: [0, 0.5, 7.5], fov: 39 }} dpr={[1, 1.6]} frameloop={visible && active ? 'always' : 'never'} eventSource={document.getElementById('root')!} eventPrefix="client" gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.5}/><pointLight position={[-3, 1, 2]} intensity={16} color="#eee6d7"/>
      <Suspense fallback={null}><Environment resolution={128}><Lightformer intensity={5} position={[-3, 1, 2]} scale={[1, 8, 1]}/><Lightformer intensity={7} position={[3, 2, 1]} scale={[0.6, 7, 1]} color="#ffe0a8"/><Lightformer intensity={3} position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 3, 1]}/></Environment><Bottle reduced={reduced} host={host} controller={controller}/></Suspense>
    </Canvas>
  </div>;
}
