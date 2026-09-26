"use client";

import { useEffect, useRef, useState } from "react";
import {
  IDENTITY_VIEW,
  clampView,
  containSize,
  doubleTapView,
  zoomAround,
  type Point,
  type Size,
  type View,
} from "@/lib/files/zoom";

type Gesture =
  | { kind: "pinch"; startDist: number; startMid: Point; startView: View }
  | { kind: "pan"; start: Point; startView: View; moved: boolean };

const DOUBLE_TAP_MS = 300;

/**
 * A full-screen image with pinch-zoom, drag to move around when zoomed, and
 * double-tap to zoom in/out (mouse wheel on a laptop). The page's own
 * pinch-zoom is left alone everywhere else.
 */
export function ZoomableImage({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Size>({ width: 0, height: 0 });
  const [natural, setNatural] = useState<Size | null>(null);
  const [view, setView] = useState<View>(IDENTITY_VIEW);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef<{ at: number; point: Point } | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A new image starts un-zoomed.
  useEffect(() => {
    setView(IDENTITY_VIEW);
    setNatural(null);
  }, [src]);

  const content = natural ? containSize(natural, box) : { width: 0, height: 0 };

  function local(e: { clientX: number; clientY: number }): Point {
    const r = boxRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  }

  function startGesture() {
    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      const [a, b] = pts as [Point, Point];
      gesture.current = {
        kind: "pinch",
        startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        startView: view,
      };
    } else if (pts.length === 1) {
      gesture.current = { kind: "pan", start: pts[0]!, startView: view, moved: false };
    } else {
      gesture.current = null;
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is a nicety (keeps a drag going past the edge), never required.
    }
    pointers.current.set(e.pointerId, local(e));
    startGesture();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, local(e));
    const g = gesture.current;
    if (!g || !natural) return;
    const pts = [...pointers.current.values()];
    if (g.kind === "pinch" && pts.length >= 2) {
      const [a, b] = pts as [Point, Point];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const zoomed = zoomAround(g.startView, dist / g.startDist, g.startMid, box, content);
      setView(clampView({ ...zoomed, x: zoomed.x + mid.x - g.startMid.x, y: zoomed.y + mid.y - g.startMid.y }, box, content));
    } else if (g.kind === "pan" && pts.length === 1) {
      const p = pts[0]!;
      const dx = p.x - g.start.x;
      const dy = p.y - g.start.y;
      if (Math.hypot(dx, dy) > 6) g.moved = true;
      if (g.startView.scale > 1) {
        setView(clampView({ ...g.startView, x: g.startView.x + dx, y: g.startView.y + dy }, box, content));
      }
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const g = gesture.current;
    const point = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (g?.kind === "pan" && !g.moved && point && natural) {
      const now = Date.now();
      const prev = lastTap.current;
      if (prev && now - prev.at < DOUBLE_TAP_MS && Math.hypot(point.x - prev.point.x, point.y - prev.point.y) < 30) {
        setView((v) => doubleTapView(v, point, box, content));
        lastTap.current = null;
      } else {
        lastTap.current = { at: now, point };
      }
    }
    startGesture();
  }

  function onWheel(e: React.WheelEvent) {
    if (!natural) return;
    setView((v) => zoomAround(v, Math.exp(-e.deltaY * 0.002), local(e), box, content));
  }

  return (
    <div
      ref={boxRef}
      className="relative flex h-full w-full touch-none select-none items-center justify-center overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived signed link, not optimisable */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        onLoad={(e) => setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
        onError={onError}
        className="max-w-none will-change-transform"
        style={
          natural
            ? {
                width: content.width,
                height: content.height,
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              }
            : { maxWidth: "100%", maxHeight: "100%" }
        }
      />
    </div>
  );
}
