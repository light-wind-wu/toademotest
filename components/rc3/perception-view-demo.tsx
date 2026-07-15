"use client";

import {
  type AreaOfInterest,
  type OccupancyLayer,
  type PerceptionScene,
  PerceptionView,
  type PointCloudLayer,
  type Vec3,
} from "@/components/rc3/perception-view";
import { useEffect, useMemo, useState } from "react";

// Deterministic PRNG so the sample scene is identical every render — no hydration
// drift, no invented jitter between frames.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Building footprint and form, metres. A mid-rise the swarm is mapping.
const HALF_X = 9;
const HALF_Y = 7;
const HEIGHT = 30;
const FLOORS = 6;
const FLOOR_H = HEIGHT / FLOORS;
// Window bays per wall face, and how proud each window sits of the wall so the
// painter's-order renderer draws it cleanly in front rather than fighting the plane.
const BAYS_X = 5;
const BAYS_Y = 4;
const WIN_PROUD = 0.2;

function buildAerialPoints(rand: () => number): Vec3[] {
  const pts: Vec3[] = [];
  // Roof plane — what an aerial LiDAR sees first.
  for (let i = 0; i < 200; i++) {
    pts.push([(rand() * 2 - 1) * HALF_X, (rand() * 2 - 1) * HALF_Y, HEIGHT + (rand() - 0.5) * 0.4]);
  }
  // Upper wall grazing returns.
  for (let i = 0; i < 120; i++) {
    const onX = rand() > 0.5;
    pts.push([
      onX ? (rand() * 2 - 1) * HALF_X : rand() > 0.5 ? HALF_X : -HALF_X,
      onX ? (rand() > 0.5 ? HALF_Y : -HALF_Y) : (rand() * 2 - 1) * HALF_Y,
      HEIGHT * (0.55 + rand() * 0.45),
    ]);
  }
  return pts;
}

function buildGroundPoints(rand: () => number): Vec3[] {
  const pts: Vec3[] = [];
  // Lower walls from a ground platform.
  for (let i = 0; i < 280; i++) {
    const onX = rand() > 0.5;
    pts.push([
      onX ? (rand() * 2 - 1) * HALF_X : rand() > 0.5 ? HALF_X : -HALF_X,
      onX ? (rand() > 0.5 ? HALF_Y : -HALF_Y) : (rand() * 2 - 1) * HALF_Y,
      HEIGHT * 0.5 * rand(),
    ]);
  }
  // Ground apron around the entrance.
  for (let i = 0; i < 90; i++) {
    pts.push([-HALF_X - rand() * 6, (rand() * 2 - 1) * HALF_Y, (rand() - 0.5) * 0.2]);
  }
  return pts;
}

function buildOccupancy(rand: () => number): Vec3[] {
  const voxels: Vec3[] = [];
  for (let x = -HALF_X + 1; x < HALF_X; x += 1.4) {
    for (let y = -HALF_Y + 1; y < HALF_Y; y += 1.4) {
      // Carve a rough interior corridor so it reads as a floor plan, not a slab.
      if (Math.abs(y) < 1.1 && x > -6 && x < 6) continue;
      if (rand() > 0.82) continue;
      voxels.push([x, y, 0.2]);
    }
  }
  return voxels;
}

// The mesh carries the literal architecture: an outer shell plus a grid of window
// openings on every face. AOIs ride on top of it, highlighting specific windows.
function buildStructure(): { vertices: Vec3[]; faces: [number, number, number][] } {
  const vertices: Vec3[] = [];
  const faces: [number, number, number][] = [];
  const quad = (a: number, b: number, c: number, d: number) => {
    faces.push([a, b, c], [a, c, d]);
  };

  // Outer shell — four walls and a roof.
  vertices.push(
    [-HALF_X, -HALF_Y, 0],
    [HALF_X, -HALF_Y, 0],
    [HALF_X, HALF_Y, 0],
    [-HALF_X, HALF_Y, 0],
    [-HALF_X, -HALF_Y, HEIGHT],
    [HALF_X, -HALF_Y, HEIGHT],
    [HALF_X, HALF_Y, HEIGHT],
    [-HALF_X, HALF_Y, HEIGHT],
  );
  quad(0, 1, 5, 4);
  quad(1, 2, 6, 5);
  quad(2, 3, 7, 6);
  quad(3, 0, 4, 7);
  quad(4, 5, 6, 7);

  // One window quad, given its centre, the in-plane horizontal axis, and half-extents.
  const addWindow = (center: Vec3, ux: number, uy: number, halfW: number, halfH: number) => {
    const [cx, cy, cz] = center;
    const i = vertices.length;
    vertices.push(
      [cx - ux * halfW, cy - uy * halfW, cz - halfH],
      [cx + ux * halfW, cy + uy * halfW, cz - halfH],
      [cx + ux * halfW, cy + uy * halfW, cz + halfH],
      [cx - ux * halfW, cy - uy * halfW, cz + halfH],
    );
    faces.push([i, i + 1, i + 2], [i, i + 2, i + 3]);
  };

  const halfH = FLOOR_H * 0.32;
  // Walls spanning X (the ±Y faces).
  const cellX = (2 * HALF_X) / BAYS_X;
  for (const sy of [HALF_Y, -HALF_Y]) {
    const oy = sy > 0 ? WIN_PROUD : -WIN_PROUD;
    for (let fl = 0; fl < FLOORS; fl++) {
      const cz = (fl + 0.5) * FLOOR_H;
      for (let b = 0; b < BAYS_X; b++) {
        const cx = -HALF_X + (b + 0.5) * cellX;
        addWindow([cx, sy + oy, cz], 1, 0, cellX * 0.28, halfH);
      }
    }
  }
  // Walls spanning Y (the ±X faces).
  const cellY = (2 * HALF_Y) / BAYS_Y;
  for (const sx of [HALF_X, -HALF_X]) {
    const ox = sx > 0 ? WIN_PROUD : -WIN_PROUD;
    for (let fl = 0; fl < FLOORS; fl++) {
      const cz = (fl + 0.5) * FLOOR_H;
      for (let b = 0; b < BAYS_Y; b++) {
        const cy = -HALF_Y + (b + 0.5) * cellY;
        addWindow([sx + ox, cy, cz], 0, 1, cellY * 0.28, halfH);
      }
    }
  }

  return { vertices, faces };
}

