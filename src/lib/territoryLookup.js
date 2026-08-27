// Static mapping of macroregion -> list of province codes (CODONE_PRO / PROV_COD)
// Based on official Dominican Republic macroregion grouping.
export const MACRO_TO_PROVINCES = {
  DO33: ['06', '15', '14', '20'], // Cibao Nordeste
  DO34: ['04', '08', '26', '27'], // Cibao Noroeste
  DO35: ['09', '18', '25'],       // Cibao Norte
  DO36: ['13', '21', '24'],       // Cibao Sur
  DO37: ['02', '07', '22'],       // El Valle
  DO38: ['03', '04', '10', '16'], // Enriquillo
  DO39: ['11', '23', '29'],       // Higuamo
  DO40: ['01', '28', '30'],       // Ozama
  DO41: ['17', '19', '31'],       // Valdesia
  DO42: ['05', '12', '26'],       // Yuma
};

export function findMacroregionForProvince(provCode) {
  if (!provCode) return null;
  const code = String(provCode).padStart(2, '0');
  for (const [macroId, codes] of Object.entries(MACRO_TO_PROVINCES)) {
    if (codes.includes(code)) return macroId;
  }
  return null;
}

export const DR_CENTER = [18.7, -70.16];
export const DEFAULT_ZOOM = 8;

// Climate event markers: 5km radius (meters) for circles on the map.
export const CLIMATE_RADIUS_METERS = 5000;

export const SEVERITY_WEIGHTS = { Baja: 1, Media: 2, Alta: 3, Critica: 4, 'Crítica': 4 };

// Color scale tuned for the soft theme (light gray → yellow → red)
export const EVENT_COLOR_SCALE = [
  { max: 0, color: '#f1f5f9', label: '0 alertas' },
  { max: 3, color: '#fde68a', label: '1 - 3 alertas' },
  { max: 8, color: '#fdba74', label: '4 - 8 alertas' },
  { max: 15, color: '#f87171', label: '9 - 15 alertas' },
  { max: Infinity, color: '#dc2626', label: '> 15 alertas' },
];

export function eventWeightScore(events) {
  if (!events || events.length === 0) return 0;
  return events.reduce((acc, e) => acc + (SEVERITY_WEIGHTS[e.severidad] || 1), 0);
}

export function colorForScore(score) {
  for (const bucket of EVENT_COLOR_SCALE) {
    if (score <= bucket.max) return bucket.color;
  }
  return EVENT_COLOR_SCALE[EVENT_COLOR_SCALE.length - 1].color;
}

// Severity -> heatmap color (used as radial-gradient fill on each alert circle).
export const HEAT_COLORS = {
  Baja:     '#facc15',  // yellow
  Media:    '#f97316',  // orange
  Alta:     '#ef4444',  // red
  Crítica:  '#b91c1c',  // dark red
};

// Heatmap circle radius (in pixels at default zoom) per severity.
// Bigger circles = more area covered = looks "hotter".
export const HEAT_RADIUS = {
  Baja:     50,
  Media:    70,
  Alta:     90,
  Crítica: 110,
};

// Back-compat alias used by some cards.
export const SEVERITY_COLOR = HEAT_COLORS;

export const VOCATIONS = [
  'Agricultor',
  'Comerciante',
  'Estudiante',
  'Profesional',
  'Obrero',
  'Emprendedor',
  'Docente',
  'Técnico',
  'Desempleado',
  'Pensionado',
];

// Alert categories — environmental issues plotted as heatmap points.
export const ALERT_TYPES = ['Exceso de basura', 'Inundación', 'Deforestación'];
export const SEVERITIES = ['Baja', 'Media', 'Alta', 'Crítica'];
// Back-compat alias (legacy code still references CLIMATE_TYPES).
export const CLIMATE_TYPES = ALERT_TYPES;

// Famous / well-known geographic points used to give climate events
// a realistic "zona específica" feel (sector name + general direction).
// Coordinates are approximate centroids used as hints; the final position
// is the municipality centroid + jitter so it stays inside the polygon.
export const NOTABLE_PLACES = [
  { name: 'Salto de Jima', provCode: '13' },
  { name: 'Pico Duarte', provCode: '13' },
  { name: 'Lago Enriquillo', provCode: '10' },
  { name: 'Bahía de Samaná', provCode: '20' },
  { name: 'Playa Bávaro', provCode: '12' },
  { name: 'Río Yaque del Norte', provCode: '25' },
  { name: 'Cabo Engaño', provCode: '12' },
  { name: 'Constanza', provCode: '13' },
  { name: 'Jarabacoa', provCode: '13' },
  { name: 'Las Terrenas', provCode: '20' },
  { name: 'Cayo Levantado', provCode: '20' },
  { name: 'Presa de Hatillo', provCode: '21' },
  { name: 'Río Yaque del Sur', provCode: '02' },
  { name: 'Los Haitises', provCode: '20' },
  { name: 'Playa Rincón', provCode: '16' },
  { name: 'Santo Domingo Este', provCode: '28' },
  { name: 'Santiago Centro', provCode: '25' },
  { name: 'Puerto Plata Malecón', provCode: '18' },
  { name: 'Zona Colonial', provCode: '01' },
  { name: 'Cabo Cabrón', provCode: '20' },
  { name: 'Parque Nacional Bermúdez', provCode: '22' },
  { name: 'Río Ozama', provCode: '01' },
  { name: 'Boca Chica', provCode: '28' },
  { name: 'Juan Dolio', provCode: '29' },
  { name: 'Isla Saona', provCode: '12' },
  { name: 'Higüey', provCode: '12' },
  { name: 'Moca', provCode: '09' },
  { name: 'Salcedo', provCode: '06' },
  { name: 'Cotuí', provCode: '24' },
  { name: 'Bonao', provCode: '21' },
  { name: 'San Cristóbal Centro', provCode: '17' },
  { name: 'Azua Centro', provCode: '02' },
  { name: 'Barahona Malecón', provCode: '03' },
  { name: 'Pedernales', provCode: '16' },
  { name: 'Dajabón', provCode: '04' },
  { name: 'Monte Cristi', provCode: '08' },
  { name: 'Loma de Cabrera', provCode: '04' },
  { name: 'San Juan de la Maguana', provCode: '22' },
  { name: 'Elías Piña Centro', provCode: '07' },
  { name: 'Hato Mayor', provCode: '11' },
  { name: 'El Seibo', provCode: '05' },
  { name: 'La Romana', provCode: '12' },
  { name: 'San Pedro de Macorís', provCode: '29' },
  { name: 'Monte Plata', provCode: '23' },
  { name: 'Bayaguana', provCode: '23' },
  { name: 'Sabana de la Mar', provCode: '11' },
  { name: 'Miches', provCode: '05' },
  { name: 'Laguna de Oviedo', provCode: '16' },
  { name: 'Playa Macao', provCode: '12' },
  { name: 'Sosúa', provCode: '18' },
  { name: 'Cabarete', provCode: '18' },
  { name: 'Río Artibonito', provCode: '07' },
];