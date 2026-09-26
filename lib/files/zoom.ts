/**
 * Pinch-zoom maths for the full-screen image viewer.
 *
 * The image is first fitted inside the viewer ("contain"). A View then scales
 * it about the viewer's centre and moves it by (x, y) pixels. Points are
 * measured from the viewer's centre.
 */
export type Size = { width: number; height: number };
export type Point = { x: number; y: number };
export type View = { scale: number; x: number; y: number };

export const MIN_SCALE = 1;
export const MAX_SCALE = 8;
export const DOUBLE_TAP_SCALE = 2.5;

export const IDENTITY_VIEW: View = { scale: 1, x: 0, y: 0 };

export function containSize(natural: Size, box: Size): Size {
  if (natural.width <= 0 || natural.height <= 0) return { width: box.width, height: box.height };
  const scale = Math.min(box.width / natural.width, box.height / natural.height);
  return { width: Math.round(natural.width * scale), height: Math.round(natural.height * scale) };
}

function clampAxis(offset: number, contentLength: number, boxLength: number): number {
  const slack = (contentLength - boxLength) / 2;
  if (slack <= 0) return 0;
  return Math.min(slack, Math.max(-slack, offset));
}

/** Keeps the scale in range and the image covering as much of the viewer as it can. */
export function clampView(view: View, box: Size, content: Size): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale));
  // `|| 0` turns -0 into 0 so views compare equal.
  return {
    scale,
    x: clampAxis(view.x, content.width * scale, box.width) || 0,
    y: clampAxis(view.y, content.height * scale, box.height) || 0,
  };
}

/** Scale by `factor` while the point `at` stays under the fingers. */
export function zoomAround(view: View, factor: number, at: Point, box: Size, content: Size): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor));
  const ratio = scale / view.scale;
  return clampView(
    { scale, x: at.x - (at.x - view.x) * ratio, y: at.y - (at.y - view.y) * ratio },
    box,
    content,
  );
}

/** Double tap: zoom in on that spot, or back out if already zoomed. */
export function doubleTapView(view: View, at: Point, box: Size, content: Size): View {
  if (view.scale > MIN_SCALE) return IDENTITY_VIEW;
  return zoomAround(view, DOUBLE_TAP_SCALE, at, box, content);
}
