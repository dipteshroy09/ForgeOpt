import { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import PageHeader from '../components/PageHeader';
import PresetSelector from '../components/PresetSelector';
import KPICard from '../components/KPICard';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';

export default function BatchComparison() {
    const { data: batches, loading: loadingBatches } = useData('all_batches.json');
    const { data: goldenData, loading: loadingGolden } = useData('golden_signatures.json');

    const [activePreset, setActivePreset] = useState(2);
    const [selectedBatchId, setSelectedBatchId] = useState('T005');

    const golden = useMemo(() => goldenData?.[`preset_${activePreset}`], [goldenData, activePreset]);
    const actual = useMemo(() => batches?.find(b => b.batch_id === selectedBatchId), [batches, selectedBatchId]);

    // Layer 1: Settings Comparison
    const settingsDiff = useMemo(() => {
        if (!golden || !actual) return [];
        return Object.keys(golden.layer1_settings).map(key => {
            const gVal = golden.layer1_settings[key];
            const aVal = actual.layer1_settings[key];
            const diff = aVal - gVal;
            return {
                parameter: key.replace('_', ' '),
                golden: parseFloat(gVal.toFixed(2)),
                actual: parseFloat(aVal.toFixed(2)),
                diff: parseFloat(diff.toFixed(2)),
                isPositive: diff > 0,
                isZero: Math.abs(diff) < 0.01
            };
        });
    }, [golden, actual]);

    // Layer 2: Phase Deviations (Radar Chart) using Power Consumption
    const radarData = useMemo(() => {
        if (!golden || !actual) return [];
        return Object.keys(golden.layer2_fingerprint).map(phase => {
            return {
                phase: phase.substring(0, 4), // Short label for radar
                golden: parseFloat(golden.layer2_fingerprint[phase].Power_Consumption_kW.toFixed(1)),
                actual: parseFloat(actual.layer2_fingerprint[phase].Power_Consumption_kW.toFixed(1))
            };
        });
    }, [golden, actual]);

    // Layer 3: Quality Difference (Grouped Bar Chart)
    const qualityDiffData = useMemo(() => {
        if (!golden || !actual) return [];
        // Use actual batch quality_metrics directly (not nested under layer3_outcome)
        const goldenMetrics = golden.layer3_outcome?.quality_metrics || {};
        const actualMetrics = actual.quality_metrics || {};
        const allKeys = Object.keys(actualMetrics);
        return allKeys.map(metric => {
            const gVal = goldenMetrics[metric] ?? actualMetrics[metric];
            const aVal = actualMetrics[metric];
            return {
                metric: metric.replace(/_/g, ' '),
                golden: parseFloat((gVal ?? 0).toFixed(1)),
                actual: parseFloat((aVal ?? 0).toFixed(1))
            };
        });
    }, [golden, actual]);

    if (loadingBatches || loadingGolden) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!golden || !actual) return null;

    return (
        <div className="pb-10">
            <div className="flex justify-between items-start mb-8">
                <PageHeader
                    title="Batch Comparison View"
                    description="Side-by-side analysis of any batch against the optimal golden signature."
                />
                <div className="flex gap-4">
                    <div className="bg-card border border-card-border p-2 rounded-xl flex items-center gap-3">
                        <span className="text-xs text-text-secondary pl-2 uppercase font-semibold tracking-wider">Target:</span>
                        <PresetSelector value={activePreset} onChange={setActivePreset} />
                    </div>
                    <div className="bg-card border border-primary/30 p-2 rounded-xl flex items-center gap-3">
                        <span className="text-xs text-primary pl-2 uppercase font-semibold tracking-wider">Compare:</span>
                        <select
                            value={selectedBatchId}
                            onChange={(e) => setSelectedBatchId(e.target.value)}
                            className="bg-page border border-card-border text-primary-light font-mono text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer"
                        >
                            {batches?.map(b => (
                                <option key={b.batch_id} value={b.batch_id}>{b.batch_id} (Q: {b.quality_score.toFixed(0)})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* KPI Comparison Row */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <KPICard label={`Target Q-Score (${golden.golden_batch_id})`} value={(golden.layer3_outcome?.quality_score ?? golden.quality_score ?? 0).toFixed(2)} color="quality" mono />
                <KPICard label={`Actual Q-Score (${actual.batch_id})`} value={actual.quality_score.toFixed(2)} color={actual.quality_score >= (golden.layer3_outcome?.quality_score ?? 0) ? 'green' : 'orange'} mono />
                <KPICard label={`Target Energy (${golden.golden_batch_id})`} value={(golden.layer3_outcome?.total_energy_kwh ?? 0).toFixed(1)} subtitle="kWh" color="energy" mono />
                <KPICard label={`Actual Energy (${actual.batch_id})`} value={actual.total_energy_kwh.toFixed(1)} subtitle="kWh" color={actual.total_energy_kwh <= (golden.layer3_outcome?.total_energy_kwh ?? Infinity) ? 'green' : 'red'} mono />
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
                {/* Radar Chart: Phase Deviation */}
                <div className="bg-card border border-card-border rounded-xl p-6 flex flex-col items-center">
                    <h3 className="chart-title self-start mb-1 border-l-2 border-primary pl-3">Power Signature by Phase</h3>
                    <p className="chart-subtitle self-start mb-5 pl-3">Visualizing energy drift across the 8 manufacturing phases.</p>
                    <ResponsiveContainer width="100%" height={350}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="rgba(255,255,255,0.05)" />
                            <PolarAngleAxis dataKey="phase" tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                            <RechartsTooltip
                                contentStyle={{ background: '#1A1008', border: '1px solid #2E1C0C', borderRadius: 8, fontFamily: 'JetBrains Mono' }}
                                itemStyle={{ fontSize: 13 }}
                            />
                            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                            <Radar name={`Golden (${golden.golden_batch_id})`} dataKey="golden" stroke="#0D9488" fill="#0D9488" fillOpacity={0.2} strokeWidth={2} />
                            <Radar name={`Actual (${actual.batch_id})`} dataKey="actual" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} strokeWidth={2} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* Layer 1 Settings Diff Table */}
                <div className="bg-card border border-card-border rounded-xl overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-card-border">
                        <h3 className="chart-title border-l-2 border-primary pl-3">Initial Settings Variance</h3>
                        <p className="chart-subtitle pl-3">How the machine was configured vs the recommended settings.</p>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-page/50">
                                <tr className="border-b border-card-border">
                                    <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary uppercase">Parameter</th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase">Golden</th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase">Actual</th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase">Delta</th>
                                </tr>
                            </thead>
                            <tbody>
                                {settingsDiff.map((row, i) => (
                                    <tr key={i} className="border-b border-card-border/30 hover:bg-white/[0.02]">
                                        <td className="px-6 py-3 text-text-primary text-xs">{row.parameter}</td>
                                        <td className="px-6 py-3 text-right font-mono text-primary-light">{row.golden}</td>
                                        <td className="px-6 py-3 text-right font-mono text-text-primary">{row.actual}</td>
                                        <td className={`px-6 py-3 text-right font-mono font-medium ${row.isZero ? 'text-text-muted' : (row.isPositive ? 'text-alert-red' : 'text-alert-green')}`}>
                                            {row.isZero ? '0.00' : (row.isPositive ? `+${row.diff}` : row.diff)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Quality Match Breakdown */}
            <div className="bg-card border border-card-border rounded-xl p-6">
                <h3 className="chart-title mb-1 border-l-2 border-primary pl-3">Quality Attributes Match</h3>
                <p className="chart-subtitle mb-6 pl-3">Comparing the 5 physical drug properties between golden target and selected batch.</p>

                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={qualityDiffData} margin={{ top: 5, right: 30, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <RechartsTooltip
                            cursor={{ fill: '#FFFFFF05' }}
                            contentStyle={{ background: '#1A1008', border: '1px solid #2E1C0C', borderRadius: 8, fontFamily: 'JetBrains Mono' }}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="golden" name={`Golden (${golden.golden_batch_id})`} fill="#D4855A" radius={[2, 2, 0, 0]} barSize={30} />
                        <Bar dataKey="actual" name={`Actual (${actual.batch_id})`} fill="#7AB0D4" radius={[2, 2, 0, 0]} barSize={30} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
