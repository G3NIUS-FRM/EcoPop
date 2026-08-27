import { describe, it, expect } from 'vitest';
import { buildSuggestions, groupByCategory } from '../lib/aiSuggestions.js';

describe('buildSuggestions', () => {
  it('returns an empty array when there are no clients and no events', () => {
    const s = buildSuggestions({ clients: [], events: [], territoryName: 'RD' });
    expect(s).toEqual([]);
  });

  it('suggests green loans when floods + high-income clients are present', () => {
    const clients = Array.from({ length: 8 }, (_, i) => ({
      id: `c-${i}`,
      nombre: 'X',
      ingresoMensual: 80000,
      gastoMensual: 50000,
      vocacion: 'Comerciante',
      edad: 30,
      tieneSeguro: true,
    }));
    const events = Array.from({ length: 5 }, (_, i) => ({
      id: `e-${i}`,
      tipo: 'Inundación',
      severidad: i % 2 === 0 ? 'Alta' : 'Crítica',
      fecha: '2025-01-01',
      poblacionAfectada: 1000,
      provincia: 'Santo Domingo',
      municipioAfectado: 'SD',
      codigoProvincia: '01',
      codigoMunicipio: '01',
      lugar: 'Sector',
      lat: 18.5,
      lng: -69.9,
      duracionDias: 10,
      descripcion: 'Inundación en la zona',
    }));
    const s = buildSuggestions({ clients, events, territoryName: 'Santo Domingo' });
    expect(s.length).toBeGreaterThan(0);
    const floodSuggestion = s.find((x) => x.id === 'green-loans-flood');
    expect(floodSuggestion).toBeTruthy();
    expect(floodSuggestion.category).toBe('Préstamo Verde');
    expect(floodSuggestion.priority).toBeGreaterThanOrEqual(4); // Alta or Critical
  });

  it('suggests reforestation credit when deforestation alerts exist', () => {
    const events = [
      { id: 'e1', tipo: 'Deforestación', severidad: 'Media', fecha: '2025-01-01', provincia: 'X', municipioAfectado: 'Y', codigoProvincia: '01', codigoMunicipio: '01', lugar: 'L', lat: 18.5, lng: -69.9, poblacionAfectada: 100, duracionDias: 200, descripcion: 'd' },
    ];
    const s = buildSuggestions({ clients: [], events, territoryName: 'X' });
    expect(s.find((x) => x.id === 'reforestation-credit')).toBeTruthy();
  });

  it('suggests insurance upsell when alerts >= 5 and insurance share < 50%', () => {
    const clients = Array.from({ length: 20 }, (_, i) => ({
      id: `c-${i}`,
      ingresoMensual: 30000,
      gastoMensual: 20000,
      vocacion: 'Agricultor',
      edad: 40,
      tieneSeguro: false,
    }));
    const events = Array.from({ length: 6 }, (_, i) => ({
      id: `e-${i}`,
      tipo: 'Inundación',
      severidad: 'Baja',
      fecha: '2025-01-01',
      provincia: 'X',
      municipioAfectado: 'Y',
      codigoProvincia: '01',
      codigoMunicipio: '01',
      lugar: 'L',
      lat: 18.5,
      lng: -69.9,
      poblacionAfectada: 50,
      duracionDias: 5,
      descripcion: 'd',
    }));
    const s = buildSuggestions({ clients, events, territoryName: 'X' });
    expect(s.find((x) => x.id === 'insurance-upsell')).toBeTruthy();
  });

  it('suggests payment holiday for critical-severity territories', () => {
    const clients = Array.from({ length: 12 }, (_, i) => ({
      id: `c-${i}`,
      ingresoMensual: 30000,
      gastoMensual: 20000,
      vocacion: 'Agricultor',
      edad: 40,
      tieneSeguro: false,
    }));
    const events = Array.from({ length: 3 }, (_, i) => ({
      id: `e-${i}`,
      tipo: 'Inundación',
      severidad: 'Crítica',
      fecha: '2025-01-01',
      provincia: 'X',
      municipioAfectado: 'Y',
      codigoProvincia: '01',
      codigoMunicipio: '01',
      lugar: 'L',
      lat: 18.5,
      lng: -69.9,
      poblacionAfectada: 1000,
      duracionDias: 5,
      descripcion: 'd',
    }));
    const s = buildSuggestions({ clients, events, territoryName: 'X' });
    const hol = s.find((x) => x.id === 'payment-holiday');
    expect(hol).toBeTruthy();
    expect(hol.priority).toBe(5); // CRITICAL
  });

  it('sorts suggestions by priority desc then confidence desc', () => {
    const clients = Array.from({ length: 20 }, (_, i) => ({
      id: `c-${i}`, ingresoMensual: 80000, gastoMensual: 50000, vocacion: 'Comerciante', edad: 30, tieneSeguro: true,
    }));
    const events = Array.from({ length: 10 }, (_, i) => ({
      id: `e-${i}`,
      tipo: i % 2 ? 'Inundación' : 'Deforestación',
      severidad: i < 4 ? 'Crítica' : 'Media',
      fecha: '2025-01-01',
      provincia: 'X',
      municipioAfectado: 'Y',
      codigoProvincia: '01',
      codigoMunicipio: '01',
      lugar: 'L',
      lat: 18.5,
      lng: -69.9,
      poblacionAfectada: 1000,
      duracionDias: 10,
      descripcion: 'd',
    }));
    const s = buildSuggestions({ clients, events, territoryName: 'X' });
    for (let i = 1; i < s.length; i++) {
      expect(s[i - 1].priority).toBeGreaterThanOrEqual(s[i].priority);
    }
  });
});

describe('groupByCategory', () => {
  it('groups suggestions by category preserving order', () => {
    const s = [
      { id: 'a', category: 'X', priority: 3, confidence: 0.5 },
      { id: 'b', category: 'Y', priority: 5, confidence: 0.9 },
      { id: 'c', category: 'X', priority: 4, confidence: 0.7 },
    ];
    const groups = groupByCategory(s);
    expect(groups.length).toBe(2);
    expect(groups[0].category).toBe('X');
    expect(groups[0].items.length).toBe(2);
    expect(groups[1].category).toBe('Y');
    expect(groups[1].items.length).toBe(1);
  });
});