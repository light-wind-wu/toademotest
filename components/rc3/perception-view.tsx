"use client";

import { cn } from "@/lib/utils";
import { Minus, Pause, Play, Plus } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";

// -----------------------------------------------------------------------------
// Data contract — what an upstream perception system streams in.
//
// RC3 does NOT fuse, register, or SLAM. We assume an upstream system consolidates
// the swarm's sensors into one clean scene and hands it over — the same role the
// Controller interface plays for a physical gamepad. RC3 owns the *contract*, the
// operator *chrome*, and a reference *renderer*. The shapes below are the
// web-friendly expression of the robotics-runtime families (ROS 2 / Foxglove):
// PointCloud, Grid/OccupancyGrid, SceneUpdate markers, FrameTransform.

/** Canonical scene frame. Pin one and make sources declare theirs — frame
 * mismatch (z-up vs y-up, ENU vs NED) is the number-one integration failure. */
export type CoordinateFrame = "ENU" | "NED" | "z-up" | "y-up";

/** A point in the scene frame, metres: [east, north, up] for ENU. */
export type Vec3 = [number, number, number];

/** A rigid transform from a source's local frame into the scene frame. The lean
 * reference renderer honours translation + yaw; a render delegate may consume the
 * full pose. Equivalent to a Foxglove `FrameTransform`. */
export interface FrameTransform {
  translation: Vec3;
  /** Yaw about the up axis, radians. */
  yaw?: number;
}

/** A platform contributing geometry, plus how fresh its contribution is. */
export interface PerceptionSource {
  /** Platform identifier — e.g. "UGV-04". */
  id: string;
  label?: string;
  /** Seconds since this source last delivered fresh geometry. Drives decay and
   * the holding state — invariant 5 applied to space. */
  ageSeconds: number;
  /** This source's pose in the scene frame. */
  transform?: FrameTransform;
}

/** A point-cloud layer — `sensor_msgs/PointCloud2` / Foxglove `PointCloud`. */
export interface PointCloudLayer {
  kind: "points";
  id: string;
  label: string;
  sourceId?: string;
  points: Vec3[];
  /** Optional per-point intensity 0–1 for shading. */
  intensity?: number[];
}

/** An occupancy layer — `nav_msgs/OccupancyGrid` / OctoMap / Foxglove `Grid`,
 * expressed as occupied voxel centres. */
export interface OccupancyLayer {
  kind: "occupancy";
  id: string;
  label: string;
  sourceId?: string;
  voxels: Vec3[];
  voxelSize: number;
}

/** A static structural mesh — building / terrain backdrop. glTF / GLB / 3D Tiles
 * binaries are a render-delegate concern; the reference renderer takes simple
 * pre-tessellated geometry so it stays dependency-free. */
export interface MeshLayer {
  kind: "mesh";
  id: string;
  label: string;
  sourceId?: string;
  vertices: Vec3[];
  faces: [number, number, number][];
}

export type SceneLayer = PointCloudLayer | OccupancyLayer | MeshLayer;

export type AoiKind = "objective" | "hazard" | "inspect" | "marker";

/** Area of interest — the one schema RC3 defines natively. Operator semantics
 * layered over the geometry: kind, confidence, provenance, freshness. */
export interface AreaOfInterest {
  id: string;
  label: string;
  kind: AoiKind;
  position: Vec3;
  /** Which source asserted this AOI. */
  sourceId?: string;
  /** 0–1. Surfaced so the operator can weigh it. */
  confidence?: number;
  /** Seconds since last reasserted. */
  ageSeconds?: number;
}

export interface PerceptionScene {
  frame: CoordinateFrame;
  sources: PerceptionSource[];
  layers: SceneLayer[];
  aois?: AreaOfInterest[];
}

/** Overall feed posture for the whole view. */
export type PerceptionStatus = "live" | "holding" | "lost";

/** Camera state the reference renderer orbits with. */
export interface OrbitCamera {
  /** Azimuth about the up axis, radians. */
  azimuth: number;
  /** Elevation above the horizon, radians. */
  elevation: number;
}

