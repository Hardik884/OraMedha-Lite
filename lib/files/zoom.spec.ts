import { describe, expect, it } from "vitest";
import { MAX_SCALE, clampView, containSize, doubleTapView, zoomAround, type View } from "./zoom";

const box = { width: 400, height: 800 };
const content = { width: 400, height: 300 }; // image fitted to the box at scale 1
const IDENTITY: View = { scale: 1, x: 0, y: 0 };

describe("containSize", () => {
  it("fits an image inside the box, keeping its shape", () => {
    expect(containSize({ width: 4000, height: 3000 }, box)).toEqual({ width: 400, height: 300 });
    expect(containSize({ width: 1000, height: 4000 }, box)).toEqual({ width: 200, height: 800 });
  });
});

describe("clampView", () => {
  it("keeps the scale between 1 and the maximum", () => {
    expect(clampView({ scale: 0.5, x: 10, y: 10 }, box, content)).toEqual(IDENTITY);
    expect(clampView({ scale: 50, x: 0, y: 0 }, box, content).scale).toBe(MAX_SCALE);
  });

  it("centres an axis that fits inside the box", () => {
    // At 2x the image is 800x600: wider than the box, still shorter than it.
    expect(clampView({ scale: 2, x: 0, y: 150 }, box, content)).toEqual({ scale: 2, x: 0, y: 0 });
  });

  it("stops panning at the image's edge", () => {
    // 800 wide in a 400 box → can move at most 200 either way.
    expect(clampView({ scale: 2, x: 500, y: 0 }, box, content).x).toBe(200);
    expect(clampView({ scale: 2, x: -500, y: 0 }, box, content).x).toBe(-200);
  });
});

describe("zoomAround", () => {
  it("keeps the point under the fingers still", () => {
    // Zoom 2x around a point 100px right of centre: that point moves back to where it was.
    const v = zoomAround(IDENTITY, 2, { x: 100, y: 0 }, box, content);
    expect(v.scale).toBe(2);
    expect(v.x).toBe(-100);
  });

  it("clamps the result", () => {
    expect(zoomAround(IDENTITY, 0.5, { x: 0, y: 0 }, box, content)).toEqual(IDENTITY);
  });
});

describe("doubleTapView", () => {
  it("zooms in on the tapped point, and back out", () => {
    const zoomed = doubleTapView(IDENTITY, { x: 50, y: 0 }, box, content);
    expect(zoomed.scale).toBeGreaterThan(1);
    expect(doubleTapView(zoomed, { x: 0, y: 0 }, box, content)).toEqual(IDENTITY);
  });
});
