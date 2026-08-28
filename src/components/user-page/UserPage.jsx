import { useState, useMemo, useEffect } from 'react';
import UserHome from './UserHome.jsx';
import DenunciaForm from './DenunciaForm.jsx';
import DenunciaConfirm from './DenunciaConfirm.jsx';
import BottomNav from './BottomNav.jsx';

// UserPage — mobile-first end-user shell that lives at /#/user-page.
//
// It owns the local "user reports" state. Reports submitted via the form are
// prepended to the feed so the user can immediately see their denuncia at the
// top of the list (matching the "Ver reporte →" CTA behavior).
//
// Props (passed from App.jsx):
//   alerts        : Array — initial alerts from the admin shell (denouncer-attributed).
//   data          : optional — passed through so denouncer lookup can match existing
//                   clients by name (avatar/vocational consistency).
//   clients       : Array — full client list; we use `listDenouncers` to find
//                   matches for avatar re-use.

export default function UserPage({ alerts = [], clients = [], municipios = null }) {
  const [screen, setScreen] = useState('home'); // 'home' | 'form' | 'confirm'
  const [activeTab, setActiveTab] = useState('home');
  const [submittedReport, setSubmittedReport] = useState(null);
  const [localReports, setLocalReports] = useState([]);

  const denouncers = useMemo(
    () => clients.filter((c) => c.haDenunciado),
    [clients]
  );

  // Build the merged feed: local user submissions + admin-seeded alerts.
  // Local reports come first (recency), then the rest of the alert pool.
  const feed = useMemo(() => {
    const others = alerts.filter((a) => !a.id?.startsWith?.('local-'));
    return [...localReports, ...others];
  }, [alerts, localReports]);

  // Open the form when the user taps the floating CTA or the bottom nav "Denunciar".
  function openDenuncia() {
    setScreen('form');
  }

  // Submit handler: stash the new report and swap to the confirmation screen.
  function handleSubmit(report) {
    setSubmittedReport(report);
    setLocalReports((prev) => [report, ...prev]);
    setScreen('confirm');
  }

  // Confirmation CTAs.
  function handleViewReport() {
    setScreen('home');
    // Scroll the feed into view at the top — the new report will be the first card.
    requestAnimationFrame(() => {
      const target = document.getElementById('reports');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function handleFileAnother() {
    setScreen('form');
  }

  function handleCloseAll() {
    setScreen('home');
  }

  // Bottom-nav selector.
  function handleNavSelect(which) {
    if (which === 'denuncia') {
      openDenuncia();
      return;
    }
    setActiveTab('home');
    if (typeof which === 'object') return;
    // 'home' or 'home,reports' — both mean go back to top.
    setScreen('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 font-sans pb-2">
      <UserHome alerts={feed} onOpenDenuncia={openDenuncia} />

      <BottomNav active={activeTab} onSelect={handleNavSelect} />

      <DenunciaForm
        open={screen === 'form'}
        onClose={handleCloseAll}
        onSubmit={handleSubmit}
        existingClients={clients}
        existingDenouncers={denouncers}
        municipios={municipios}
      />

      <DenunciaConfirm
        report={submittedReport}
        open={screen === 'confirm'}
        onViewReport={handleViewReport}
        onFileAnother={handleFileAnother}
        onClose={handleCloseAll}
      />
    </div>
  );
}
