import { useEffect, useMemo, type RefObject } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

export type FragranceVariant = 'noir' | 'blanc' | 'gold';
const palettes = {
  gold: { glass: '#ecd6b2', liquid: '#81400c', cap: '#c9aa71', label: '#12100d', ink: '#e4cd9e', secondary: '#c6a36a' },
  noir: { glass: '#8f8574', liquid: '#22150e', cap: '#29251f', label: '#0e0d0b', ink: '#e4cd9e', secondary: '#c6a36a' },
  blanc: { glass: '#f1e8d5', liquid: '#c9b58b', cap: '#d9c9a8', label: '#e7ddc8', ink: '#4c402c', secondary: '#79603c' },
};

/** Shared geometry: independent instances for the scroll reveal and product inspector. */
export default function PerfumeBottle({ variant = 'gold', capRef }: { variant?: FragranceVariant; capRef?: RefObject<THREE.Group | null> }) {
  const palette = palettes[variant];
  const label = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 768;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = palette.label; ctx.fillRect(0, 0, 1024, 768);
    ctx.strokeStyle = '#79603c'; ctx.lineWidth = 3; ctx.strokeRect(20, 20, 984, 728);
    ctx.textAlign = 'center'; ctx.fillStyle = palette.ink; ctx.font = '92px Georgia'; ctx.fillText('LUMIÈRE', 512, 300);
    ctx.fillStyle = palette.secondary; ctx.font = '25px sans-serif'; ctx.fillText('E A U   D E   P A R F U M', 512, 430);
    ctx.fillStyle = '#a38c6a'; ctx.font = '21px sans-serif'; ctx.fillText('P A R I S   ·   1 0 0  M L', 512, 630);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }, [palette]);
  useEffect(() => () => label.dispose(), [label]);
  return <group name="perfume-model">
    <group name="perfume-body">
    <RoundedBox args={[2.2, 2.75, 0.92]} radius={0.16} smoothness={6} position={[0, -0.12, 0]}>
      <meshPhysicalMaterial color={palette.glass} metalness={0} roughness={0.045} transmission={0.92} thickness={0.18} ior={1.5} clearcoat={1} envMapIntensity={1.3} transparent opacity={0.36} depthWrite={false}/>
    </RoundedBox>
    <RoundedBox args={[1.94, 1.91, 0.68]} radius={0.11} smoothness={4} position={[0, -0.37, 0]}>
      <meshPhysicalMaterial color={palette.liquid} roughness={0.13} transmission={0.3} thickness={1.2} ior={1.36} attenuationColor="#a05717" attenuationDistance={1.3} transparent opacity={0.75}/>
    </RoundedBox>
    <RoundedBox args={[2.03, 0.12, 0.78]} radius={0.05} position={[0, -1.4, 0]}><meshPhysicalMaterial color="#d4b57c" transmission={0.7} roughness={0.05} thickness={0.4}/></RoundedBox>
    <mesh position={[0, 1.37, 0]}><cylinderGeometry args={[0.29, 0.29, 0.3, 48]}/><meshStandardMaterial color="#c6a36a" metalness={1} roughness={0.2}/></mesh>
    <mesh position={[0.08, -0.08, 0.08]}><cylinderGeometry args={[0.012, 0.012, 2.42, 12]}/><meshPhysicalMaterial color="#e5c797" transparent opacity={0.4}/></mesh>
    <mesh position={[0, -0.15, 0.474]}><planeGeometry args={[1.57, 1.2]}/><meshStandardMaterial map={label} roughness={0.7}/></mesh>
    </group>
    <group ref={capRef} name="perfume-cap">
    <RoundedBox args={[0.87, 0.95, 0.76]} radius={0.06} smoothness={4} position={[0, 1.88, 0]}><meshStandardMaterial color={palette.cap} metalness={1} roughness={0.24}/></RoundedBox>
    <mesh position={[0, 1.45, 0]}><boxGeometry args={[0.9, 0.055, 0.78]}/><meshStandardMaterial color="#322417" metalness={0.8} roughness={0.3}/></mesh>
    </group>
  </group>;
}
