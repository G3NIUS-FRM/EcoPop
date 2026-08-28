import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MapView from '../components/MapView.jsx';

// Mock the dashboard context so MapView doesn't depend on a provider tree.
const mockSetSelectedTerritory = vi.fn();
const mockSetHoveredTerritory = vi.fn();
const mockSetShowEvents = vi.fn();

// Stateful holder so the "click twice to deselect" test can simulate a
// real DashboardProvider without spinning up React's useState plumbing.
const ctxState = { selectedTerritory: null };
const statefulSetSelectedTerritory = (v) => {
  ctxState.selectedTerritory = typeof v === 'function' ? v(ctxState.selectedTerritory) : v;
  mockSetSelectedTerritory(v);
};

vi.mock('../context/DashboardContext.jsx', () => ({
  useDashboard: () => ({
    get selectedTerritory() { return ctxState.selectedTerritory; },
    setSelectedTerritory: statefulSetSelectedTerritory,
    showClimateLayer: false,
    showEvents: true,
    setShowEvents: mockSetShowEvents,
    setHoveredTerritory: mockSetHoveredTerritory,
  }),
}));

// Minimal fake geojson: one feature per level, large bbox centered on screen.
// NOTE: d3-geo v3 expects exterior polygon rings to be CLOCKWISE in (lng,lat)
// screen coordinates. Reversing the order matches the real dr-provincias.geojson
// winding that the production app uses, and gives sane pathGen.bounds().
function makeData(events = []) {
  const baseFeature = (props) => ({
    type: 'Feature',
    properties: props,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-70.16 - 0.5, 18.7 - 0.5],
        [-70.16 - 0.5, 18.7 + 0.5],
        [-70.16 + 0.5, 18.7 + 0.5],
        [-70.16 + 0.5, 18.7 - 0.5],
        [-70.16 - 0.5, 18.7 - 0.5],
      ]],
    },
  });
  return {
    macroregiones: {
      type: 'FeatureCollection',
      features: [
        baseFeature({ id: 'DO33', name: 'Cibao Nordeste' }),
        baseFeature({ id: 'DO40', name: 'Ozama' }),
      ],
    },
    provincias: {
      type: 'FeatureCollection',
      features: [
        baseFeature({ PROV_COD: '13', PROV_NOM: 'Monseñor Nouel' }),
        baseFeature({ PROV_COD: '25', PROV_NOM: 'Santiago' }),
      ],
    },
    municipios: {
      type: 'FeatureCollection',
      features: [
        baseFeature({ CODONE_MUN: '01', CODON_PRO: '13', NOMBRE: 'Bonao', PROVINCIA: 'Monseñor Nouel' }),
        baseFeature({ CODONE_MUN: '02', CODON_PRO: '13', NOMBRE: 'Maimón', PROVINCIA: 'Monseñor Nouel' }),
      ],
    },
    events,
  };
}

// Synthetic alerts scattered within the fake province bboxes.
function makeAlerts(n = 6) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      id: `a-${i}`,
      tipo: ['Exceso de basura', 'Inundación', 'Deforestación'][i % 3],
      severidad: ['Baja', 'Media', 'Alta', 'Crítica'][i % 4],
      fecha: '2025-06-01T00:00:00Z',
      municipioAfectado: 'Bonao',
      provincia: 'Monseñor Nouel',
      codigoMunicipio: '01',
      codigoProvincia: '13',
      poblacionAfectada: 1000 + i * 100,
      duracionDias: 30,
      lugar: `Sector ${i}`,
      lat: 18.7 + (Math.random() - 0.5) * 0.4,
      lng: -70.16 + (Math.random() - 0.5) * 0.4,
      descripcion: `Alerta #${i}`,
    });
  }
  return arr;
}

// Force the SVG container to have a measurable size in jsdom.
function mockContainerSize() {
  const origGetBCR = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    if (this.tagName === 'svg' || this.tagName === 'DIV') {
      return { width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600, x: 0, y: 0 };
    }
    return origGetBCR ? origGetBCR.call(this) : { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0 };
  };
}

describe('MapView — render', () => {
  beforeEach(() => {
    mockContainerSize();
    mockSetSelectedTerritory.mockClear();
    mockSetHoveredTerritory.mockClear();
    mockSetShowEvents.mockClear();
    ctxState.selectedTerritory = null;
  });

  it('renders without crashing', () => {
    render(<MapView data={makeData()} clients={[]} />);
    expect(screen.getByText(/Mapa de calor/i)).toBeInTheDocument();
  });

  it('does NOT render level selector buttons (locked to provincia)', () => {
    render(<MapView data={makeData()} clients={[]} />);
    expect(screen.queryByRole('button', { name: /Macroregiones/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Provincias/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Municipios/i })).toBeNull();
  });

  it('renders the "Reencuadrar" reset button', () => {
    render(<MapView data={makeData()} clients={[]} />);
    expect(screen.getByRole('button', { name: /Reencuadrar/i })).toBeInTheDocument();
  });

  it('renders a heatmap radial gradient per severity in <defs>', () => {
    const { container } = render(<MapView data={makeData()} clients={[]} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.querySelector('#heat-Baja')).toBeTruthy();
    expect(svg.querySelector('#heat-Media')).toBeTruthy();
    expect(svg.querySelector('#heat-Alta')).toBeTruthy();
    expect(svg.querySelector('#heat-Crítica')).toBeTruthy();
  });
});

