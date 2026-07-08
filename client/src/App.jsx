import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Research } from './pages/Research.jsx';
import { Ads } from './pages/Ads.jsx';
import { Signals } from './pages/Signals.jsx';
import { Automations } from './pages/Automations.jsx';
import { Finance } from './pages/Finance.jsx';
import { Settings } from './pages/Settings.jsx';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/research" element={<Research />} />
          <Route path="/ads" element={<Ads />} />
          <Route path="/signals" element={<Signals />} />
          <Route path="/automations" element={<Automations />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
