import type { Direction } from './icons';

/** Fraction of the visible size moved by one press of a scroll button. */
const STEP = 0.6;

/** Scrolls an element one step in a direction (works without smooth scrolling, e.g. jsdom). */
export const scrollStep = (el: HTMLElement | null, direction: Direction) => {
  if (!el) return;
  const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
  const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
  const left = dx * Math.max(80, el.clientWidth * STEP);
  const top = dy * Math.max(80, el.clientHeight * STEP);
  if (typeof el.scrollBy === 'function') {
    el.scrollBy({ left, top, behavior: 'smooth' });
    return;
  }
  el.scrollLeft += left;
  el.scrollTop += top;
};
