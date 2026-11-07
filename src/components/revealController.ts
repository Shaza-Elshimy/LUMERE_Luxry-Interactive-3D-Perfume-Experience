import type gsap from 'gsap';

export const REVEAL_TURN_END = 0.78;
export type RevealController = {
  motion: { handoff: number };
  timeline: gsap.core.Timeline | null;
  subscribers: Set<(timeline: gsap.core.Timeline | null) => void>;
};
