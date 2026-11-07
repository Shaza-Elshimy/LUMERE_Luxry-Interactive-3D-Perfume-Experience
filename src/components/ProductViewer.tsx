import { Suspense, useId, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RotateCcw } from 'lucide-react';
import PerfumeBottle, { type FragranceVariant } from './PerfumeBottle';

const cameraOptions: { position: [number, number, number]; fov: number } = { position: [0.6, 0.55, 7], fov: 40 };
function resetView(orbit: OrbitControlsImpl | null) {
  if (!orbit) return;
  const damping = orbit.enableDamping;
  orbit.enableDamping = false;
  orbit.update(); // Flush any remaining drag momentum before restoring the camera.
  orbit.object.position.set(...cameraOptions.position);
  orbit.target.set(0, 0.35, 0);
  orbit.update();
  orbit.saveState();
  orbit.enableDamping = damping;
}

function ProductStudio({ variant, controls, onReady, onDrag }: {
  variant: FragranceVariant;
  controls: React.RefObject<OrbitControlsImpl | null>;
  onReady: () => void;
  onDrag: (dragging: boolean) => void;
}) {
  const frames = useRef(0);
  const { invalidate } = useThree();
  useFrame(() => {
    if (frames.current === 1) onReady();
    if (frames.current++ === 0) invalidate();
  });
  return <>
    <ambientLight intensity={0.65}/>
    <spotLight position={[3, 5, 4]} intensity={65} color="#ffcf8a" angle={0.5} penumbra={1}/>
    <pointLight position={[-3, 1, 2]} intensity={18} color="#eee6d7"/>
    <Environment resolution={128}>
      <Lightformer intensity={5} position={[-3, 1, 2]} scale={[1, 8, 1]}/>
      <Lightformer intensity={7} position={[3, 2, 1]} scale={[0.6, 7, 1]} color="#ffe0a8"/>
      <Lightformer intensity={3} position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 3, 1]}/>
    </Environment>
    <group name="product-bottle" rotation={[0, -0.16, 0]}><PerfumeBottle variant={variant}/></group>
    <OrbitControls ref={controls} makeDefault target={[0, 0.35, 0]} enablePan={false} enableZoom={false}
      enableDamping dampingFactor={0.08} rotateSpeed={0.75} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI * 2 / 3}
      onStart={() => onDrag(true)} onEnd={() => onDrag(false)}/>
  </>;
}
export default function ProductViewer({ variant, name }: { variant: FragranceVariant; name: string }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [supported] = useState(() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } });
  const hint = useId();
  return <div className="product-viewer" data-variant={variant} data-ready={ready} data-dragging={dragging}
    role="group" aria-label={`Interactive 3D view of ${name}`} aria-describedby={hint} tabIndex={supported ? 0 : undefined}
    onKeyDown={event => {
      const orbit = controls.current;
      if (!orbit || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') resetView(orbit);
      if (event.key === 'ArrowLeft') orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() + 0.25);
      if (event.key === 'ArrowRight') orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() - 0.25);
      if (event.key === 'ArrowUp') orbit.setPolarAngle(Math.max(Math.PI / 3, orbit.getPolarAngle() - 0.15));
      if (event.key === 'ArrowDown') orbit.setPolarAngle(Math.min(Math.PI * 2 / 3, orbit.getPolarAngle() + 0.15));
      orbit.update();
    }}>
    {supported ? <>
      {!ready && <div className="product-viewer-loading" role="status">Preparing your fragrance…</div>}
      <Canvas camera={cameraOptions} dpr={[1, 1.6]} frameloop="demand" gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}><ProductStudio variant={variant} controls={controls} onReady={() => setReady(true)} onDrag={setDragging}/></Suspense>
      </Canvas>
      <button className="viewer-reset" aria-label="Reset 3D view" disabled={!ready} onClick={() => resetView(controls.current)}><RotateCcw size={15}/></button>
      <span className="viewer-hint" aria-hidden="true">DRAG TO EXPLORE · 360°</span>
      <span className="sr-only" id={hint}>Drag with your mouse or swipe to rotate. Arrow keys rotate the view. Home resets it.</span>
    </> : <>
      <div className={`mini-bottle ${variant}`}><div className="bottle-label">LUMIÈRE<small>EAU DE PARFUM</small><span>PARIS</span></div></div>
      <p className="viewer-unavailable" id={hint}>3D viewing is unavailable in this browser.</p>
    </>}
  </div>;
}
