import { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import PageHeader from '../components/PageHeader';
import PresetSelector from '../components/PresetSelector';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ParetoChart() {
    const { data: paretoRaw, loading: loadingPareto } = useData('pareto_data.json');
    const { data: golden, loading: loadingGolden } = useData('golden_signatures.json');

    const [activePreset, setActivePreset] = useState(2);

    // Custom weights for Preset 4
    const [customQualityWeight, setCustomQualityWeight] = useState(50);
    const customEnergyWeight = 100 - customQualityWeight;

    // Add the combined score based on active preset
    const paretoData = useMemo(() => {
        if (!paretoRaw) return [];

        return paretoRaw.map(b => {
            let combined = 0;
            if (activePreset === 1) {
                combined = b.quality_score; // Preset 1: 100% Quality
            } else if (activePreset === 2) {
                combined = (0.6 * b.quality_score) + (0.4 * b.energy_score); // Preset 2: 60/40
            } else if (activePreset === 3) {
                combined = b.energy_score; // Preset 3: 100% Energy
            } else {
                combined = (customQualityWeight / 100) * b.quality_score + (customEnergyWeight / 100) * b.energy_score;
            }
            return { ...b, combined_score: combined };
        });
    }, [paretoRaw, activePreset, customQualityWeight, customEnergyWeight]);

    const currentGoldenBatchId = useMemo(() => {
        if (!golden || !paretoData.length) return null;
        if (activePreset === 1) return golden.preset_1?.golden_batch_id;
        if (activePreset === 2) return golden.preset_2?.golden_batch_id;
        if (activePreset === 3) return golden.preset_3?.golden_batch_id;

        // For preset 4, dynamcially find max combined score
        const best = [...paretoData].reduce((max, current) => current.combined_score > max.combined_score ? current : max);
        return best.batch_id;
    }, [golden, paretoData, activePreset]);

    const paretoFrontierPathData = useMemo(() => {
        // To draw the line, filter pareto frontier points and sort by quality (which will naturally sort energy inverse)
        if (!paretoData) return [];
        return [...paretoData]
            .filter(d => d.is_pareto_frontier)
            .sort((a, b) => a.quality_score - b.quality_score);
    }, [paretoData]);

    if (loadingPareto || loadingGolden) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="pb-10">
            <PageHeader
                title="Pareto Chart View"
                description="Analyze the trade-off between Quality and Energy. Batches on the orange line represent the optimal frontier."
            />

            {/* Controls Row */}
            <div className="bg-card border border-card-border rounded-xl p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <p className="text-xs uppercase tracking-wider text-text-secondary mb-3">Select Optimization Preset</p>
                    <PresetSelector value={activePreset} onChange={setActivePreset} showPreset4={true} />
                </div>

                {activePreset === 4 && (
                    <div className="flex-1 max-w-md bg-page rounded-lg p-4 border border-card-border animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between text-sm mb-2 font-mono">
                            <span className="text-quality">Quality: {customQualityWeight}%</span>
                            <span className="text-energy">Energy: {customEnergyWeight}%</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="100"
                            value={customQualityWeight}
                            onChange={(e) => setCustomQualityWeight(parseInt(e.target.value))}
                            className="w-full h-2 bg-card-border rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <p className="text-[10px] text-text-secondary mt-2 text-center">Slide to adjust weights and see real-time golden batch recomputation</p>
                    </div>
                )}
            </div>

            {/* Main Scatter Chart */}
            <div className="bg-card border border-card-border rounded-xl p-6 mb-6">
                <h3 className="chart-title mb-1">Quality vs Energy Output</h3>
                <p className="chart-subtitle mb-6">Scatterplot of all batches. Golden Batch in orange; Pareto Optimal frontier in blue.</p>
                <ResponsiveContainer width="100%" height={450}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            type="number"
                            dataKey="quality_score"
                            name="Quality Score"
                            domain={['dataMin - 2', 100]}
                            tick={{ fontSize: 11 }}
                            label={{ value: "Quality Score (Higher = Better)", position: "bottom", offset: 0, style: { fill: '#6B7280', fontSize: 12 } }}
                        />
                        <YAxis
                            type="number"
                            dataKey="energy_score"
                            name="Energy Score"
                            domain={[0, 100]}
                            tick={{ fontSize: 11 }}
                            label={{ value: "Energy Score", angle: -90, position: "insideLeft", style: { fill: '#6B7280', fontSize: 12 } }}
                        />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-card border border-card-border rounded-lg p-4 shadow-xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <p className="font-mono font-bold text-primary-light">{d.batch_id}</p>
                                            {d.batch_id === currentGoldenBatchId && <span className="text-[10px] bg-golden/20 text-golden px-2 py-0.5 rounded-full border border-golden">GOLDEN</span>}
                                            {d.is_pareto_frontier && <span className="text-[10px] bg-alert-orange/20 text-alert-orange px-2 py-0.5 rounded-full">FRONTIER</span>}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-text-secondary">Quality: <span className="text-quality font-mono float-right ml-4">{d.quality_score.toFixed(2)}</span></p>
                                            <p className="text-xs text-text-secondary">Energy Score: <span className="text-energy font-mono float-right ml-4">{d.energy_score.toFixed(2)}</span></p>
                                            <p className="text-xs text-text-secondary">Energy kW/h: <span className="text-text-primary font-mono float-right ml-4">{d.total_energy_kwh.toFixed(1)}</span></p>
                                            <div className="border-t border-card-border pt-1 mt-1">
                                                <p className="text-xs text-text-secondary font-medium">Combined (P{activePreset}): <span className="text-primary-light font-mono float-right ml-4">{d.combined_score.toFixed(2)}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }}
                        />

                        {/* Pareto Frontier Line */}
                        <Scatter
                            data={paretoFrontierPathData}
                            line={{ stroke: '#7AB0D4', strokeWidth: 2 }}
                            shape={() => <></>}
                            isAnimationActive={false}
                        />

                        {/* All Batches Dots */}
                        <Scatter name="Batches" data={paretoData}>
                            {paretoData.map((entry) => (
                                <Cell
                                    key={entry.batch_id}
                                    fill={entry.batch_id === currentGoldenBatchId ? '#D4855A' : (entry.is_pareto_frontier ? '#7AB0D4' : '#6B4030')}
                                    r={entry.batch_id === currentGoldenBatchId ? 8 : (entry.is_pareto_frontier ? 5 : 4)}
                                    stroke={entry.batch_id === currentGoldenBatchId ? '#F5EDE0' : 'none'}
                                    strokeWidth={2}
                                    className="transition-all duration-300 pointer-events-none"
                                />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>

            {/* Top 5 Batches Table */}
            <div className="bg-card border border-card-border rounded-xl flex flex-col">
                <div className="px-6 py-5 border-b border-card-border">
                    <h3 className="chart-title">Top 5 Matches for Current Weights</h3>
                    <p className="chart-subtitle">Highest combined score matches based on the selected priority preset.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-page/50">
                            <tr className="border-b border-card-border">
                                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Rank</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Batch ID</th>
                                <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Combined Score</th>
                                <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Quality Score</th>
                                <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Energy Score</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...paretoData]
                                .sort((a, b) => b.combined_score - a.combined_score)
                                .slice(0, 5)
                                .map((b, i) => (
                                    <tr key={b.batch_id} className={`border-b border-card-border/50 transition-colors ${i === 0 ? 'bg-primary/5' : 'hover:bg-white/[0.02]'}`}>
                                        <td className="px-6 py-4 font-mono text-text-muted">#{i + 1}</td>
                                        <td className="px-6 py-4 font-mono text-primary-light font-medium">
                                            {b.batch_id}
                                            {i === 0 && <span className="ml-2 text-[10px] text-golden bg-golden/10 border border-golden/30 px-1.5 py-0.5 rounded-full">GOLDEN</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-primary">{b.combined_score.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-quality">{b.quality_score.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-energy">{b.energy_score.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-xs">
                                            {b.is_pareto_frontier ? <span className="text-alert-orange">Pareto Optimal</span> : <span className="text-text-muted">Dominated</span>}
                                        </td>
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
