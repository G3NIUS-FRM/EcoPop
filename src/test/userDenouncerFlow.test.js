import { describe, it, expect, beforeAll } from 'vitest';
import { generateClients } from '../data/generateClients.js';
import { generateClimateEvents } from '../data/generateClimateEvents.js';

// We don't read the real GeoJSON here — vitest can't parse `?json` imports
// reliably and the test only needs enough geometry to drive the alert pipeline.
// We synthesize ~20 tiny municipio features scattered across the DR box.

function fakeMunicipiosGeoJSON(count = 20) {
  const features = [];
  for (let i = 0; i < count; i++) {
    const lng = -72 + (i / count) * 4; // -72 .. -68
    const lat = 17.5 + ((i * 7) % 10) / 10; // 17.5 .. 18.5
    features.push({
      type: 'Feature',
      properties: {
        CODONE_MUN: String(i + 1).padStart(2, '0'),
        CODONE_PRO: String(((i % 10) + 1)).padStart(2, '0'),
        NOMBRE: `Mun-${i}`,
        PROVINCIA: `Prov-${i % 10}`,
        PobTot: 50000 + i * 1000,
      },
      geometry: {
        type: 'Polygon',
        // Tiny square around (lng, lat); CW winding so d3-geo treats it as a
        // real exterior ring (CCW rings become holes in v3).
        coordinates: [[
          [lng - 0.05, lat - 0.05],
          [lng + 0.05, lat - 0.05],
          [lng + 0.05, lat + 0.05],
          [lng - 0.05, lat + 0.05],
          [lng - 0.05, lat - 0.05],
        ]],
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

describe('denouncer pipeline → alerts attribution', () => {
  let clientes;
  let alerts;

  beforeAll(() => {
    const municipios = fakeMunicipiosGeoJSON(20);
    clientes = generateClients(municipios, 200, { denouncerShare: 0.1 });
    alerts = generateClimateEvents(municipios, 50, clientes);
  });

  it('flags a subset of clients as having denounced', () => {
    const denouncers = clientes.filter((c) => c.haDenunciado);
    expect(denouncers.length).toBeGreaterThan(10);
    expect(denouncers.length).toBeLessThan(40);
  });

  it('attaches avatar metadata to every client', () => {
    for (const c of clientes.slice(0, 30)) {
      expect(c.avatarInitials).toBeTruthy();
      expect(c.avatarInitials.length).toBeLessThanOrEqual(2);
      expect(c.avatarColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('generates alerts from denouncers', () => {
    const denouncers = clientes.filter((c) => c.haDenunciado);
    expect(alerts.length).toBeGreaterThanOrEqual(denouncers.length * 0.5);
  });

  it('attaches denouncer metadata to every alert', () => {
    for (const a of alerts) {
      expect(a.denuncianteId).toBeTruthy();
      expect(a.denuncianteNombre).toBeTruthy();
      expect(a.denuncianteIniciales).toBeTruthy();
      expect(a.denuncianteColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('links alert.denuncianteId back to a real client id', () => {
    const ids = new Set(clientes.map((c) => c.id));
    let matched = 0;
    for (const a of alerts) {
      if (ids.has(a.denuncianteId)) matched += 1;
    }
    expect(matched).toBe(alerts.length);
  });

  it('provides an ilustracion URL on every alert', () => {
    for (const a of alerts) {
      expect(a.ilustracion).toMatch(
        /^\/illustrations\/(basura|inundacion|deforestacion)\.svg$/
      );
    }
  });
});
