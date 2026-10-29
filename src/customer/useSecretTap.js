import { useRef } from "react";

// Hidden staff entrance: returns a tap handler that calls onTrigger after
// `taps` taps with no gap longer than `windowMs` between them.
export function useSecretTap(onTrigger, { taps = 7, windowMs = 2000 } = {}) {
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  return () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, windowMs);
    if (tapCountRef.current >= taps) {
      tapCountRef.current = 0;
      onTrigger();
    }
  };
}