/** Context handed to a render delegate so a vendor engine can draw the geometry
 * while keeping RC3's contract and chrome. */
export interface PerceptionRenderContext {
  scene: PerceptionScene;
  hiddenLayerIds: Set<string>;
  selectedAoiId: string | null;
  staleAfterSeconds: number;
  status: PerceptionStatus;
}

export interface PerceptionViewProps {
  /** The consolidated scene from upstream. */
  scene: PerceptionScene;
  /** Overall feed posture. `holding` and `lost` raise an unmistakable overlay so
   * a frozen scene can never read as live — invariant 5. Default `live`. */
  status?: PerceptionStatus;
  /** Layer ids the operator has toggled off. Controlled. */
  hiddenLayerIds?: string[];
  onToggleLayer?: (layerId: string) => void;
  /** Selected AOI id. Controlled. */
  selectedAoiId?: string | null;
  onSelectAoi?: (aoiId: string | null) => void;
  /** Seconds of source age beyond which geometry visibly decays. Default 3. */
  staleAfterSeconds?: number;
  /** Slowly orbit the reference camera. Respects `prefers-reduced-motion`. */
  autoRotate?: boolean;
  /** Drop in a vendor 3D engine instead of the reference renderer. RC3 still
   * draws the chrome (frame, layers, sources, AOIs, holding state) around it. */
  renderDelegate?: (ctx: PerceptionRenderContext) => ReactNode;
  /** Hide the layer legend / AOI / provenance panels — e.g. for a bare tile. */
  bareChrome?: boolean;
  className?: string;
}

// RC3 signature hue (Ember). Inlined so identity renders honestly regardless of
// docs theme or `data-pack` attribute. Matches sibling RC3 organisms.
const EMBER = "oklch(71% 0.195 32)";

// Per-source point palette. Fixed oklch hues at a mid lightness that reads on
// both C3 light and C3 dark viewports. Identity (Ember) and AOI semantics stay
// visually distinct from these.
const SOURCE_HUES = [220, 195, 150, 300, 45];

function sourceColor(index: number, lightness = 0.66, alpha = 1): string {
  const hue = SOURCE_HUES[index % SOURCE_HUES.length];
  return `oklch(${lightness} 0.14 ${hue} / ${alpha})`;
}

const AOI_TONE: Record<AoiKind, string> = {
  objective: "text-fg",
  hazard: "text-danger",
  inspect: "text-warning",
  marker: "text-fg-muted",
};

const STATUS_LABEL: Record<PerceptionStatus, { label: string; tone: string }> = {
  live: { label: "LIVE", tone: "text-success" },
  holding: { label: "HOLDING", tone: "text-warning" },
  lost: { label: "FEED LOST", tone: "text-danger" },
};

function freshness(ageSeconds: number, staleAfter: number): number {
  // 1 while fresh, ramping to ~0.2 over the following two stale-windows.
  if (ageSeconds <= staleAfter) return 1;
  const over = (ageSeconds - staleAfter) / (staleAfter * 2);
  return Math.max(0.2, 1 - over * 0.8);
}

function ageTag(seconds: number): string {
  return seconds < 60 ? `${Math.round(seconds)}s` : `${Math.floor(seconds / 60)}m`;
}

// -----------------------------------------------------------------------------

/**
 * RC3 — Perception view
 *
 * The operator's live 3D window into what a robot swarm perceives. RC3 frames the
 * surface (coordinate frame, layer legend, AOI registry, per-source provenance and
 * freshness, the holding / lost overlay) and ships a dependency-free reference
 * renderer that draws points, occupancy voxels, structural mesh, and AOIs from the
 * in-memory scene. A `renderDelegate` lets a high-scale vendor engine take over the
 * drawing while keeping the contract and chrome.
 *
 * RC3 does not fuse, register, or SLAM — an upstream system consolidates the swarm
 * into the clean scene we display, the same way the Controller interface frames a
 * physical gamepad.
 *
 * Honours invariant 5: perception never goes silently stale. Geometry from a source
 * that stops reporting visibly decays rather than staying crisp, per-source
 * freshness is always on screen, and a held or lost feed raises an unmistakable
 * overlay instead of presenting a frozen scene as live.
 */
