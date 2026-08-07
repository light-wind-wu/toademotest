'use client';

/* V2 Part1 layers (split for stacking):
   - HeroV2Bg  — bitmap under Part 2
   - HeroV2Fx  — radar + diagonals above Part 2 (sweep can paint onto the card)
   Both use the same contain-right frame so sidebar collapse stays aligned. */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * dashboard-v2-top.png is @3x (6174×1554 → 1x 2058×518 full sheet).
 * First-screen display height per design/Figma image layer: 313.
 * Width keeps PNG aspect at that height: 313 × (6174/1554) ≈ 1244.
 */
const ART_W = 1244;
const ART_H = 313;

/** Figma Make overlays on 1372×345 banner → scale to 1244×313 */
const Figma_TO_ART = ART_H / 345;
const RADAR_BOX_L = 960 * Figma_TO_ART - 60;
const RADAR_BOX_T = 0;
const RADAR_BOX_W = 400 * Figma_TO_ART;
const RADAR_BOX_H = 320 * Figma_TO_ART;

const DIAG_L = 900 * Figma_TO_ART;
const DIAG_W = 540 * Figma_TO_ART;

type Frame = { left: number; top: number; width: number; height: number };

function containRightTop(boxW: number, boxH: number): Frame {
  const scale = Math.min(boxW / ART_W, boxH / ART_H);
  const width = ART_W * scale;
  const height = ART_H * scale;
  return {
    left: boxW - width,
    top: 0,
    width,
    height,
  };
}

function useContainFrame() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<Frame | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      setFrame(containRightTop(width, height));
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { boxRef, frame };
}

function V2RadarSvg() {
  return (
    <svg
      className="h-full w-full overflow-visible"
      viewBox="0 0 400 320"
      fill="none"
    >
      <circle cx="160" cy="160" r="160" fill="rgba(0,120,200,0.04)" />

      {[45, 85, 125, 165].map((r, i) => (
        <circle
          key={r}
          cx="160"
          cy="160"
          r={r}
          stroke={`rgba(0,160,244,${0.12 - i * 0.02})`}
          strokeWidth="0.5"
          fill="none"
        />
      ))}

      {[0, 0.93, 1.86].map((delay) => (
        <circle
          key={delay}
          className="v2-radar-pulse"
          cx="160"
          cy="160"
          r="28"
          stroke="rgba(0,166,244,0.55)"
          strokeWidth="1"
          fill="none"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}

      <line
        x1="0"
        y1="160"
        x2="320"
        y2="160"
        stroke="rgba(0,166,244,0.1)"
        strokeWidth="0.5"
        strokeDasharray="3 5"
      />
      <line
        x1="160"
        y1="0"
        x2="160"
        y2="320"
        stroke="rgba(0,166,244,0.1)"
        strokeWidth="0.5"
        strokeDasharray="3 5"
      />

      <g className="v2-radar-sweep">
        <path
          d="M160 160 L310 68 A178 178 0 0 0 338 160 Z"
          fill="rgba(0,190,244,0.065)"
        />
        <line
          x1="160"
          y1="160"
          x2="310"
          y2="68"
          stroke="rgba(0,210,244,0.7)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>

      <circle cx="160" cy="160" r="7" fill="rgba(0,150,230,0.55)" />
      <circle cx="160" cy="160" r="3" fill="white" opacity="0.9" />

      <g className="v2-radar-dot" style={{ animationDelay: '0.15s' }}>
        <circle cx="218" cy="112" r="3.5" fill="#00c6f0" />
        <circle
          cx="218"
          cy="112"
          r="9"
          stroke="#00c6f0"
          strokeWidth="0.6"
          fill="none"
        />
      </g>
      <g className="v2-radar-dot" style={{ animationDelay: '0.85s' }}>
        <circle cx="100" cy="198" r="2.5" fill="#1a65f8" />
        <circle
          cx="100"
          cy="198"
          r="7"
          stroke="#1a65f8"
          strokeWidth="0.5"
          fill="none"
        />
      </g>
      <g className="v2-radar-dot" style={{ animationDelay: '1.5s' }}>
        <circle cx="238" cy="200" r="2" fill="#4b86dd" />
      </g>
    </svg>
  );
}

const DIAG_STRIPES = [
  { xTop: 430, xBot: 215, w: 38, opacity: 0.055, delay: 0 },
  { xTop: 470, xBot: 255, w: 25, opacity: 0.04, delay: 0.13 },
  { xTop: 510, xBot: 295, w: 18, opacity: 0.03, delay: 0.26 },
  { xTop: 548, xBot: 333, w: 12, opacity: 0.02, delay: 0.38 },
] as const;

function DiagonalStripes() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {DIAG_STRIPES.map((s, i) => (
        <div
          key={i}
          className="v2-diag-slide absolute inset-0"
          style={{ animationDelay: `${s.delay}s` }}
        >
          <svg
            className="h-full w-full"
            viewBox={`0 0 ${DIAG_W} ${ART_H}`}
            preserveAspectRatio="none"
          >
            <path
              d={`M${s.xTop} 0 L${s.xBot} ${ART_H} L${s.xBot + s.w} ${ART_H} L${s.xTop + s.w} 0 Z`}
              fill={`rgba(0,140,220,${s.opacity})`}
            />
          </svg>
        </div>
      ))}
    </div>
  );
}

/** Bottom layer: command-center bitmap only (Part 2 covers the lower edge). */
export function HeroV2Bg({ className }: { className?: string }) {
  const { boxRef, frame } = useContainFrame();

  return (
    <div
      ref={boxRef}
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    >
      {frame && (
        <div
          className="absolute overflow-hidden"
          style={{
            left: frame.left,
            top: frame.top,
            width: frame.width,
            height: frame.height,
          }}
        >
          <Image
            src="/images/dashboard-v2-top.png"
            alt=""
            fill
            className="object-contain object-right-top"
            sizes="1440px"
            priority
          />
        </div>
      )}
    </div>
  );
}

/** Top layer: radar + diagonal stripes (above Part 2; sweep may spill onto the card). */
export function HeroV2Fx({ className }: { className?: string }) {
  const { boxRef, frame } = useContainFrame();

  return (
    <div
      ref={boxRef}
      className={cn(
        'pointer-events-none absolute inset-0 overflow-visible',
        className,
      )}
      aria-hidden
    >
      {frame && (
        <div
          className="absolute overflow-visible"
          style={{
            left: frame.left,
            top: frame.top,
            width: frame.width,
            height: frame.height,
          }}
        >
          <div
            className="absolute overflow-visible"
            style={{
              left: `${(RADAR_BOX_L / ART_W) * 100}%`,
              top: `${(RADAR_BOX_T / ART_H) * 100}%`,
              width: `${(RADAR_BOX_W / ART_W) * 100}%`,
              height: `${(RADAR_BOX_H / ART_H) * 100}%`,
            }}
          >
            <V2RadarSvg />
          </div>

          <div
            className="absolute overflow-hidden"
            style={{
              left: `${(DIAG_L / ART_W) * 100}%`,
              top: 0,
              width: `${(DIAG_W / ART_W) * 100}%`,
              height: '100%',
            }}
          >
            <DiagonalStripes />
          </div>
        </div>
      )}
    </div>
  );
}
