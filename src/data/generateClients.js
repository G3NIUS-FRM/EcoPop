import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { VOCATIONS, findMacroregionForProvince } from '../lib/territoryLookup.js';

// Generate N clients distributed across municipios weighted by population.
export function generateClients(municipiosGeoJSON, total = 1500) {
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
  const macroByCode = new Map();

  for (const m of validMunicipios) {
    const macroId = findMacroregionForProvince(m.codigoProvincia);
    if (!macroByCode.has(macroId)) macroByCode.set(macroId, []);
    macroByCode.get(macroId).push(m);
  }

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
  return result;
}

function buildClient(m) {
  const genero = Math.random() < 0.5 ? 'M' : 'F';
  const vocacion = VOCATIONS[Math.floor(Math.random() * VOCATIONS.length)];
  const ingresoMensual = 8000 + Math.floor(Math.random() * 142000);
  // Monthly spend tracks income: typical savings rate 8–35%, expenses 65–92%.
  const savingsRate = 0.08 + Math.random() * 0.27;
  const gastoMensual = Math.round(ingresoMensual * (1 - savingsRate));
  return {
    id: uuidv4(),
    nombre: faker.person.fullName({ sex: genero === 'F' ? 'female' : 'male' }),
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
  };
}
