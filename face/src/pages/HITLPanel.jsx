import { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import PageHeader from '../components/PageHeader';
import PresetSelector from '../components/PresetSelector';
import KPICard from '../components/KPICard';
import DeviationBadge from '../components/DeviationBadge';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function HITLPanel() {
    const { data: initialLogs, loading } = useData('initial_decision_log.json');
    const [activePreset, setActivePreset] = useState(2);

    // Local state to simulate live interaction
    const [logs, setLogs] = useState(null);

    // Mock active alerts simulating real-time detection on T005
    const [alerts, setAlerts] = useState([
        {
            id: "ALT-T005-01",
            batch_id: "T005",
            phase: "Granulation",
            sensor: "Motor Speed",
            golden_val: "150 RPM",
            actual_val: "175 RPM",
            deviation: "+16.6%",
            band: "YELLOW",
            recommendation: "Reduce Motor Speed by 15% immediately to prevent micro-fractures.",
            timestamp: "10:14 AM"
        },
        {
            id: "ALT-T005-02",
            batch_id: "T005",
            phase: "Drying",
            sensor: "Temperature",
            golden_val: "58.0°C",
            actual_val: "42.0°C",
            deviation: "-27.5%",
            band: "ORANGE",
            recommendation: "Increase drying temperature by 15°C. Excessive moisture predicted.",
            timestamp: "10:45 AM"
        }
    ]);

    if (!loading && !logs && initialLogs) {
        setLogs(initialLogs);
    }

    const handleDecision = (alertId, decision, reason = "") => {
        const alert = alerts.find(a => a.id === alertId);
        if (!alert) return;

        // Create a new log entry
        const newLog = {
            decision_id: `DEC-${Math.floor(Math.random() * 10000)}`,
            batch_id: alert.batch_id,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
            alert_context: {
                phase: alert.phase,
                sensor: alert.sensor,
                deviation_percent: alert.deviation
            },
            decision,
            reason
        };

        // Remove from active alerts and add to logs
        setAlerts(prev => prev.filter(a => a.id !== alertId));
        setLogs(prev => [newLog, ...prev]);
    };

    const chartData = useMemo(() => {
        if (!logs) return { pie: [], bar: [] };
        const accepted = logs.filter(l => l.operator_decision === 'ACCEPTED').length;
        const rejected = logs.filter(l => l.operator_decision === 'REJECTED').length;

        // Fake severity distribution based on logs context
        const severities = { GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0 };
        logs.forEach(l => {
            const dev = parseFloat(l.deviation_percent) || 0;
            if (Math.abs(dev) < 10) severities.GREEN++;
            else if (Math.abs(dev) < 20) severities.YELLOW++;
            else if (Math.abs(dev) < 30) severities.ORANGE++;
            else severities.RED++;
        });

        return {
            pie: [
                { name: 'Accepted', value: accepted, color: '#10B981' },
                { name: 'Rejected', value: rejected, color: '#EF4444' }
            ],
            bar: [
                { name: 'Green', count: severities.GREEN, color: '#22C55E' },
                { name: 'Yellow', count: severities.YELLOW, color: '#EAB308' },
                { name: 'Orange', count: severities.ORANGE, color: '#F97316' },
                { name: 'Red', count: severities.RED, color: '#EF4444' }
            ]
        };
    }, [logs]);

    if (loading || !logs) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="pb-10">
            <div className="flex justify-between items-start mb-8">
                <PageHeader
                    title="Human-in-the-Loop Panel"
                    description="Live operator interface for reviewing AI predictions and accepting/rejecting recommendations."
                />
                <div className="flex gap-4">
                    <div className="bg-card border border-primary/30 p-2 rounded-xl flex items-center gap-3">
                        <span className="text-xs text-primary pl-2 uppercase font-semibold tracking-wider">Active Strategy:</span>
                        <PresetSelector value={activePreset} onChange={setActivePreset} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
                {/* Left Column: Alerts */}
                <div className="col-span-2 space-y-4">
                    <div className="flex items-center justify-between mb-3 border-b border-card-border pb-3">
                        <h3 className="chart-title">Actionable Intelligence Queue</h3>
                        <span className="text-xs bg-primary/20 text-primary-light px-2 py-1 rounded-full font-mono">{alerts.length} Active</span>
                    </div>

                    {alerts.length === 0 ? (
                        <div className="bg-alert-green/5 border border-alert-green/20 rounded-xl p-8 text-center flex flex-col items-center">
                            <svg className="w-12 h-12 text-alert-green mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <p className="text-alert-green font-medium text-sm">All clear! No active deviations detected.</p>
                            <p className="text-xs text-text-secondary mt-1">Batch physics are aligned with Golden Signature parameters.</p>
                        </div>
                    ) : (
                        alerts.map(alert => (
                            <div key={alert.id} className="bg-card border border-card-border rounded-xl p-5 shadow-lg border-l-[3px] border-l-alert-orange flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-primary-light text-sm font-bold">{alert.batch_id}</span>
                                        <span className="px-2 py-1 bg-white/5 rounded text-xs text-text-secondary border border-white/5">{alert.phase}</span>
                                        <DeviationBadge band={alert.band} />
                                    </div>
                                    <span className="text-xs text-text-muted font-mono">{alert.timestamp}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-page border border-card-border rounded-lg p-3">
                                        <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">{alert.sensor} (Actual)</p>
                                        <p className="font-mono font-bold text-text-primary text-xl">{alert.actual_val}</p>
                                        <p className="text-xs text-alert-orange mt-0.5">Deviation {alert.deviation}</p>
                                    </div>
                                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                                        <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Golden Reference (P{activePreset})</p>
                                        <p className="font-mono font-bold text-primary-light text-xl">{alert.golden_val}</p>
                                        <p className="text-xs text-primary mt-0.5">Expected Target</p>
                                    </div>
                                </div>

                                <div className="bg-white/[0.02] rounded-lg p-4">
                                    <div className="flex gap-2 items-start">
                                        <svg className="w-5 h-5 text-primary-light shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <p className="text-xs font-semibold text-text-primary mb-1">AI Recommendation</p>
                                            <p className="text-sm text-text-secondary leading-relaxed">{alert.recommendation}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 justify-end pt-2 border-t border-card-border mt-2">
                                    <button
                                        onClick={() => handleDecision(alert.id, 'REJECT', 'Operator judgment contradicts model')}
                                        className="px-4 py-2 border border-alert-red/30 text-alert-red hover:bg-alert-red/10 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Reject Prediction
                                    </button>
                                    <button
                                        onClick={() => handleDecision(alert.id, 'ACCEPT')}
                                        className="px-4 py-2 bg-alert-green/20 border border-alert-green/40 text-alert-green hover:bg-alert-green/30 rounded-lg text-sm font-bold transition-colors shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                                    >
                                        Accept & Apply
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right Column: Session Analytics & Feed */}
                <div className="col-span-1 flex flex-col gap-6">
                    <div className="bg-card border border-card-border rounded-xl p-5 flex flex-col h-[280px]">
                        <h3 className="chart-title mb-1 border-l-2 border-primary pl-3">Session Actions Overview</h3>
                        <p className="chart-subtitle mb-2 pl-3">Accepted vs rejected AI recommendations this session.</p>
                        <div className="flex-1 flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={chartData.pie} innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                                        {chartData.pie.map((entry, i) => (
                                            <Cell key={`cell-${i}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ background: '#1A1008', border: '1px solid #2E1C0C', borderRadius: 8 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-mono font-bold text-white">{logs.length}</span>
                                <span className="text-[10px] text-text-secondary uppercase">Actions</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-card-border rounded-xl p-5 flex-1 flex flex-col min-h-[300px]">
                        <h3 className="chart-title mb-1 border-l-2 border-primary pl-3">Recent Decisions</h3>
                        <p className="chart-subtitle mb-3 pl-3">Latest 5 human operator interventions.</p>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                            {logs.slice(0, 5).map((log, i) => (
                                <div key={i} className="bg-page border border-card-border rounded-lg p-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-mono text-[10px] text-text-muted">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        {log.operator_decision === 'ACCEPTED'
                                            ? <span className="text-[10px] bg-alert-green/20 text-alert-green px-1.5 py-0.5 rounded border border-alert-green/30">ACCEPTED</span>
                                            : <span className="text-[10px] bg-alert-red/20 text-alert-red px-1.5 py-0.5 rounded border border-alert-red/30">REJECTED</span>
                                        }
                                    </div>
                                    <p className="text-xs text-text-primary"><span className="text-primary-light font-mono">{log.batch_id}</span> • {log.phase}</p>
                                    <p className="text-[11px] text-text-secondary mt-1 truncate">({log.deviation_percent} Deviation on {(log.sensor || '').replace(/_/g, ' ')})</p>
                                </div>
                            ))}
                            {logs.length > 5 && <p className="text-center text-xs text-text-muted mt-4">View Decision Log for more...</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
