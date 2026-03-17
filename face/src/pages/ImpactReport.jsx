import { useMemo } from 'react';
import { useData } from '../hooks/useData';
import PageHeader from '../components/PageHeader';
import KPICard from '../components/KPICard';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, ScatterChart, Scatter, Cell, ReferenceLine } from 'recharts';

export default function ImpactReport() {
    const { data: impact, loading: loadingImpact } = useData('impact_report.json');
    const { data: batches, loading: loadingBatches } = useData('all_batches.json');
    const { data: pareto, loading: loadingPareto } = useData('pareto_data.json');
    const { data: golden, loading: loadingGolden } = useData('golden_signatures.json');

    const isLoading = loadingImpact || loadingBatches || loadingPareto || loadingGolden;

    const projectionData = useMemo(() => {
        if (!impact) return [];
        // Build a simple projection chart from the available data
        const savedKwh = impact.energy_saved_kwh;
        return [
            { span: 'Current (60)', saved: savedKwh },
            { span: 'Next 100', saved: (savedKwh / 60) * 100 },
            { span: 'Next 500', saved: (savedKwh / 60) * 500 },
            { span: 'Annual (1000)', saved: impact.projected_savings_1000_batches_kwh },
        ];
    }, [impact]);

    const energyComparisonData = useMemo(() => {
        if (!batches || !golden) return [];
        const goldenP2Id = golden.preset_2.golden_batch_id;
        const goldenBatch = batches.find(b => b.batch_id === goldenP2Id);
        const goldenKwh = goldenBatch ? goldenBatch.total_energy_kwh : 0;

        return [...batches]
            .sort((a, b) => b.total_energy_kwh - a.total_energy_kwh) // Worst energy consumers first
            .map(b => ({
                id: b.batch_id,
                actual: parseFloat(b.total_energy_kwh.toFixed(1)),
                excess: Math.max(0, b.total_energy_kwh - goldenKwh).toFixed(1),
                golden: parseFloat(goldenKwh.toFixed(1))
            }));
    }, [batches, golden]);

    const qualityLeaderboardData = useMemo(() => {
        if (!batches) return [];
        return [...batches]
            .sort((a, b) => b.quality_score - a.quality_score)
            .slice(0, 15) // Top 15 to make horizontal bar readable
            .map((b) => ({
                id: b.batch_id,
                quality: parseFloat(b.quality_score.toFixed(2))
            }));
    }, [batches]);

    const beatMissedData = useMemo(() => {
        if (!pareto || !golden) return [];
        const goldenP2Id = golden.preset_2.golden_batch_id;
        const goldenBatch = pareto.find(b => b.batch_id === goldenP2Id);

        if (!goldenBatch) return [];
        // Calculate Preset 2 combined score (60/40) for comparison
        const goldenScore = (0.6 * goldenBatch.quality_score) + (0.4 * goldenBatch.energy_score);

        return pareto.map(b => {
            const score = (0.6 * b.quality_score) + (0.4 * b.energy_score);
            return {
                ...b,
                beat_golden: score >= goldenScore,
                combined: score
            };
        });
    }, [pareto, golden]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!impact) return null;

    return (
        <div className="pb-10">
            <PageHeader
                title="Business Impact Report"
                description="Analysis of energy savings, CO₂ reduction, and cost benefits using the optimal Golden Signature."
            />

            {/* Top KPIs */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <KPICard
                    label="Energy Saved (60 Batches)"
                    value={`${impact.energy_saved_kwh.toFixed(0)} kWh`}
                    subtitle={`${((impact.energy_saved_kwh / impact.total_energy_actual_kwh) * 100).toFixed(1)}% reduction`}
                    color="energy"
                    mono
                />
                <KPICard
                    label="Cost Savings (Current)"
                    value={`$${impact.cost_savings_usd.toFixed(2)}`}
                    subtitle="Based on $0.15/kWh"
                    color="quality"
                    mono
                />
                <KPICard
                    label="CO₂ Reduced (60 Batches)"
                    value={`${impact.co2_equivalent_kg.toFixed(0)} kg`}
                    subtitle="0.4 kg CO₂ per kWh"
                    color="primary"
                    mono
                />
                <KPICard
                    label="Projected Annual Savings"
                    value={`$${((impact.projected_savings_1000_batches_kwh) * 0.15).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    subtitle="Over 1,000 batches"
                    color="golden"
                    mono
                />
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Actual vs Golden Energy Comparison */}
                <div className="bg-card border border-card-border rounded-xl p-6 flex flex-col">
                    <h3 className="chart-title mb-1">Energy Consumption vs Golden Signature</h3>
                    <p className="chart-subtitle mb-5">Highest consuming batches shown first. Grey area represents wasted energy above golden baseline.</p>
                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={energyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="id" tick={{ fontSize: 9 }} interval={2} angle={-45} textAnchor="end" />
                                <YAxis tick={{ fontSize: 11 }} />
                                <RechartsTooltip
                                    contentStyle={{ background: '#1A1008', border: '1px solid #2E1C0C', borderRadius: 8 }}
                                    labelStyle={{ color: '#F0FDF4', fontFamily: 'JetBrains Mono' }}
                                />
                                {/* We stack the bars to show Golden (baseline) + Excess (wasted) */}
                                <Bar dataKey="golden" stackId="a" fill="#C4733A" name="Golden Target" />
                                <Bar dataKey="excess" stackId="a" fill="#7AB0D4" name="Excess Energy" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Savings Projection Area Chart */}
                <div className="bg-card border border-card-border rounded-xl p-6 flex flex-col">
                    <h3 className="chart-title mb-1">Cumulative Energy Savings Projection</h3>
                    <p className="chart-subtitle mb-5">Projected kWh saved if all future batches adhere to Preset 2 golden settings.</p>
                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#D4855A" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#D4855A" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="span" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `${val / 1000}k`} />
                                <RechartsTooltip
                                    contentStyle={{ background: '#1A1008', border: '1px solid #2E1C0C', borderRadius: 8 }}
                                    formatter={(val) => [`${val.toLocaleString()} kWh`, 'Saved']}
                                    labelStyle={{ color: '#F0FDF4' }}
                                />
                                <Area type="monotone" dataKey="saved" stroke="#D4855A" strokeWidth={3} fillOpacity={1} fill="url(#colorSaved)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Quality Score Leaderboard (Horizontal) */}
                <div className="bg-card border border-card-border rounded-xl p-6">
                    <h3 className="chart-title mb-1">Top 15 Quality Leaderboard</h3>
                    <p className="chart-subtitle mb-5">Best performing batches by 5-metric composite quality score.</p>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart layout="vertical" data={qualityLeaderboardData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" domain={[40, 100]} tick={{ fontSize: 11 }} />
                            <YAxis dataKey="id" type="category" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} width={50} />
                            <RechartsTooltip
                                contentStyle={{ background: '#1A1008', border: '1px solid #2E1C0C', borderRadius: 8 }}
                                itemStyle={{ fontFamily: 'JetBrains Mono' }}
                                formatter={(val) => [val, 'Quality Score']}
                            />
                            <Bar dataKey="quality" fill="#D4855A" radius={[0, 4, 4, 0]} barSize={12} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Beat vs Missed Golden Scatter */}
                <div className="bg-card border border-card-border rounded-xl p-6">
                    <h3 className="chart-title mb-1">Batch Performance Distribution</h3>
                    <p className="chart-subtitle mb-5">Batches colored by overall combined score relative to Preset 2 Golden Batch.</p>
                    <ResponsiveContainer width="100%" height={400}>
                        <ScatterChart margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="quality_score" name="Quality Context" tick={{ fontSize: 11 }} label={{ value: 'Quality Score', position: 'bottom', offset: -10, style: { fill: '#6B7280', fontSize: 11 } }} />
                            <YAxis dataKey="energy_score" name="Energy Context" tick={{ fontSize: 11 }} label={{ value: 'Energy Score', angle: -90, position: 'insideLeft', style: { fill: '#6B7280', fontSize: 11 } }} />
                            <RechartsTooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                contentStyle={{ background: '#1A1008', border: '1px solid #2E1C0C', borderRadius: 8 }}
                                content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-card border border-card-border rounded-lg p-3 shadow-xl">
                                            <p className="font-mono font-semibold text-text-primary text-sm flex items-center gap-2">
                                                {d.batch_id}
                                                {d.beat_golden && <span className="text-[10px] text-quality border border-quality/30 bg-quality/10 px-1.5 py-0.5 rounded">BEATS GOLDEN</span>}
                                            </p>
                                            <p className="text-xs text-text-secondary mt-1">Quality: <span className="font-mono text-white">{d.quality_score.toFixed(2)}</span></p>
                                            <p className="text-xs text-text-secondary">Energy: <span className="font-mono text-white">{d.energy_score.toFixed(2)}</span></p>
                                        </div>
                                    );
                                }}
                            />
                            {/* Highlight Region for Top performers approximately */}
                            <Scatter name="Batches" data={beatMissedData}>
                                {beatMissedData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.beat_golden ? '#D4855A' : '#3A2010'}
                                        r={entry.beat_golden ? 6 : 4}
                                    />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
