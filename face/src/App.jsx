import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ParetoChart from './pages/ParetoChart';
import GoldenSignature from './pages/GoldenSignature';
import BatchComparison from './pages/BatchComparison';
import LiveMonitor from './pages/LiveMonitor';
import HITLPanel from './pages/HITLPanel';
import DecisionLog from './pages/DecisionLog';
import ImpactReport from './pages/ImpactReport';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Navbar />
        <main className="min-h-screen p-8 overflow-auto" style={{ marginLeft: 'calc(240px + 4px)', width: 'calc(100% - 244px)' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pareto" element={<ParetoChart />} />
            <Route path="/golden-signature" element={<GoldenSignature />} />
            <Route path="/comparison" element={<BatchComparison />} />
            <Route path="/live-monitor" element={<LiveMonitor />} />
            <Route path="/hitl" element={<HITLPanel />} />
            <Route path="/decision-log" element={<DecisionLog />} />
            <Route path="/impact" element={<ImpactReport />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
