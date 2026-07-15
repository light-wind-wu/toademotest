'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useSystemConfig } from '@/lib/portal-config';

/* Kinetic overscroll bounce (design spec §interactions): a continuous, repeatable
   rubber-band. Whenever the user pushes past the top OR bottom edge — by wheel or
   touch — the content follows with damped resistance (the further you push, the less
   it gives) and springs straight back when the push stops. It re-triggers on every
   push (no "once per gesture" lock), fires at BOTH edges, and works even on pages too
   short to scroll (so users always get end-of-content feedback).

   Paired with a subtle, on-brand EDGE BLOOM: a soft teal→blue glow (DSTA "Dynamic
   Minimalism") whose intensity tracks how hard you pull, fading as it springs back.
   Glows sit in the content area (clear of the fixed sidebar/topbar), never capture
   pointer events. Honours prefers-reduced-motion (the whole effect no-ops). Operates
   on the window scroller, the main scroller for in-shell pages. */
export default function KineticBounce({ children, fullBleed = false }: { children: ReactNode; fullBleed?: boolean }) {
  const ref     = useRef<HTMLDivElement>(null);
  const topGlow = useRef<HTMLDivElement>(null);
  const botGlow = useRef<HTMLDivElement>(null);
  const { kineticScroll } = useSystemConfig(); // Admin → System config feature switch

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!kineticScroll) return; // disabled in Admin Settings → System configuration
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    const se = document.scrollingElement || document.documentElement;
    if (!el || !se) return;

    // Small max travel + heavy friction = a subtle nudge that recedes immediately.
    // STEP caps per-frame travel so a big/fast swipe eases in instead of slamming.
    const MAX = 10, K = 0.05, STEP = 2.4, FRICTION = 0.82;
    let offset = 0;
    let pendingImpulse = 0;   // wheel input accrued between frames (applied once per frame)
    let touchActive = false;
    let rafId: number | null = null;
    let touchY: number | null = null;

    const atTop = () => se.scrollTop <= 0;
    const atBottom = () => Math.ceil(se.scrollTop + se.clientHeight) >= se.scrollHeight - 1;

    /* Single writer for the transform + edge glow (positive offset = pulled down = top
       edge; negative = pulled up = bottom edge). translate3d keeps it on the GPU. */
    function render() {
      if (!el) return;
      el.style.transform = offset ? `translate3d(0, ${offset.toFixed(2)}px, 0)` : '';
      const intensity = Math.min(1, Math.abs(offset) / MAX);
      const t = topGlow.current, b = botGlow.current;
      if (t) t.style.opacity = offset > 0 ? intensity.toFixed(2) : '0';
      if (b) b.style.opacity = offset < 0 ? intensity.toFixed(2) : '0';
    }

    /* The ONLY place the transform is written — one update per animation frame, so
       wheel (which fires many times per frame) can't fight the loop. Input accrues into
       pendingImpulse; friction eases the band back toward 0 each frame so it recedes the
       instant the push stops, even mid-momentum. */
    function frame() {
      if (pendingImpulse) {
        const resist = 1 - Math.min(1, Math.abs(offset) / MAX) * 0.6;
        // cap per-frame travel and discard the excess, so a big/fast swipe (or its
        // momentum tail) can't slam or pin the band — it just eases toward MAX.
        const step = Math.max(-STEP, Math.min(STEP, pendingImpulse));
        offset += step * resist;
        pendingImpulse = 0;
      }
      if (!touchActive) offset *= FRICTION;
      offset = Math.max(-MAX, Math.min(MAX, offset));
      render();
      if (!touchActive && Math.abs(offset) < 0.3) {
        offset = 0; render();
        if (el) el.style.willChange = '';
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(frame);
    }
    function start() {
      if (rafId == null) {
        if (el) el.style.willChange = 'transform'; // promote to its own layer while animating
        rafId = requestAnimationFrame(frame);
      }
    }

    function onWheel(e: WheelEvent) {
      const active = (e.deltaY < 0 && atTop()) || (e.deltaY > 0 && atBottom());
      if (!active) {
        // Native scroll resuming (e.g. scrolling up off the bottom edge, or down off the
        // top). If a bounce offset is still decaying it visibly fights the native scroll —
        // the "janky" feel. Snap it to zero hard so the transform clears in ~1 frame
        // instead of lingering across the friction tail.
        if (offset !== 0) { pendingImpulse = 0; offset *= 0.25; start(); }
        return;
      }
      // NB: we deliberately do NOT preventDefault here, so the listener stays passive.
      // `overscroll-behavior: none` (globals.css) already suppresses the native
      // rubber-band this used to guard against, so blocking the wheel was redundant —
      // and on Safari/macOS, where scrollingElement.scrollTop is fractional, atBottom()
      // can read true a hair early; cancelling the wheel there stranded the last
      // sliver of long pages. At the true edge native scroll is a no-op, so letting it
      // through is safe and the bounce still renders via the transform below.
      pendingImpulse += -e.deltaY * K; // up-push (deltaY<0) → +offset (content moves down)
      start();
    }

    function onTouchStart(e: TouchEvent) { touchY = e.touches[0].clientY; }
    function onTouchMove(e: TouchEvent) {
      if (touchY == null) return;
      const dy = e.touches[0].clientY - touchY;
      if ((dy > 0 && atTop()) || (dy < 0 && atBottom())) {
        e.preventDefault();
        touchActive = true;
        offset = Math.max(-MAX, Math.min(MAX, dy * 0.22)); // damped finger-follow
        start();
      }
    }
    function onTouchEnd() { touchY = null; touchActive = false; start(); }

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [kineticScroll]);

  // In-Shell pages inset the glow past the fixed sidebar/topbar; chrome-less flows
  // (token portals, uploads) bleed to the viewport edges.
  const topPos = fullBleed ? 'top-0 left-0' : 'top-[64px] left-0 md:left-[112px]';
  const botPos = fullBleed ? 'bottom-0 left-0' : 'bottom-0 left-0 md:left-[112px]';

  return (
    <>
      {/* Edge blooms — non-interactive, invisible at rest. Brand teal→blue radial glow. */}
      <div
        ref={topGlow}
        aria-hidden="true"
        className={`pointer-events-none fixed right-0 z-20 h-[116px] opacity-0 ${topPos}`}
        style={{ background: 'radial-gradient(135% 100% at 50% 0%, rgb(var(--toa-teal) / 0.55), rgb(var(--toa-blue) / 0.30) 42%, transparent 74%)' }}
      />
      <div
        ref={botGlow}
        aria-hidden="true"
        className={`pointer-events-none fixed right-0 z-20 h-[116px] opacity-0 ${botPos}`}
        style={{ background: 'radial-gradient(135% 100% at 50% 100%, rgb(var(--toa-teal) / 0.55), rgb(var(--toa-blue) / 0.30) 42%, transparent 74%)' }}
      />
      <div ref={ref}>{children}</div>
    </>
  );
}
