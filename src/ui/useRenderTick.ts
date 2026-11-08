import { useEffect, useState } from 'react';
import { onImageLoaded } from '../render/images';

/** Increments whenever an image or web font finishes loading, so canvases can redraw. */
export function useRenderTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const off = onImageLoaded(bump);
    document.fonts.addEventListener('loadingdone', bump);
    return () => {
      off();
      document.fonts.removeEventListener('loadingdone', bump);
    };
  }, []);
  return tick;
}
