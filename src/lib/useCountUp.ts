import { useEffect, useRef, useState } from 'react';

/**
 * Counts a number up on first paint, and between values when the month changes.
 * Reduced motion users get the final number straight away.
 */
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  const finishedOnce = useRef(false);
  const previous = useRef(0);

  useEffect(() => {
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setValue(target);
      finishedOnce.current = true;
      previous.current = target;
      return;
    }

    const from = finishedOnce.current ? previous.current : 0;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        finishedOnce.current = true;
        previous.current = target;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