// AOIs anchored to specific windows (and the entrance) — the operator-meaningful
// subset highlighted against the window grid.
const cellX = (2 * HALF_X) / BAYS_X;
const cellY = (2 * HALF_Y) / BAYS_Y;
const winX = (bay: number) => -HALF_X + (bay + 0.5) * cellX;
const winY = (bay: number) => -HALF_Y + (bay + 0.5) * cellY;
const floorZ = (fl: number) => (fl + 0.5) * FLOOR_H;

const AOIS: AreaOfInterest[] = [
  {
    id: "entry",
    label: "Entrance",
    kind: "objective",
    position: [-HALF_X - 1.5, 0, 1.4],
    confidence: 0.93,
    sourceId: "UGV-04",
  },
  {
    id: "smoke",
    label: "Smoke",
    kind: "hazard",
    position: [winX(3), HALF_Y + WIN_PROUD, floorZ(5)],
    confidence: 0.74,
    sourceId: "UAV-09",
  },
  {
    id: "casualty",
    label: "Casualty",
    kind: "inspect",
    position: [HALF_X + WIN_PROUD, winY(2), floorZ(3)],
    confidence: 0.61,
    sourceId: "UAV-11",
  },
  {
    id: "roof",
    label: "Roof access",
    kind: "marker",
    position: [winX(1), HALF_Y - 2, HEIGHT],
    confidence: 0.5,
  },
];

// The swarm feeding the consolidated map. Each platform carries its own freshness;
// `phase` staggers a periodic dropout so the provenance strip shows rolling
// LIVE/STALE — fusion happens upstream, but per-source provenance survives it.
const SWARM = [
  { id: "UAV-09", phase: 0 },
  { id: "UAV-11", phase: 13 },
  { id: "UAV-14", phase: 20 },
  { id: "UGV-04", phase: 7 },
  { id: "UGV-05", phase: 17 },
  { id: "UGV-07", phase: 4 },
];
const PERIOD = 26;
const DROP = 6;

function swarmAge(clock: number, phase: number): number {
  const c = (((clock + phase) % PERIOD) + PERIOD) % PERIOD;
  // Climbing age while dropped out (crosses the 3s stale line ~2.4s in); else fresh.
  if (c < DROP) return 0.6 + c;
  return 0.2 + (clock % 1.4) * 0.6;
}

/**
 * Docs-only driver for the Perception view. Generates one small bundled scene and
 * replays it in-browser — a real renderer drawing real (sample) geometry, not
 * invented live telemetry. A swarm of platforms feeds a consolidated map of a
 * mid-rise building; the mesh carries the window grid and AOIs highlight specific
 * windows. Platforms drop out and re-acquire on a rolling cycle so their points
 * decay and provenance flips to STALE, demonstrating invariant 5.
 */
export function PerceptionViewDemo({ autoRotate = true }: { autoRotate?: boolean }) {
  const geometry = useMemo(() => {
    const rand = mulberry32(0x5eed);
    return {
      aerial: buildAerialPoints(rand),
      ground: buildGroundPoints(rand),
      occupancy: buildOccupancy(rand),
      structure: buildStructure(),
    };
  }, []);

  const [clock, setClock] = useState(0);
  const [hidden, setHidden] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>("smoke");

  useEffect(() => {
    const t = setInterval(() => setClock((c) => c + 0.1), 100);
    return () => clearInterval(t);
  }, []);

  const scene: PerceptionScene = useMemo(() => {
    const ageOf = (id: string) => {
      const p = SWARM.find((s) => s.id === id);
      return p ? swarmAge(clock, p.phase) : 0;
    };

    const structure = {
      kind: "mesh" as const,
      id: "shell",
      label: "Structure",
      vertices: geometry.structure.vertices,
      faces: geometry.structure.faces,
    };
    const aerial: PointCloudLayer = {
      kind: "points",
      id: "aerial-cloud",
      label: "Aerial cloud",
      sourceId: "UAV-09",
      points: geometry.aerial,
    };
    const ground: PointCloudLayer = {
      kind: "points",
      id: "ground-cloud",
      label: "Ground cloud",
      sourceId: "UGV-04",
      points: geometry.ground,
    };
    const occupancy: OccupancyLayer = {
      kind: "occupancy",
      id: "floor-occupancy",
      label: "Floor plan",
      sourceId: "UGV-05",
      voxels: geometry.occupancy,
      voxelSize: 1.1,
    };

    return {
      frame: "ENU",
      sources: SWARM.map((s) => ({
        id: s.id,
        ageSeconds: swarmAge(clock, s.phase),
        transform: { translation: [0, 0, 0] as Vec3 },
      })),
      layers: [structure, occupancy, ground, aerial],
      aois: AOIS.map((a) => (a.sourceId ? { ...a, ageSeconds: ageOf(a.sourceId) } : a)),
    };
  }, [clock, geometry]);

  return (
    <PerceptionView
      scene={scene}
      autoRotate={autoRotate}
      hiddenLayerIds={hidden}
      onToggleLayer={(id) =>
        setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]))
      }
      selectedAoiId={selected}
      onSelectAoi={setSelected}
    />
  );
}