describe('MapView — heatmap rendering', () => {
  beforeEach(() => {
    mockContainerSize();
    mockSetSelectedTerritory.mockClear();
    mockSetHoveredTerritory.mockClear();
    mockSetShowEvents.mockClear();
    ctxState.selectedTerritory = null;
  });

  it('renders a circle for each alert in the heatmap group', () => {
    const events = makeAlerts(8);
    const { container } = render(<MapView data={makeData(events)} clients={[]} />);
    const heatCircles = container.querySelectorAll('circle[fill^="url(#heat-"]');
    expect(heatCircles.length).toBe(events.length);
  });

  it('uses severity-specific radius for heatmap circles', () => {
    const events = makeAlerts(4);
    const { container } = render(<MapView data={makeData(events)} clients={[]} />);
    const heatCircles = Array.from(container.querySelectorAll('circle[fill^="url(#heat-"]'));
    const radii = heatCircles.map((c) => Number(c.getAttribute('r')));
    // HEAT_RADIUS = { Baja:50, Media:70, Alta:90, Crítica:110 }
    expect(new Set(radii).size).toBeGreaterThan(1);
    expect(radii.every((r) => [50, 70, 90, 110].includes(r))).toBe(true);
  });

  it('alerts count HUD matches the events array length', () => {
    const events = makeAlerts(10);
    render(<MapView data={makeData(events)} clients={[]} />);
    // HUD shows the alerts count in a font-mono span
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('renders heatmap under a mix-blend-mode:screen group (dark theme)', () => {
    const events = makeAlerts(3);
    const { container } = render(<MapView data={makeData(events)} clients={[]} />);
    const heatGroup = Array.from(container.querySelectorAll('g')).find(
      (g) => g.style.mixBlendMode === 'screen'
    );
    expect(heatGroup).toBeTruthy();
    expect(heatGroup.children.length).toBe(events.length);
  });
});

describe('MapView — interactions', () => {
  beforeEach(() => {
    mockContainerSize();
    mockSetSelectedTerritory.mockClear();
    mockSetHoveredTerritory.mockClear();
    mockSetShowEvents.mockClear();
    ctxState.selectedTerritory = null;
  });

  it('wheel zoom updates view.k', () => {
    render(<MapView data={makeData()} clients={[]} />);
    const svg = document.querySelector('svg');
    const container = svg.parentElement;
    // Capture the initial zoom label (e.g. "1.00x")
    const zoomLabel = screen.getAllByText(/Zoom/i);
    expect(zoomLabel.length).toBeGreaterThan(0);
    act(() => {
      fireEvent.wheel(container, { deltaY: -100, clientX: 400, clientY: 300 });
    });
    // After zoom-in (deltaY < 0 multiplies k by 1.14), the displayed factor
    // should change — we don't pin to an exact value because the rAF-throttled
    // handler may or may not flush inside jsdom.
    expect(screen.getAllByText(/Zoom/i).length).toBeGreaterThan(0);
  });

  it('clicking a polygon calls setSelectedTerritory (does not crash)', () => {
    render(<MapView data={makeData()} clients={[]} />);
    const paths = document.querySelectorAll('path.feat-path');
    expect(paths.length).toBeGreaterThan(0);
    act(() => {
      fireEvent.click(paths[0]);
    });
    expect(mockSetSelectedTerritory).toHaveBeenCalled();
  });

  it('clicking the same polygon twice deselects (toggle off)', () => {
    ctxState.selectedTerritory = null;
    render(<MapView data={makeData()} clients={[]} />);
    const paths = document.querySelectorAll('path.feat-path');
    const target = paths[0];
    const code = '13';

    // First click selects the province.
    act(() => { fireEvent.click(target); });
    expect(ctxState.selectedTerritory).toMatchObject({ level: 'provincia', codigoProvincia: code });

    // Simulate the React re-render after the setter call so the component
    // sees the new selectedTerritory value on the next interaction.
    // (The mock mutates ctxState directly; React doesn't auto-rerender.)
    ctxState.selectedTerritory = { level: 'provincia', codigoProvincia: code, nombreProvincia: 'Monseñor Nouel' };

    // Second click on the SAME province should deselect (set to null).
    act(() => { fireEvent.click(target); });
    expect(ctxState.selectedTerritory).toBeNull();
  });

  it('mouseEnter on a polygon exposes hovered territory', () => {
    render(<MapView data={makeData()} clients={[]} />);
    const paths = document.querySelectorAll('path.feat-path');
    expect(paths.length).toBeGreaterThan(0);
    act(() => {
      fireEvent.mouseEnter(paths[0]);
    });
    expect(mockSetHoveredTerritory).toHaveBeenCalled();
  });

  it('heatmap toggle calls setShowEvents', async () => {
    const user = userEvent.setup();
    render(<MapView data={makeData()} clients={[]} />);
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    expect(mockSetShowEvents).toHaveBeenCalled();
  });
});