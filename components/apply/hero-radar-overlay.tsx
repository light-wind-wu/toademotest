'use client';

/* Desktop V1 Part1 — ship bg + radar in ONE object-contain/object-right frame
   so sidebar expand/collapse cannot desync overlay from the PNG. */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Logical art space (Figma banner / PNG aspect) */
const ART_W = 1372;
const ART_H = 345;

/** Ship frame + SVG radar centre (Figma), with mast fine-tune */
const SHIP_LEFT = 603;
const SHIP_TOP = -1;
const SHIP_W = 746;
const SHIP_H = 317;
const VB_W = 722;
const VB_H = 306;
const RADAR_CX = 436;
const RADAR_CY = 104;
const RADAR_R = 67;

const OFFSET_X = 0;
const OFFSET_Y = 2;
const RADIUS_SCALE = 1;

const SX = SHIP_W / VB_W;
const SY = SHIP_H / VB_H;

const CX = SHIP_LEFT + RADAR_CX * SX + OFFSET_X;
const CY = SHIP_TOP + RADAR_CY * SY + OFFSET_Y;
const R = RADAR_R * SX * RADIUS_SCALE;

const PAD = 10;
const C = R + PAD;
const SZ = C * 2;
const RADAR_LEFT = CX - C;
const RADAR_TOP = CY - C;

const A2 = Math.PI / 3;
const SX1 = C + R;
const SY1 = C;
const SX2 = C + R * Math.cos(A2);
const SY2 = C + R * Math.sin(A2);

type Frame = { left: number; top: number; width: number; height: number };

function containRight(boxW: number, boxH: number): Frame {
  const scale = Math.min(boxW / ART_W, boxH / ART_H);
  const width = ART_W * scale;
  const height = ART_H * scale;
  return {
    left: boxW - width,
    /* Nudge ship + radar down for mast alignment under copy */
    top: 40,
    width,
    height,
  };
}

function RadarSvg() {
  return (
    <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${SZ} ${SZ}`}>
      <circle cx={C} cy={C} r={R} fill="rgba(26,101,248,0.07)" />
      <circle
        cx={C}
        cy={C}
        r={R}
        fill="none"
        stroke="rgba(90,200,220,0.5)"
        strokeWidth="1"
      />
      <line
        x1={C - R}
        y1={C}
        x2={C + R}
        y2={C}
        stroke="rgba(90,200,220,0.2)"
        strokeWidth="0.6"
      />
      <line
        x1={C}
        y1={C - R}
        x2={C}
        y2={C + R}
        stroke="rgba(90,200,220,0.2)"
        strokeWidth="0.6"
      />
      <circle
        className="ship-radar-ring"
        cx={C}
        cy={C}
        r={R * 0.33}
        fill="none"
        stroke="rgba(52,220,200,0.9)"
        strokeWidth="1.3"
      />
      <circle
        className="ship-radar-ring ship-radar-ring-d2"
        cx={C}
        cy={C}
        r={R * 0.6}
        fill="none"
        stroke="rgba(52,220,200,0.9)"
        strokeWidth="1.3"
      />
      <circle
        className="ship-radar-ring ship-radar-ring-d3"
        cx={C}
        cy={C}
        r={R * 0.88}
        fill="none"
        stroke="rgba(52,220,200,0.9)"
        strokeWidth="1.3"
      />
      <g className="ship-radar-sweep" style={{ transformOrigin: `${C}px ${C}px` }}>
        <path
          d={`M${C} ${C} L${SX1} ${SY1} A${R} ${R} 0 0 1 ${SX2} ${SY2} Z`}
          fill="rgba(52,146,145,0.28)"
        />
        <line
          x1={C}
          y1={C}
          x2={SX1}
          y2={SY1}
          stroke="rgba(52,230,200,0.95)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <circle cx={C} cy={C} r={2.8} fill="rgba(52,230,200,1)" />
    </svg>
  );
}

/** Ship PNG + radar, locked to the same contain box (sidebar-safe). */
export default function HeroRadarOverlay({ className }: { className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<Frame | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      setFrame(containRight(width, height));
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      className={cn(
        'pointer-events-none absolute inset-0 z-0 overflow-visible',
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
          <Image
            src="/images/dashboard-v1-top.png"
            alt=""
            fill
            className="object-fill"
            sizes="1440px"
            priority
          />
          <div
            className="absolute z-[1] overflow-visible"
            style={{
              left: `${(RADAR_LEFT / ART_W) * 100}%`,
              top: `${(RADAR_TOP / ART_H) * 100}%`,
              width: `${(SZ / ART_W) * 100}%`,
              height: `${(SZ / ART_H) * 100}%`,
            }}
          >
            <RadarSvg />
          </div>
        </div>
      )}
    </div>
  );
}
