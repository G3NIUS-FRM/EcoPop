import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { ALERT_TYPES, NOTABLE_PLACES } from '../lib/territoryLookup.js';

const SEVERITY_WEIGHTS = [
  { value: 'Baja', p: 0.4 },
  { value: 'Media', p: 0.3 },
  { value: 'Alta', p: 0.2 },
  { value: 'Crítica', p: 0.1 },
];

function pickSeverity() {
  const r = Math.random();
  let cum = 0;
  for (const s of SEVERITY_WEIGHTS) {
    cum += s.p;
    if (r <= cum) return s.value;
  }
  return 'Baja';
}

// Duration (days) range per alert type — purely informational for the table.
const DURACION_BY_TYPE = {
  'Exceso de basura': [30, 365],
  'Inundación': [1, 14],
  'Deforestación': [90, 730],
};

const DESCRIPCIONES = {
  'Exceso de basura': [
    'Acumulación de residuos sólidos en vertedero informal afecta comunidad cercana.',
    'Vertedero colapsado con presencia de desechos plásticos y orgánicos sin tratamiento.',
    'Microbasurales en orillas de carretera generan riesgo sanitario para vecinos.',
  ],
  'Inundación': [
    'Ríos desbordados afectan comunidades agrícolas y caminos vecinales.',
    'Acumulación de agua en zonas urbanas de baja elevación.',
    'Inundaciones repentinas por lluvias intensas en cuencas altas.',
  ],
  'Deforestación': [
    'Tala ilegal de árboles en zona boscosa protegida.',
    'Avance de frontera agrícola elimina cobertura arbórea nativa.',
    'Quema y desmonte de terreno forestal sin autorización.',
  ],
};

// Compute the centroid of a Polygon or MultiPolygon GeoJSON feature.
// Returns { lat, lng } or null if geometry is malformed.
function getCentroid(feature) {
  const g = feature?.geometry;
  if (!g) return null;
  let ring;
  if (g.type === 'Polygon') {
    ring = g.coordinates[0];
  } else if (g.type === 'MultiPolygon') {
    let best = g.coordinates[0][0];
    let bestLen = best.length;
    for (const poly of g.coordinates) {
      if (poly[0].length > bestLen) {
        best = poly[0];
        bestLen = poly[0].length;
      }
    }
    ring = best;
  } else {
    return null;
  }
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of ring) {
    sumLng += lng;
    sumLat += lat;
  }
  return { lat: sumLat / ring.length, lng: sumLng / ring.length };
}

// Generate environmental alerts at GEO coordinates (one per alert, jittered within
// the picked municipality). Heatmap rendering reads `lat`/`lng` directly — no
// aggregation to province is done at this layer.
export function generateClimateEvents(municipiosGeoJSON, count = 120) {
  return generateAlerts(municipiosGeoJSON, count);
}

export function generateAlerts(municipiosGeoJSON, count = 120) {
  const features = municipiosGeoJSON?.features || [];
  if (!features.length) return [];

  const targetCount = Math.max(80, Math.min(150, count));
  const result = [];

  for (let i = 0; i < targetCount; i++) {
    const feature = features[Math.floor(Math.random() * features.length)];
    const props = feature.properties || {};
    const centro = getCentroid(feature);
    if (!centro) continue;

    const tipo = ALERT_TYPES[Math.floor(Math.random() * ALERT_TYPES.length)];
    const severidad = pickSeverity();
    const [dMin, dMax] = DURACION_BY_TYPE[tipo];
    const duracionDias = dMin + Math.floor(Math.random() * (dMax - dMin + 1));
    const basePob = Number(props.PobTot || 1000);
    const sevMul = severidad === 'Crítica' ? 4 : severidad === 'Alta' ? 2.5 : severidad === 'Media' ? 1.5 : 1;
    const poblacionAfectada = Math.min(
      Math.floor(basePob * 0.6),
      Math.floor(100 + Math.random() * 50000 * sevMul)
    );

    // Coordinates: start from centroid and jitter by ~3-7 km so the point
    // stays inside the municipality but doesn't sit exactly on the centroid.
    const jitterLat = (Math.random() - 0.5) * 0.08;
    const jitterLng = (Math.random() - 0.5) * 0.08;
    const lat = centro.lat + jitterLat;
    const lng = centro.lng + jitterLng;

    // Specific location name: 55% chance to use a notable place in the same
    // province, otherwise synthesize a sector/zone name.
    let lugar;
    const provCode = String(props.CODONE_PRO || '').padStart(2, '0');
    const notables = NOTABLE_PLACES.filter((p) => p.provCode === provCode);
    if (notables.length && Math.random() < 0.55) {
      lugar = notables[Math.floor(Math.random() * notables.length)].name;
    } else {
      const sectores = [
        'Sector Centro',
        'Barrio Los Ríos',
        'Zona Rural Norte',
        'Zona Rural Sur',
        'Sector Industrial',
        'Ensanche Mirador',
        'Sector Pueblo Nuevo',
        'Villa Olímpica',
        'Los Alcarrizos',
        'Batey Central',
      ];
      lugar = `${props.NOMBRE} - ${sectores[Math.floor(Math.random() * sectores.length)]}`;
    }

    result.push({
      id: uuidv4(),
      tipo,
      severidad,
      fecha: faker.date.between({ from: '2024-09-01', to: '2026-08-25' }).toISOString(),
      municipioAfectado: props.NOMBRE || 'Desconocido',
      provincia: props.PROVINCIA || 'Desconocida',
      codigoMunicipio: String(props.CODONE_MUN || '').padStart(2, '0'),
      codigoProvincia: String(props.CODONE_PRO || '').padStart(2, '0'),
      poblacionAfectada,
      duracionDias,
      lugar,
      lat,
      lng,
      descripcion: DESCRIPCIONES[tipo][Math.floor(Math.random() * DESCRIPCIONES[tipo].length)],
    });
  }
  return result;
}
