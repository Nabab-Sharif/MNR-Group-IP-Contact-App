import { useEffect, useRef } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  edgeOnly?: boolean;
  edgeWidth?: number;
}

/**
 * Detects horizontal swipe gestures on touch devices.
 * Ignores vertical scrolls and short flicks.
 */
export const useSwipeNavigation = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 70,
  edgeOnly = false,
  edgeWidth = 40,
}: SwipeOptions) => {
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (edgeOnly) {
        if (t.clientX > edgeWidth && t.clientX < window.innerWidth - edgeWidth) {
          tracking.current = false;
          return;
        }
      }
      // Ignore touches that start on interactive horizontally-scrolling areas
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [data-no-swipe]')) {
        tracking.current = false;
        return;
      }
      startX.current = t.clientX;
      startY.current = t.clientY;
      tracking.current = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking.current) return;
      tracking.current = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;
      if (Math.abs(dx) < threshold) return;
      if (Math.abs(dy) > Math.abs(dx) * 0.7) return; // mostly vertical → ignore
      if (dx < 0 && onSwipeLeft) onSwipeLeft();
      else if (dx > 0 && onSwipeRight) onSwipeRight();
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, threshold, edgeOnly, edgeWidth]);
};