export function PerceptionView({
  scene,
  status = "live",
  hiddenLayerIds,
  onToggleLayer,
  selectedAoiId = null,
  onSelectAoi,
  staleAfterSeconds = 3,
  autoRotate = false,
  renderDelegate,
  bareChrome = false,
  className,
}: PerceptionViewProps) {
  const hidden = new Set(hiddenLayerIds ?? []);
  const labelId = useId();
  const frozen = status !== "live";

  const sourceIndex = new Map<string, number>();
  scene.sources.forEach((s, i) => sourceIndex.set(s.id, i));

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: role="figure" labels this perception viewport; a native <figure> carries default margins that would break the layout.
      role="figure"
      aria-labelledby={labelId}
      className={cn(
        // Portrait on narrow screens so the chrome panels (top + bottom) leave a clear
        // central band for the scene; 16:9 from sm up.
        "relative aspect-[4/5] overflow-hidden rounded-md border border-border bg-bg sm:aspect-video",
        className,
      )}
    >
      <div className="absolute inset-0">
        {renderDelegate ? (
          renderDelegate({
            scene,
            hiddenLayerIds: hidden,
            selectedAoiId,
            staleAfterSeconds,
            status,
          })
        ) : (
          <ReferenceRenderer
            scene={scene}
            hidden={hidden}
            selectedAoiId={selectedAoiId}
            staleAfterSeconds={staleAfterSeconds}
            autoRotate={autoRotate && !frozen}
            sourceIndex={sourceIndex}
            dimmed={frozen}
            showControls={!bareChrome}
          />
        )}
      </div>

      {/* Top-centre — coordinate frame + overall status */}
      <div className="pointer-events-none absolute left-1/2 top-2.5 flex -translate-x-1/2 items-center gap-2 rounded bg-bg/80 px-2 py-1 backdrop-blur-sm">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: EMBER }}
          aria-hidden="true"
        />
        <span
          id={labelId}
          className="font-mono text-[11px] font-semibold tracking-[0.14em] text-fg"
        >
          {scene.frame}
        </span>
        <span className="text-fg-subtle" aria-hidden="true">
          ·
        </span>
        <span
          className={cn(
            "font-mono text-[10px] font-semibold uppercase tracking-[0.16em]",
            STATUS_LABEL[status].tone,
          )}
        >
          {STATUS_LABEL[status].label}
        </span>
      </div>

      {!bareChrome && (
        <>
          <LayerLegend
            layers={scene.layers}
            hidden={hidden}
            sourceIndex={sourceIndex}
            onToggleLayer={onToggleLayer}
          />
          <SourceProvenance
            sources={scene.sources}
            sourceIndex={sourceIndex}
            staleAfterSeconds={staleAfterSeconds}
          />
          {scene.aois && scene.aois.length > 0 && (
            <AoiRegistry
              aois={scene.aois}
              selectedAoiId={selectedAoiId}
              staleAfterSeconds={staleAfterSeconds}
              onSelectAoi={onSelectAoi}
            />
          )}
        </>
      )}

      {status === "holding" && (
        <HoldingBanner sources={scene.sources} staleAfterSeconds={staleAfterSeconds} />
      )}
      {status === "lost" && <LostOverlay />}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Chrome.

