import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RevealController } from './revealController';

/** Layout owns this parent only; GSAP owns its presentation child. */
export function useBottleLayout(
  layout: RefObject<THREE.Group | null>,
  presentation: RefObject<THREE.Group | null>,
  host: RefObject<HTMLDivElement | null>,
  controller: RevealController,
) {
  const { camera } = useThree();
  const slots = useRef<HTMLElement[]>([]);
  const scratch = useMemo(() => ({
    box: new THREE.Box3(), point: new THREE.Vector3(), anchor: new THREE.Vector3(),
    direction: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(),
    bounds: { left: 0, right: 0, top: 0, bottom: 0 },
  }), []);
  useLayoutEffect(() => {
    const campaign = document.getElementById('campaign');
    slots.current = ['intro', 'hero'].map(name => document.querySelector<HTMLElement>(`[data-perfume-slot="${name}"]`)!).filter(Boolean);
    if (campaign) campaign.dataset.webgl = 'ready';
    return () => {
      slots.current = [];
      if (campaign) { delete campaign.dataset.webgl; delete campaign.dataset.perfumeSection; }
    };
  }, []);

  useFrame(() => {
    const parent = layout.current;
    const bottle = presentation.current;
    const element = host.current;
    if (!parent || !bottle || !element || !(camera instanceof THREE.PerspectiveCamera)) return;
    const canvas = element.getBoundingClientRect();
    const campaign = element.closest<HTMLElement>('.campaign')!;
    const intro = slots.current[0]?.getBoundingClientRect();
    const hero = slots.current[1]?.getBoundingClientRect();
    if (!intro || !hero || canvas.bottom <= 0 || canvas.top >= innerHeight) {
      parent.visible = false; element.style.opacity = '0';
      return;
    }
    // One scroll-controlled handoff drives both layout and the 3D timeline.
    const blend = controller.motion.handoff;
    const rect = {
      left: THREE.MathUtils.lerp(intro.left, hero.left, blend),
      top: THREE.MathUtils.lerp(intro.top, hero.top, blend),
      width: THREE.MathUtils.lerp(intro.width, hero.width, blend),
      height: THREE.MathUtils.lerp(intro.height, hero.height, blend),
      right: 0, bottom: 0,
    };
    rect.right = rect.left + rect.width; rect.bottom = rect.top + rect.height;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    parent.visible = rect.bottom > Math.max(0, canvas.top) && rect.top < Math.min(innerHeight, canvas.bottom);
    element.style.opacity = parent.visible ? '1' : '0';
    element.dataset.dockedTo = blend >= 0.999 ? 'hero' : blend <= 0.001 ? 'intro' : 'handoff';
    campaign.dataset.perfumeSection = element.dataset.dockedTo;
    element.style.clipPath = `inset(${Math.max(0, rect.top - canvas.top)}px ${Math.max(0, canvas.right - rect.right)}px ${Math.max(0, canvas.bottom - rect.bottom)}px ${Math.max(0, rect.left - canvas.left)}px)`;

    camera.updateMatrixWorld(true);
    scratch.direction.set(0, 0, -1).applyQuaternion(camera.quaternion);
    scratch.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    scratch.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const distance = Math.max(1, camera.position.length());
    const worldPerPixel = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / canvas.height;
    scratch.anchor.copy(camera.position).addScaledVector(scratch.direction, distance)
      .addScaledVector(scratch.right, (centerX - canvas.left - canvas.width / 2) * worldPerPixel)
      .addScaledVector(scratch.up, -(centerY - canvas.top - canvas.height / 2) * worldPerPixel);
    parent.position.copy(scratch.anchor);
    // Keep world orientation: camera angle changes must remain visible on the bottle.
    parent.quaternion.identity();
    parent.scale.setScalar(1);

    const projectBounds = () => {
      parent.updateMatrixWorld(true);
      scratch.box.setFromObject(bottle);
      const bounds = scratch.bounds;
      bounds.left = bounds.top = Infinity; bounds.right = bounds.bottom = -Infinity;
      for (const x of [scratch.box.min.x, scratch.box.max.x])
        for (const y of [scratch.box.min.y, scratch.box.max.y])
          for (const z of [scratch.box.min.z, scratch.box.max.z]) {
            scratch.point.set(x, y, z).project(camera);
            const px = canvas.left + (scratch.point.x + 1) * canvas.width / 2;
            const py = canvas.top + (1 - scratch.point.y) * canvas.height / 2;
            bounds.left = Math.min(bounds.left, px); bounds.right = Math.max(bounds.right, px);
            bounds.top = Math.min(bounds.top, py); bounds.bottom = Math.max(bounds.bottom, py);
          }
      return bounds;
    };
    const unscaled = projectBounds();
    // Reserve breathing room for float, pointer tilt, cap lift, and local GSAP translation.
    const fit = Math.min(rect.width * 0.76 / (unscaled.right - unscaled.left), rect.height * 0.76 / (unscaled.bottom - unscaled.top));
    parent.scale.setScalar(fit * bottle.scale.x);
    const fitted = projectBounds();
    const roomX = Math.max(0, (rect.width - (fitted.right - fitted.left)) / 2 - rect.width * 0.04);
    const roomY = Math.max(0, (rect.height - (fitted.bottom - fitted.top)) / 2 - rect.height * 0.04);
    const offsetX = THREE.MathUtils.clamp(bottle.position.x * parent.scale.x / worldPerPixel, -roomX, roomX);
    // Preserve the interaction child's idle float instead of centering it away.
    const floatY = bottle.children[0]?.position.y ?? 0;
    const offsetY = THREE.MathUtils.clamp(-(bottle.position.y + floatY * bottle.scale.y) * parent.scale.x / worldPerPixel, -roomY, roomY);
    parent.position.addScaledVector(scratch.right, (centerX + offsetX - (fitted.left + fitted.right) / 2) * worldPerPixel)
      .addScaledVector(scratch.up, -(centerY + offsetY - (fitted.top + fitted.bottom) / 2) * worldPerPixel);
    parent.updateMatrixWorld(true);
  });
}
