import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { VOCATIONS, findMacroregionForProvince } from '../lib/territoryLookup.js';

// Avatar lookup table — small, deterministic, public-domain silhouettes
// grouped by gender so we can render a consistent portrait without an
// external avatar service. Indexed in pairs (M, F) so we can pick by gender.
const AVATAR_SVG = (seed, hue) => {
  // Deterministic pseudo-hash from the seed for the initials color.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const initials = seed.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#5BBC9A', '#A5CC3F', '#4FB8A2', '#facc15', '#fb923c', '#f87171', '#a78bfa', '#60a5fa'];
  const bg = colors[h % colors.length];
  return { initials, bg };
};

// Generate N clients distributed across municipios weighted by population.
// `denouncerShare` controls what fraction of clients get `haDenunciado: true`
// — only those will surface as alert sources for the user-page.
export function generateClients(municipiosGeoJSON, total = 1500, { denouncerShare = 0.08 } = {}) {
  const features = municipiosGeoJSON?.features || [];
  if (!features.length) return [];

  // Build municipality list with weights (PobTot)
  const validMunicipios = features
    .map((f) => {
      const p = f.properties || {};
      const pob = Number(p.PobTot || 0);
      return {
        codigoMunicipio: String(p.CODONE_MUN || '').padStart(2, '0'),
        nombreMunicipio: p.NOMBRE || '',
        provincia: p.PROVINCIA || '',
        codigoProvincia: String(p.CODONE_PRO || '').padStart(2, '0'),
        pobTot: pob,
      };
    })
    .filter((m) => m.pobTot > 0 && m.codigoMunicipio);

  const totalPob = validMunicipios.reduce((acc, m) => acc + m.pobTot, 0);

  // Distribute clients with +/- 30% jitter to avoid totally rigid mapping
  const result = [];
  for (const m of validMunicipios) {
    const baseShare = m.pobTot / totalPob;
    const jitter = 0.7 + Math.random() * 0.6; // 0.7 .. 1.3
    const target = Math.max(0, Math.round(baseShare * total * jitter));
    for (let i = 0; i < target; i++) {
      result.push(buildClient(m));
    }
  }

  // Pad or trim to reach exactly `total`
  if (result.length < total) {
    while (result.length < total) {
      const m = validMunicipios[Math.floor(Math.random() * validMunicipios.length)];
      result.push(buildClient(m));
    }
  } else if (result.length > total) {
    result.length = total;
  }

  // Mark a subset as having denounced. We assign `denouncerShare` (default 8%)
  // of clients so that the resulting event pool (~120) is plausible: a single
  // denouncer typically has one active report. `denouncerIndex` is later used
  // by the alert generator to pair events with their source client.
  result.forEach((c, idx) => {
    c.haDenunciado = Math.random() < denouncerShare;
    if (c.haDenunciado) c.denouncerIndex = idx;
  });

  return result;
}

function buildClient(m) {
  const genero = Math.random() < 0.5 ? 'M' : 'F';
  const vocacion = VOCATIONS[Math.floor(Math.random() * VOCATIONS.length)];
  const ingresoMensual = 8000 + Math.floor(Math.random() * 142000);
  // Monthly spend tracks income: typical savings rate 8–35%, expenses 65–92%.
  const savingsRate = 0.08 + Math.random() * 0.27;
  const gastoMensual = Math.round(ingresoMensual * (1 - savingsRate));
  const nombre = faker.person.fullName({ sex: genero === 'F' ? 'female' : 'male' });
  const avatar = AVATAR_SVG(nombre, 0);
  return {
    id: uuidv4(),
    nombre,
    edad: 18 + Math.floor(Math.random() * 68),
    genero,
    vocacion,
    ingresoMensual,
    gastoMensual,
    territorioCodigo: m.codigoMunicipio,
    territorioNombre: m.nombreMunicipio,
    provincia: m.provincia,
    codigoProvincia: m.codigoProvincia,
    fechaRegistro: faker.date.between({ from: '2021-01-01', to: '2026-07-30' }).toISOString(),
    tieneSeguro: Math.random() < 0.3,
    haDenunciado: false,
    avatarInitials: avatar.initials,
    avatarColor: avatar.bg,
  };
}

// Helper exported for any future view that needs to list the people who filed
// reports (e.g. a denouncers directory). Returns client objects in stable order.
export function listDenouncers(clients) {
  return (clients || []).filter((c) => c.haDenunciado);
}
