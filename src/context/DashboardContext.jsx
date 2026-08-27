import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [showClimateLayer, setShowClimateLayer] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [hoveredTerritory, setHoveredTerritory] = useState(null);

  const value = useMemo(
    () => ({
      selectedTerritory,
      setSelectedTerritory,
      hoveredTerritory,
      setHoveredTerritory,
      showClimateLayer,
      setShowClimateLayer,
      showEvents,
      setShowEvents,
    }),
    [selectedTerritory, hoveredTerritory, showClimateLayer, showEvents]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used inside DashboardProvider');
  return ctx;
}

export const useDebouncedCallback = (fn, delay = 250) => {
  const [timer, setTimer] = useState(null);
  return useCallback(
    (...args) => {
      if (timer) clearTimeout(timer);
      const t = setTimeout(() => fn(...args), delay);
      setTimer(t);
    },
    [fn, delay, timer]
  );
};
