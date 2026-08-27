import { describe, it, expect } from 'vitest';
import { featureInViewport } from '../components/MapView.jsx';

const size = { width: 800, height: 600 };
const view = { x: 0, y: 0, k: 1 };

describe('featureInViewport — viewport culling helper', () => {
  it('returns false for invalid bbox (NaN/Infinity)', () => {
    expect(featureInViewport([[NaN, 0], [1, 1]], view, size)).toBe(false);
    expect(featureInViewport(null, view, size)).toBe(false);
  });

  it('returns true when the feature is fully inside', () => {
    const bbox = [[100, 100], [200, 200]];
    expect(featureInViewport(bbox, view, size)).toBe(true);
  });

  it('returns false when the feature is fully outside (top-left)', () => {
    const bbox = [[-1000, -1000], [-500, -500]];
    expect(featureInViewport(bbox, view, size)).toBe(false);
  });

  it('returns false when the feature is fully outside (bottom-right)', () => {
    const bbox = [[1000, 1000], [1500, 1500]];
    expect(featureInViewport(bbox, view, size)).toBe(false);
  });

  it('returns true when the feature straddles the right edge', () => {
    // bbox extends 50px past the right edge — still visible
    const bbox = [[750, 200], [850, 400]];
    expect(featureInViewport(bbox, view, size)).toBe(true);
  });

  it('returns true when the feature is mostly off-screen but panned into view', () => {
    // bbox lives at x=-500 in projection space; panning right by 700 puts it on screen
    const bbox = [[-500, 200], [-300, 400]];
    const panned = { x: 700, y: 0, k: 1 };
    expect(featureInViewport(bbox, panned, size)).toBe(true);
  });

  it('respects the zoom factor (k)', () => {
    // feature lives at projection x=[1500,1700]; with k=0.5 it's on screen,
    // with k=1 it is way off-screen on the right.
    const bbox = [[1500, 100], [1700, 200]];
    expect(featureInViewport(bbox, { x: 0, y: 0, k: 0.5 }, size)).toBe(true);
    expect(featureInViewport(bbox, { x: 0, y: 0, k: 1 }, size)).toBe(false);
  });

  it('uses a 20px margin so partially-visible features still render', () => {
    // Feature spans [780..810]: part is on-screen (780..800), part is in the
    // 20px margin (800..810) -> still rendered so it fades in smoothly.
    const justInsideMargin = [[780, 200], [810, 400]];
    expect(featureInViewport(justInsideMargin, view, size)).toBe(true);
    // Feature starts 30px past the right edge (beyond margin) -> culled.
    const justOutsideMargin = [[830, 200], [900, 400]];
    expect(featureInViewport(justOutsideMargin, view, size)).toBe(false);
  });
});
