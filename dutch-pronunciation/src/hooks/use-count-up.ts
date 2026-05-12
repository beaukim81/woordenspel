import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 900, delay = 0) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    let start: number | null = null;
    const startValue = 0;

    const timeout = setTimeout(() => {
      function step(timestamp: number) {
        if (start === null) start = timestamp;
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(startValue + (target - startValue) * eased));
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(step);
        }
      }
      frameRef.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, delay]);

  return value;
}
