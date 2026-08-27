import { describe, it, expect } from 'vitest';
import {
  MACRO_TO_PROVINCES,
  findMacroregionForProvince,
  SEVERITY_WEIGHTS,
  SEVERITY_COLOR,
  EVENT_COLOR_SCALE,
  eventWeightScore,
  colorForScore,
  CLIMATE_RADIUS_METERS,
  NOTABLE_PLACES,
  VOCATIONS,
  CLIMATE_TYPES,
  SEVERITIES,
} from '../lib/territoryLookup.js';

describe('territoryLookup — MACRO_TO_PROVINCES', () => {
  it('contains the 10 official macroregions', () => {
    expect(Object.keys(MACRO_TO_PROVINCES)).toHaveLength(10);
    expect(MACRO_TO_PROVINCES).toHaveProperty('DO33');
    expect(MACRO_TO_PROVINCES).toHaveProperty('DO42');
  });

  it('every province code is a 2-digit string', () => {
    for (const codes of Object.values(MACRO_TO_PROVINCES)) {
      for (const c of codes) {
        expect(c).toMatch(/^\d{2}$/);
      }
    }
  });

  it('findMacroregionForProvince("13") returns DO36 (Cibao Sur)', () => {
    expect(findMacroregionForProvince('13')).toBe('DO36');
  });

  it('findMacroregionForProvince pads single-digit codes', () => {
    expect(findMacroregionForProvince('6')).toBe('DO33');
    expect(findMacroregionForProvince(6)).toBe('DO33');
  });

  it('findMacroregionForProvince returns null for unknown codes', () => {
    expect(findMacroregionForProvince('99')).toBeNull();
    expect(findMacroregionForProvince(null)).toBeNull();
    expect(findMacroregionForProvince('')).toBeNull();
  });
});

describe('territoryLookup — event weighting', () => {
  it('eventWeightScore sums SEVERITY_WEIGHTS', () => {
    const events = [
      { severidad: 'Baja' },
      { severidad: 'Media' },
      { severidad: 'Alta' },
      { severidad: 'Crítica' },
    ];
    expect(eventWeightScore(events)).toBe(1 + 2 + 3 + 4);
  });

  it('eventWeightScore is 0 for empty/null', () => {
    expect(eventWeightScore([])).toBe(0);
    expect(eventWeightScore(null)).toBe(0);
    expect(eventWeightScore(undefined)).toBe(0);
  });

  it('eventWeightScore falls back to 1 for unknown severities', () => {
    expect(eventWeightScore([{ severidad: 'Imaginary' }])).toBe(1);
  });

  it('SEVERITY_WEIGHTS covers the 4 documented severities', () => {
    expect(Object.keys(SEVERITY_WEIGHTS).sort()).toEqual(
      ['Alta', 'Baja', 'Critica', 'Crítica', 'Media'].sort()
    );
  });
});

describe('territoryLookup — colorForScore buckets', () => {
  it('returns 0-event grey for score 0', () => {
    expect(colorForScore(0)).toBe(EVENT_COLOR_SCALE[0].color);
  });

  it('clamps into the top bucket for very large scores', () => {
    const top = EVENT_COLOR_SCALE[EVENT_COLOR_SCALE.length - 1].color;
    expect(colorForScore(1e6)).toBe(top);
    expect(colorForScore(100)).toBe(top);
  });

  it('returns monotonically hotter colors as score grows', () => {
    const c0 = colorForScore(0);
    const c3 = colorForScore(3);
    const c8 = colorForScore(8);
    const c16 = colorForScore(16);
    expect(c0).not.toBe(c3);
    expect(c3).not.toBe(c8);
    expect(c8).not.toBe(c16);
  });
});

describe('territoryLookup — SEVERITY_COLOR', () => {
  it('has an entry for every documented severity', () => {
    for (const s of SEVERITIES) {
      expect(SEVERITY_COLOR[s]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('territoryLookup — constants sanity', () => {
  it('CLIMATE_RADIUS_METERS is exactly 5km', () => {
    expect(CLIMATE_RADIUS_METERS).toBe(5000);
  });

  it('NOTABLE_PLACES has enough seed points to scatter events', () => {
    expect(NOTABLE_PLACES.length).toBeGreaterThanOrEqual(40);
    for (const p of NOTABLE_PLACES) {
      expect(p.name).toBeTruthy();
      expect(p.provCode).toMatch(/^\d{2}$/);
    }
  });

  it('VOCATIONS / CLIMATE_TYPES / SEVERITIES non-empty', () => {
    expect(VOCATIONS.length).toBeGreaterThan(5);
    expect(CLIMATE_TYPES.length).toBeGreaterThan(0);
    expect(SEVERITIES.length).toBe(4);
  });
});