function LayerLegend({
  layers,
  hidden,
  sourceIndex,
  onToggleLayer,
}: {
  layers: SceneLayer[];
  hidden: Set<string>;
  sourceIndex: Map<string, number>;
  onToggleLayer?: (id: string) => void;
}) {
  return (
    <div className="absolute right-2.5 top-2.5 w-36 rounded bg-bg/80 p-1.5 backdrop-blur-sm sm:w-48">
      <div className="px-1.5 pb-1 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
        Layers
      </div>
      <div className="flex flex-col gap-0.5">
        {layers.map((layer) => {
          const off = hidden.has(layer.id);
          const idx = layer.sourceId ? (sourceIndex.get(layer.sourceId) ?? 0) : 0;
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => onToggleLayer?.(layer.id)}
              aria-pressed={!off}
              className={cn(
                "flex items-center gap-2 rounded px-1.5 py-1 text-left transition-colors",
                "hover:bg-fg/5",
                off && "opacity-40",
              )}
            >
              <LayerSwatch kind={layer.kind} color={sourceColor(idx)} />
              <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-fg">
                {layer.label}
              </span>
              <span className="font-mono text-[9px] tabular-nums text-fg-subtle">
                {layerCount(layer)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function layerCount(layer: SceneLayer): string {
  if (layer.kind === "points") return compact(layer.points.length);
  if (layer.kind === "occupancy") return compact(layer.voxels.length);
  return compact(layer.faces.length);
}

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `${n}`;
}

function LayerSwatch({ kind, color }: { kind: SceneLayer["kind"]; color: string }) {
  if (kind === "points") {
    return (
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
    );
  }
  if (kind === "occupancy") {
    return (
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-[1px]"
        style={{ backgroundColor: color, opacity: 0.7 }}
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-[1px] border"
      style={{ borderColor: "var(--color-fg-muted)" }}
      aria-hidden="true"
    />
  );
}

function SourceProvenance({
  sources,
  sourceIndex,
  staleAfterSeconds,
}: {
  sources: PerceptionSource[];
  sourceIndex: Map<string, number>;
  staleAfterSeconds: number;
}) {
  // A stable vertical list — fixed source order, one row each, so a status flip
  // changes in place rather than reflowing the layout. A large swarm overflows
  // into an internal scroll rather than running off the canvas.
  return (
    <div className="pointer-events-none absolute left-2.5 top-2.5 flex max-h-[60%] w-36 flex-col rounded bg-bg/80 p-1.5 backdrop-blur-sm sm:w-48">
      <div className="shrink-0 px-1.5 pb-1 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
        Sources
      </div>
      <div className="pointer-events-auto flex min-h-0 flex-col gap-0.5 overflow-y-auto">
        {sources.map((s) => {
          const stale = s.ageSeconds > staleAfterSeconds;
          const idx = sourceIndex.get(s.id) ?? 0;
          return (
            <div key={s.id} className="flex items-center gap-2 px-1.5 py-0.5">
              <span
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: sourceColor(idx) }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-semibold tracking-[0.08em] text-fg">
                {s.label ?? s.id}
              </span>
              <span className="flex w-20 shrink-0 justify-end">
                {stale ? (
                  <span
                    className="rounded px-1 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor:
                        "color-mix(in oklch, var(--prizm-color-danger) 18%, transparent)",
                      color: "var(--prizm-color-danger)",
                    }}
                  >
                    STALE {ageTag(s.ageSeconds)}
                  </span>
                ) : (
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-success">
                    LIVE
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AoiRegistry({
  aois,
  selectedAoiId,
  staleAfterSeconds,
  onSelectAoi,
}: {
  aois: AreaOfInterest[];
  selectedAoiId: string | null;
  staleAfterSeconds: number;
  onSelectAoi?: (id: string | null) => void;
}) {
  return (
    <div className="absolute right-2.5 bottom-2.5 flex max-h-[60%] w-36 flex-col rounded bg-bg/80 p-1.5 backdrop-blur-sm sm:w-48">
      <div className="shrink-0 px-1.5 pb-1 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
        Areas of interest
      </div>
      <div className="flex min-h-0 flex-col gap-0.5 overflow-y-auto">
        {aois.map((aoi) => {
          const selected = aoi.id === selectedAoiId;
          const stale = aoi.ageSeconds !== undefined && aoi.ageSeconds > staleAfterSeconds;
          return (
            <button
              key={aoi.id}
              type="button"
              onClick={() => onSelectAoi?.(selected ? null : aoi.id)}
              aria-pressed={selected}
              className={cn(
                "flex items-center gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-fg/5",
              )}
              style={selected ? { boxShadow: `inset 0 0 0 1px ${EMBER}` } : undefined}
            >
              <span
                className={cn("inline-block h-1.5 w-1.5 shrink-0 rotate-45", AOI_TONE[aoi.kind])}
                style={{ backgroundColor: "currentColor" }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-fg">
                {aoi.label}
              </span>
              {stale ? (
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-danger">
                  {ageTag(aoi.ageSeconds as number)}
                </span>
              ) : aoi.confidence !== undefined ? (
                <span className="font-mono text-[9px] tabular-nums text-fg-subtle">
                  {Math.round(aoi.confidence * 100)}%
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HoldingBanner({
  sources,
  staleAfterSeconds,
}: {
  sources: PerceptionSource[];
  staleAfterSeconds: number;
}) {
  const oldest = sources.reduce((m, s) => Math.max(m, s.ageSeconds), 0);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
      <div className="flex items-center gap-2 rounded bg-bg/85 px-3 py-1.5 backdrop-blur-sm">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-warning">
          Holding · last good {ageTag(oldest)} ago
        </span>
      </div>
    </div>
  );
}

function LostOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-bg/85 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger" aria-hidden="true" />
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-danger">
          Feed lost
        </span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Reference renderer — dependency-free canvas-2D. Projects the scene with a small
// orbit camera, painter-ordered within each layer kind. No LOD / octree streaming
// / mesh reconstruction — those belong to a render delegate.

function ReferenceRenderer({
  scene,
  hidden,
  selectedAoiId,
  staleAfterSeconds,
  autoRotate,
  sourceIndex,
  dimmed,
  showControls,
}: {
  scene: PerceptionScene;
  hidden: Set<string>;
  selectedAoiId: string | null;
  staleAfterSeconds: number;
  autoRotate: boolean;
  sourceIndex: Map<string, number>;
  dimmed: boolean;
  showControls: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const camRef = useRef<OrbitCamera>({ azimuth: 0.7, elevation: 0.5 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  // Zoom kept off the OrbitCamera type so the public delegate contract is unchanged.
  const zoomRef = useRef(1);
  const [rotating, setRotating] = useState(autoRotate);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const fgMuted = readVar(canvas, "--color-fg-muted", "oklch(60% 0 0)");

    const bounds = sceneBounds(scene);
    const target = bounds.center;
    const radius = Math.max(bounds.radius, 1);
    const cam = camRef.current;

    // Camera basis from azimuth / elevation; orthographic-ish with mild perspective.
    const ca = Math.cos(cam.azimuth);
    const sa = Math.sin(cam.azimuth);
    const ce = Math.cos(cam.elevation);
    const se = Math.sin(cam.elevation);
    const distance = radius * 3.2;
    const focal = Math.min(w, h) * 1.15 * zoomRef.current;

    const project = (p: Vec3): { x: number; y: number; depth: number; scale: number } => {
      const dx = p[0] - target[0];
      const dy = p[1] - target[1];
      const dz = p[2] - target[2];
      // Yaw about up (z).
      const rx = dx * ca - dy * sa;
      const ry = dx * sa + dy * ca;
      // Tilt about screen-x.
      const ryy = ry * ce - dz * se;
      const rzz = ry * se + dz * ce;
      const depth = ryy + distance;
      const scale = focal / Math.max(depth, 0.01);
      return { x: w / 2 + rx * scale, y: h / 2 - rzz * scale, depth, scale };
    };

    // 1) Mesh — faint filled faces, painter-ordered by centroid depth.
    for (const layer of scene.layers) {
      if (layer.kind !== "mesh" || hidden.has(layer.id)) continue;
      const verts = transformPoints(layer.vertices, source(layer, scene, sourceIndex));
      const fresh = sourceFreshness(layer, scene, staleAfterSeconds);
      const faces = layer.faces
        .map((f) => {
          const a = project(verts[f[0]]);
          const b = project(verts[f[1]]);
          const c = project(verts[f[2]]);
          return { a, b, c, depth: (a.depth + b.depth + c.depth) / 3 };
        })
        .filter((f) => f.a.depth > 0 && f.b.depth > 0 && f.c.depth > 0)
        .sort((m, n) => n.depth - m.depth);
      for (const f of faces) {
        ctx.beginPath();
        ctx.moveTo(f.a.x, f.a.y);
        ctx.lineTo(f.b.x, f.b.y);
        ctx.lineTo(f.c.x, f.c.y);
        ctx.closePath();
        ctx.fillStyle = withAlpha(fgMuted, 0.06 * fresh);
        ctx.fill();
        ctx.strokeStyle = withAlpha(fgMuted, 0.2 * fresh);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // 2) Occupancy voxels — projected squares, painter-ordered.
    for (const layer of scene.layers) {
      if (layer.kind !== "occupancy" || hidden.has(layer.id)) continue;
      const idx = layer.sourceId ? (sourceIndex.get(layer.sourceId) ?? 0) : 0;
      const fresh = sourceFreshness(layer, scene, staleAfterSeconds);
      const color = sourceColor(idx, 0.6, 0.55 * fresh);
      const pts = transformPoints(layer.voxels, source(layer, scene, sourceIndex))
        .map(project)
        .filter((p) => p.depth > 0)
        .sort((m, n) => n.depth - m.depth);
      ctx.fillStyle = color;
      for (const p of pts) {
        const size = Math.max(2, layer.voxelSize * p.scale);
        ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      }
    }

    // 3) Points — small dots, painter-ordered, decayed by source freshness.
    for (const layer of scene.layers) {
      if (layer.kind !== "points" || hidden.has(layer.id)) continue;
      const idx = layer.sourceId ? (sourceIndex.get(layer.sourceId) ?? 0) : 0;
      const fresh = sourceFreshness(layer, scene, staleAfterSeconds);
      const pts = transformPoints(layer.points, source(layer, scene, sourceIndex))
        .map((p, i) => ({ ...project(p), intensity: layer.intensity?.[i] ?? 1 }))
        .filter((p) => p.depth > 0)
        .sort((m, n) => n.depth - m.depth);
      for (const p of pts) {
        const a = (0.45 + 0.5 * p.intensity) * fresh;
        ctx.fillStyle = sourceColor(idx, 0.62 + 0.12 * p.intensity, a);
        const r = Math.max(0.8, 1.3 * p.scale * 0.04 + 0.8);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4) AOIs — always on top. Selected gets an Ember ring.
    for (const aoi of scene.aois ?? []) {
      const p = project(aoi.position);
      if (p.depth <= 0) continue;
      const selected = aoi.id === selectedAoiId;
      const tone = aoiColor(canvas, aoi.kind);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 4);
      const s = selected ? 7 : 5;
      ctx.fillStyle = tone;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
      if (selected) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.strokeStyle = EMBER;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    if (dimmed) {
      ctx.fillStyle = readVar(canvas, "--color-bg", "#000").includes("oklch")
        ? withAlpha(readVar(canvas, "--color-bg", "oklch(15% 0 0)"), 0.45)
        : "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, w, h);
    }
  }, [scene, hidden, selectedAoiId, staleAfterSeconds, sourceIndex, dimmed]);

  // Pointer-drag orbit.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onDown = (e: PointerEvent) => {
      dragRef.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const cam = camRef.current;
      cam.azimuth += (e.clientX - d.x) * 0.01;
      cam.elevation = clamp(cam.elevation - (e.clientY - d.y) * 0.01, -0.2, 1.4);
      dragRef.current = { x: e.clientX, y: e.clientY };
      draw();
    };
    const onUp = (e: PointerEvent) => {
      dragRef.current = null;
      canvas.releasePointerCapture(e.pointerId);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };
  }, [draw]);

  // Wheel-to-zoom (non-passive so we can suppress page scroll over the canvas).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = clamp(zoomRef.current * (e.deltaY < 0 ? 1.1 : 0.9), ZOOM_MIN, ZOOM_MAX);
      draw();
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [draw]);

  // Draw on prop change + size change.
  useEffect(() => {
    draw();
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  // Auto-rotate (respects reduced motion + the play/pause toggle).
  useEffect(() => {
    if (!autoRotate || !rotating) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (!dragRef.current) {
        camRef.current.azimuth += ((now - last) / 1000) * 0.25;
        draw();
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate, rotating, draw]);

  const zoomBy = (factor: number) => {
    zoomRef.current = clamp(zoomRef.current * factor, ZOOM_MIN, ZOOM_MAX);
    draw();
  };

  return (
    <>
      <canvas ref={canvasRef} className="h-full w-full cursor-grab touch-none" />
      {showControls && (
        <div className="absolute bottom-2.5 left-2.5 flex flex-col gap-1">
          <CameraButton label="Zoom in" onClick={() => zoomBy(1.2)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </CameraButton>
          <CameraButton label="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </CameraButton>
          {autoRotate && (
            <CameraButton
              label={rotating ? "Pause rotation" : "Resume rotation"}
              onClick={() => setRotating((r) => !r)}
            >
              {rotating ? (
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </CameraButton>
          )}
        </div>
      )}
    </>
  );
}

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 5;

function CameraButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded bg-bg/80 text-fg-muted backdrop-blur-sm transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Geometry + colour helpers.

function source(
  layer: SceneLayer,
  scene: PerceptionScene,
  sourceIndex: Map<string, number>,
): PerceptionSource | undefined {
  if (!layer.sourceId) return undefined;
  const i = sourceIndex.get(layer.sourceId);
  return i === undefined ? undefined : scene.sources[i];
}

function sourceFreshness(layer: SceneLayer, scene: PerceptionScene, staleAfter: number): number {
  const s = layer.sourceId ? scene.sources.find((x) => x.id === layer.sourceId) : undefined;
  return s ? freshness(s.ageSeconds, staleAfter) : 1;
}

function transformPoints(points: Vec3[], src?: PerceptionSource): Vec3[] {
  const t = src?.transform;
  if (!t) return points;
  const [tx, ty, tz] = t.translation;
  const yaw = t.yaw ?? 0;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return points.map(([x, y, z]) => [x * c - y * s + tx, x * s + y * c + ty, z + tz] as Vec3);
}

function sceneBounds(scene: PerceptionScene): { center: Vec3; radius: number } {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  const consider = ([x, y, z]: Vec3) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  };
  for (const layer of scene.layers) {
    if (layer.kind === "points") layer.points.forEach(consider);
    else if (layer.kind === "occupancy") layer.voxels.forEach(consider);
    else layer.vertices.forEach(consider);
  }
  for (const aoi of scene.aois ?? []) consider(aoi.position);
  if (!Number.isFinite(minX)) return { center: [0, 0, 0], radius: 5 };
  const center: Vec3 = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
  const radius = Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2 || 5;
  return { center, radius };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function readVar(el: HTMLElement, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

function withAlpha(color: string, alpha: number): string {
  // oklch(...) -> oklch(... / a); otherwise fall back to globalAlpha-free rgba wrap.
  if (color.startsWith("oklch")) {
    const inner = color
      .slice(color.indexOf("(") + 1, color.lastIndexOf(")"))
      .split("/")[0]
      .trim();
    return `oklch(${inner} / ${alpha})`;
  }
  return color;
}

function aoiColor(el: HTMLElement, kind: AoiKind): string {
  switch (kind) {
    case "hazard":
      return readVar(el, "--prizm-color-danger", "oklch(63% 0.2 25)");
    case "inspect":
      return readVar(el, "--prizm-color-warning", "oklch(75% 0.15 70)");
    case "objective":
      return EMBER;
    default:
      return readVar(el, "--color-fg-muted", "oklch(60% 0 0)");
  }
}
