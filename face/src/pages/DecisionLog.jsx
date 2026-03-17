import { useMemo } from 'react';
import { useData } from '../hooks/useData';
import PageHeader from '../components/PageHeader';
import KPICard from '../components/KPICard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const CustomYAxisTick = ({ x, y, payload }) => {
    const words = payload.value.split(' ');
    const maxLineLength = 22;
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
        if ((currentLine + word).length > maxLineLength) {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
        } else {
            currentLine += word + ' ';
        }
    });
    if (currentLine) lines.push(currentLine.trim());

    return (
        <g transform={`translate(${x},${y})`}>
            {lines.map((line, i) => (
                <text
                    key={i}
                    x={0}
                    y={0}
                    dy={(i - (lines.length - 1) / 2) * 12 + 4}
                    textAnchor="end"
                    fill="#9CA3AF"
                    fontSize={11}
                    fontFamily="monospace"
                >
                    {line}
                </text>
            ))}
        </g>
    );
};

export default function DecisionLog() {
    const { data: logs, loading } = useData('initial_decision_log.json');

    const stats = useMemo(() => {
        if (!logs) return null;
        const accepted = logs.filter(l => l.operator_decision === 'ACCEPTED').length;
        const rejected = logs.filter(l => l.operator_decision === 'REJECTED').length;
        return {
            total: logs.length,
            accepted,
            rejected,
            acceptRate: ((accepted / logs.length) * 100).toFixed(1)
        };
    }, [logs]);

    // Cumulative trend for Area Chart
    const trendData = useMemo(() => {
        if (!logs) return [];
        let acc = 0;
        let rej = 0;
        return logs.map((log, index) => {
            if (log.operator_decision === 'ACCEPTED') acc++;
            if (log.operator_decision === 'REJECTED') rej++;
            return {
                event: index + 1,
                accepts: acc,
                rejects: rej
            };
        });
    }, [logs]);

    // Root Cause / Reason distribution
    const reasonData = useMemo(() => {
        if (!logs) return [];
        const counts = {};
        logs.filter(l => l.operator_decision === 'REJECTED').forEach(l => {
            const reason = l.reason || 'No reason given';
            counts[reason] = (counts[reason] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [logs]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!logs) return null;

    return (
        <div className="pb-10">
            <PageHeader
                title="Decision Log & Continuous Learning"
                description="Historical log of all Human-in-the-Loop interventions. This data trains the next generation of the AI model."
            />

            {/* KPI Row */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <KPICard label="Total Model Interventions" value={stats.total} color="primary" mono />
                <KPICard label="Operator Accepted" value={stats.accepted} color="green" mono />
                <KPICard label="Operator Rejected" value={stats.rejected} color="red" mono />
                <KPICard label="AI Trust Score" value={`${stats.acceptRate}%`} subtitle="Acceptance rate" color="golden" mono />
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
                {/* Cumulative Trend */}
                <div className="col-span-2 bg-card border border-card-border rounded-xl p-6">
                    <h3 className="chart-title mb-1 border-l-2 border-primary pl-3">Cumulative Operator Trust Trend</h3>
                    <p className="chart-subtitle mb-5 pl-3">Accepts vs Rejects stacked over time showing model learning curve.</p>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#D4855A" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#D4855A" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorRej" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="event" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <RechartsTooltip
                                contentStyle={{ background: '#1A1008', border: '1px solid #2E1C0C', borderRadius: 8, fontFamily: 'JetBrains Mono' }}
                            />
                            <Area type="monotone" dataKey="accepts" name="Accepted Fixes" stroke="#10B981" fillOpacity={1} fill="url(#colorAcc)" />
                            <Area type="monotone" dataKey="rejects" name="Rejected Fixes" stroke="#EF4444" fillOpacity={1} fill="url(#colorRej)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Rejection Reasons */}
                <div className="col-span-1 bg-card border border-card-border rounded-xl p-6">
                    <h3 className="chart-title mb-1 border-l-2 border-alert-red pl-3">Rejection Reasoning</h3>
                    <p className="chart-subtitle mb-5 pl-3">Why operators overrode the AI recommendation.</p>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart layout="vertical" data={reasonData} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" tick={<CustomYAxisTick />} width={135} />
                            <RechartsTooltip
                                contentStyle={{ background: '#1A1008', border: '1px solid #2E1C0C', borderRadius: 8 }}
                                cursor={{ fill: '#FFFFFF05' }}
                            />
                            <Bar dataKey="count" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={16}>
                                {reasonData.map((e, i) => (
                                    <Cell key={i} fill={i === 0 ? '#EF4444' : '#B91C1C'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Full Audit Log Table */}
            <div className="bg-card border border-card-border rounded-xl flex flex-col overflow-hidden">
                <div className="px-6 py-5 border-b border-card-border">
                    <h3 className="chart-title border-l-2 border-primary pl-3">Intervention Audit Trail</h3>
                    <p className="chart-subtitle pl-3">Full chronological log of all Human-in-the-Loop decisions.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-page/50">
                            <tr className="border-b border-card-border">
                                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary uppercase">ID</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary uppercase">Timestamp</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary uppercase">Batch</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary uppercase">Context</th>
                                <th className="text-center px-6 py-3 text-xs font-medium text-text-secondary uppercase">Decision</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary uppercase">Reason / Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log, i) => (
                                <tr key={log.id || i} className="border-b border-card-border/30 hover:bg-white/[0.02]">
                                    <td className="px-6 py-4 font-mono text-text-muted text-xs">{log.id}</td>
                                    <td className="px-6 py-4 font-mono text-text-secondary">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 font-mono text-primary-light">{log.batch_id}</td>
                                    <td className="px-6 py-4 flex flex-col">
                                        <span className="text-text-primary text-xs font-medium">{log.phase} — {(log.sensor || '').replace(/_/g, ' ')}</span>
                                        <span className="text-text-muted text-xs">Deviation: {log.deviation_percent}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {log.operator_decision === 'ACCEPTED'
                                            ? <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-alert-green/20 text-alert-green border border-alert-green/30">ACCEPTED</span>
                                            : <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-alert-red/20 text-alert-red border border-alert-red/30">REJECTED</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-xs text-text-secondary">
                                        {log.operator_decision === 'ACCEPTED' ? <span className="text-text-muted italic">No comment</span> : (log.reason || '—')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
