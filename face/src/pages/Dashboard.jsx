import { useMemo } from 'react';
import { useData } from '../hooks/useData';
import PageHeader from '../components/PageHeader';
import KPICard from '../components/KPICard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, CartesianGrid, Cell } from 'recharts';

export default function Dashboard() {
    const { data: batches, loading: loadingBatches } = useData('all_batches.json');
    const { data: golden, loading: loadingGolden } = useData('golden_signatures.json');
    const { data: pareto, loading: loadingPareto } = useData('pareto_data.json');

    const kpis = useMemo(() => {
        if (!batches || !golden) return null;
        const bestQuality = batches.reduce((a, b) => a.quality_score > b.quality_score ? a : b);
        const lowestEnergy = batches.reduce((a, b) => a.total_energy_kwh < b.total_energy_kwh ? a : b);
        return {
            totalBatches: batches.length,
            bestQualityBatch: bestQuality.batch_id,
            bestQualityScore: bestQuality.quality_score.toFixed(2),
            lowestEnergyBatch: lowestEnergy.batch_id,
            lowestEnergyKwh: lowestEnergy.total_energy_kwh.toFixed(1),
            goldenBatch: golden.preset_2?.golden_batch_id || 'N/A',
        };
    }, [batches, golden]);

    const qualityChartData = useMemo(() => {
        if (!batches) return [];
        return [...batches]
            .sort((a, b) => b.quality_score - a.quality_score)
            .map(b => ({
                id: b.batch_id,
                quality: parseFloat(b.quality_score.toFixed(2)),
            }));
    }, [batches]);

    // Sparklines for KPI cards (taken from batch data in their natural order)
    const sparklines = useMemo(() => {
        if (!batches) return {};
        const sorted = [...batches].sort((a, b) => a.batch_id.localeCompare(b.batch_id));
        // Sample every N batches to keep sparkline compact (~15 points)
        const step = Math.max(1, Math.floor(sorted.length / 15));
        const sampled = sorted.filter((_, i) => i % step === 0);

        return {
            quality: sampled.map(b => b.quality_score),
            energy: sampled.map(b => b.total_energy_kwh),
            batches: sampled.map((_, i) => i + 1),   // ascending count
            golden: sampled.map(b => b.energy_score), // energy score for golden card
        };
    }, [batches]);

    // Simple trend: compare last 25% vs first 25% of sorted batches
    const trends = useMemo(() => {
        if (!batches || batches.length < 4) return {};
        const sorted = [...batches].sort((a, b) => a.batch_id.localeCompare(b.batch_id));
        const q = Math.floor(sorted.length / 4);
        const avg = (arr, key) => arr.reduce((s, b) => s + b[key], 0) / arr.length;
        const earlyQ = avg(sorted.slice(0, q), 'quality_score');
        const lateQ = avg(sorted.slice(-q), 'quality_score');
        const earlyE = avg(sorted.slice(0, q), 'total_energy_kwh');
        const lateE = avg(sorted.slice(-q), 'total_energy_kwh');
        return {
            quality: parseFloat((((lateQ - earlyQ) / earlyQ) * 100).toFixed(1)),
            // Energy is better when LOWER, so invert sign for the badge
            energy: parseFloat((((earlyE - lateE) / earlyE) * 100).toFixed(1)),
        };
    }, [batches]);

    if (loadingBatches || loadingGolden || loadingPareto) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-text-secondary text-sm">Loading dashboard data...</p>
                </div>
            </div>
        );
    }

    if (!kpis) return null;

    return (
        <div>
            <PageHeader
                title="Dashboard"
                description="High-level manufacturing KPIs and batch overview across all 60 batches"
            />

            {/* KPI Row */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <KPICard
                    label="Total Batches"
                    value={kpis.totalBatches}
                    color="primary"
                    sparkline={sparklines.batches}
                    trend={2.5}
                />
                <KPICard
                    label="Best Quality Score"
                    value={kpis.bestQualityScore}
                    subtitle={kpis.bestQualityBatch}
                    color="quality"
                    mono
                    sparkline={sparklines.quality}
                    trend={trends.quality}
                />
                <KPICard
                    label="Lowest Energy"
                    value={kpis.lowestEnergyKwh}
                    unit="kWh"
                    subtitle={kpis.lowestEnergyBatch}
                    color="energy"
                    mono
                    sparkline={sparklines.energy}
                    trend={trends.energy}
                />
                <KPICard
                    label="Golden Batch (P2)"
                    value={kpis.goldenBatch}
                    color="golden"
                    mono
                    sparkline={sparklines.golden}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                {/* Quality Score Distribution */}
                <div className="bg-card border border-card-border rounded-xl p-6">
                    <h3 className="chart-title mb-1">Quality Score Distribution</h3>
                    <p className="chart-subtitle mb-4">Ranked distribution of all 60 batches by composite quality score.</p>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={qualityChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="id" tick={{ fontSize: 9 }} interval={2} angle={-45} textAnchor="end" height={45} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{ background: '#1A1008', border: '1px solid #2E1C0C', borderRadius: 8 }}
                                labelStyle={{ color: '#F0FDF4', fontFamily: 'JetBrains Mono' }}
                                formatter={(val) => [`${val.toFixed(2)}`, 'Quality']}
                            />
                            <Bar dataKey="quality" radius={[2, 2, 0, 0]} maxBarSize={14}>
                                {qualityChartData.map((entry, i) => (
                                    <Cell key={i} fill={entry.quality > 60 ? '#D4855A' : entry.quality > 50 ? '#C4733A' : '#3A2010'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Mini Pareto Scatter */}
                <div className="bg-card border border-card-border rounded-xl p-6">
                    <h3 className="chart-title mb-1">Quality vs Energy Overview</h3>
                    <p className="chart-subtitle mb-4">Scatter view of every batch — golden batch highlighted in copper.</p>
                    <ResponsiveContainer width="100%" height={280}>
                        <ScatterChart margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="quality_score" name="Quality" unit="" tick={{ fontSize: 11 }} label={{ value: 'Quality Score', position: 'bottom', offset: -5, style: { fill: '#6B7280', fontSize: 11 } }} />
                            <YAxis dataKey="energy_score" name="Energy" unit="" tick={{ fontSize: 11 }} label={{ value: 'Energy Score', angle: -90, position: 'insideLeft', offset: 15, style: { fill: '#6B7280', fontSize: 11 } }} />
                            <Tooltip
                                contentStyle={{ background: '#1A1008', border: '1px solid #2E1C0C', borderRadius: 8 }}
                                formatter={(val, name) => [val.toFixed(2), name]}
                                labelFormatter={() => ''}
                                content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-card border border-card-border rounded-lg p-3 shadow-xl">
                                            <p className="font-mono font-semibold text-primary-light text-sm">{d.batch_id}</p>
                                            <p className="text-xs text-text-secondary mt-1">Quality: <span className="text-quality font-mono">{d.quality_score.toFixed(2)}</span></p>
                                            <p className="text-xs text-text-secondary">Energy: <span className="text-energy font-mono">{d.energy_score.toFixed(2)}</span></p>
                                        </div>
                                    );
                                }}
                            />
                            <Scatter data={pareto} fill="#0D9488" fillOpacity={0.7} r={4}>
                                {pareto?.map((entry, i) => (
                                    <Cell key={i} fill={entry.batch_id === kpis.goldenBatch ? '#D4855A' : '#7AB0D4'} r={entry.batch_id === kpis.goldenBatch ? 7 : 4} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Batch Summary Table */}
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
                <div className="px-6 py-5 border-b border-card-border">
                    <h3 className="chart-title">All Batches Summary</h3>
                    <p className="chart-subtitle">Full table of 60 batches ranked by combined quality & energy score.</p>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-card z-10">
                            <tr className="border-b border-card-border">
                                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Batch ID</th>
                                <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Quality Score</th>
                                <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Energy Score</th>
                                <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Energy (kWh)</th>
                                <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Rank</th>
                            </tr>
                        </thead>
                        <tbody>
                            {batches && [...batches]
                                .sort((a, b) => (b.quality_score * 0.6 + b.energy_score * 0.4) - (a.quality_score * 0.6 + a.energy_score * 0.4))
                                .map((b, i) => (
                                    <tr key={b.batch_id} className={`border-b border-card-border/50 transition-colors hover:bg-white/[0.02] ${b.batch_id === kpis.goldenBatch ? 'bg-golden/[0.05]' : ''}`}>
                                        <td className="px-6 py-3 font-mono text-primary-light font-medium">
                                            {b.batch_id}
                                            {b.batch_id === kpis.goldenBatch && <span className="ml-2 text-[10px] text-golden bg-golden/20 px-1.5 py-0.5 rounded-full">GOLDEN</span>}
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono text-quality">{b.quality_score.toFixed(2)}</td>
                                        <td className="px-6 py-3 text-right font-mono text-energy">{b.energy_score.toFixed(2)}</td>
                                        <td className="px-6 py-3 text-right font-mono text-text-secondary">{b.total_energy_kwh.toFixed(1)}</td>
                                        <td className="px-6 py-3 text-right font-mono text-text-muted">#{i + 1}</td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
