import { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import PageHeader from '../components/PageHeader';
import PresetSelector from '../components/PresetSelector';
import KPICard from '../components/KPICard';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

export default function GoldenSignature() {
    const { data: goldenData, loading: loadingGolden } = useData('golden_signatures.json');
    const { data: batches, loading: loadingBatches } = useData('all_batches.json');

    const [activePreset, setActivePreset] = useState(2);

    const currentGolden = useMemo(() => {
        if (!goldenData) return null;
        return goldenData[`preset_${activePreset}`];
    }, [goldenData, activePreset]);

    // Layer 1: Settings Normalization
    const layer1Data = useMemo(() => {
        if (!currentGolden || !batches) return [];

        // Find min max for each metric across all batches to normalize 0-100%
        const metrics = Object.keys(currentGolden.layer1_settings);
        const bounds = {};

        metrics.forEach(m => {
            const values = batches.map(b => b.layer1_settings[m]);
            bounds[m] = { min: Math.min(...values), max: Math.max(...values) };
        });

        return metrics.map(m => {
            const raw = currentGolden.layer1_settings[m];
            const { min, max } = bounds[m];
            const range = max - min;
            const normalized = range === 0 ? 50 : ((raw - min) / range) * 100;

            return {
                name: m.replace('_', ' '),
                raw: parseFloat(raw.toFixed(2)),
                normalized: Math.max(5, Math.min(95, normalized)), // Ensure bar is visible but not touching end
                min: parseFloat(min.toFixed(2)),
                max: parseFloat(max.toFixed(2))
            };
        });
    }, [currentGolden, batches]);

    // Layer 2: Fingerprint Normalization
    const layer2ChartData = useMemo(() => {
        if (!currentGolden || !batches) return [];

        const fingerprint = currentGolden.layer2_fingerprint;
        const phases = Object.keys(fingerprint);
        const sensors = ['Temperature_C', 'Pressure_Bar', 'Humidity_Percent', 'Motor_Speed_RPM'];

        // Find global max across all phases for these sensors so we can normalize to 0-100% easily
        const maxs = {};
        sensors.forEach(s => {
            maxs[s] = Math.max(...batches.map(b => Math.max(...Object.values(b.layer2_fingerprint).map(ph => ph[s]))));
        });

        return phases.map(phase => {
            const data = { phase };
            sensors.forEach(s => {
                const raw = fingerprint[phase][s];
                // Normalize 0-100 based on global max
                data[`${s}_norm`] = (raw / (maxs[s] || 1)) * 100;
                data[`${s}_raw`] = raw;
            });
            return data;
        });
    }, [currentGolden, batches]);

    // Layer 3: Quality Pie Chart Data
    const qualityPieData = useMemo(() => {
        if (!currentGolden) return [];
        const qm = currentGolden.layer3_outcome.quality_metrics;
        return [
            { name: 'Dissolution', value: parseFloat(qm.Dissolution_Rate.toFixed(1)), color: '#D4855A' },
            { name: 'Uniformity', value: parseFloat(qm.Content_Uniformity.toFixed(1)), color: '#7AB0D4' },
            { name: 'Friability (Inv)', value: parseFloat(((2 - qm.Friability) * 50).toFixed(1)), color: '#C46840' },
            { name: 'Disintegration (Inv)', value: parseFloat(((15 - qm.Disintegration_Time) * 6.66).toFixed(1)), color: '#5A90B4' },
            { name: 'Hardness (Rng)', value: parseFloat((100 - Math.abs(80 - qm.Hardness)).toFixed(1)), color: '#E0A080' },
        ];
    }, [currentGolden]);

    if (loadingGolden || loadingBatches) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!currentGolden) return null;

    return (
        <div className="pb-10">
            <div className="flex justify-between items-start mb-8">
                <PageHeader
                    title="Golden Signature Detail"
                    description="Complete 3-layer signature profile defining the optimal batch physics."
                />
                <div className="bg-card border border-primary/30 p-2 rounded-xl">
                    <PresetSelector value={activePreset} onChange={setActivePreset} />
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
                <KPICard label="Golden Batch ID" value={currentGolden.golden_batch_id} color="golden" mono />
                <KPICard label="Preset Name" value={currentGolden.preset_name.replace('Only', '').trim()} color="primary" />
                <KPICard label="Quality Score" value={currentGolden.layer3_outcome.quality_score.toFixed(2)} color="quality" mono />
                <KPICard label="Energy Score" value={currentGolden.layer3_outcome.energy_score.toFixed(2)} color="energy" mono />
            </div>

            <div className="flex flex-col gap-6">
                {/* Layer 1: Settings */}
                <div className="bg-card border border-card-border rounded-xl p-6">
                    <h3 className="chart-title mb-1 border-l-2 border-primary pl-3">Layer 1: Initial Machine Settings</h3>
                    <p className="chart-subtitle mb-5 pl-3">The exact physical configurations loaded before the batch runs (normalized to historical bounds).</p>

                    <div className="grid grid-cols-5 gap-6">
                        <div className="col-span-3 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={layer1Data} margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                                    <RechartsTooltip
                                        cursor={{ fill: '#FFFFFF05' }}
                                        contentStyle={{ background: '#1A1008', border: '1px solid #2E1C0C', borderRadius: 8 }}
                                        formatter={(val, name, props) => [`${props.payload.raw} (Range: ${props.payload.min}-${props.payload.max})`, 'Raw Value']}
                                    />
                                    <Bar dataKey="normalized" fill="#D4855A" radius={[0, 4, 4, 0]} barSize={14}>
                                        {layer1Data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#D4855A' : '#7AB0D4'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="col-span-2 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-card-border">
                                        <th className="text-left py-2 text-xs font-medium text-text-secondary uppercase">Parameter</th>
                                        <th className="text-right py-2 text-xs font-medium text-text-secondary uppercase">Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {layer1Data.map(d => (
                                        <tr key={d.name} className="border-b border-card-border/50 hover:bg-white/[0.02]">
                                            <td className="py-2.5 text-text-primary text-xs">{d.name}</td>
                                            <td className="py-2.5 text-right font-mono text-primary-light font-medium">{d.raw}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Layer 2: Process Fingerprint */}
                <div className="bg-card border border-card-border rounded-xl p-6">
                    <h3 className="chart-title mb-1 border-l-2 border-primary pl-3">Layer 2: Process Fingerprint</h3>
                    <p className="chart-subtitle mb-5 pl-3">The phase-by-phase physical execution trajectory defining exact environmental conditions.</p>

                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={layer2ChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="phase" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                            <RechartsTooltip
                                cursor={{ fill: '#FFFFFF05' }}
                                contentStyle={{ background: '#1A1008', border: '1px solid #2E1C0C', borderRadius: 8 }}
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-card border border-card-border rounded-lg p-3 shadow-xl">
                                            <p className="font-semibold text-text-primary text-sm mb-2">{label}</p>
                                            <p className="text-xs text-text-secondary">Temp: <span className="font-mono text-white ml-2">{d.Temperature_C_raw.toFixed(1)}°C</span></p>
                                            <p className="text-xs text-text-secondary">Pressure: <span className="font-mono text-white ml-2">{d.Pressure_Bar_raw.toFixed(2)} Bar</span></p>
                                            <p className="text-xs text-text-secondary">Speed: <span className="font-mono text-white ml-2">{d.Motor_Speed_RPM_raw.toFixed(0)} RPM</span></p>
                                            <p className="text-xs text-text-secondary">Humidity: <span className="font-mono text-white ml-2">{d.Humidity_Percent_raw.toFixed(1)}%</span></p>
                                        </div>
                                    );
                                }}
                            />
                            <Bar dataKey="Temperature_C_norm" name="Temperature" fill="#D4855A" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="Pressure_Bar_norm" name="Pressure" fill="#7AB0D4" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="Motor_Speed_RPM_norm" name="Motor Speed" fill="#C46840" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="Humidity_Percent_norm" name="Humidity" fill="#5A90B4" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Layer 3: Outcomes */}
                <div className="bg-card border border-card-border rounded-xl p-6">
                    <h3 className="chart-title mb-1 border-l-2 border-primary pl-3">Layer 3: Outcome Scorecard</h3>
                    <p className="chart-subtitle mb-5 pl-3">Final physical product characteristics and verified scoring metrics.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="col-span-1 min-h-[300px] rounded-2xl p-4 border border-card-border bg-card bg-gradient-to-b from-white/[0.04] to-transparent shadow-[0_8px_16px_rgba(0,0,0,0.4)] flex flex-col">
                            <div className="flex-1 w-full relative rounded-xl border border-black/50 bg-[#080503] shadow-[inset_0_8px_32px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={qualityPieData}
                                            innerRadius={75}
                                            outerRadius={105}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="transparent"
                                            strokeWidth={1}
                                            cornerRadius={2}
                                        >
                                            {qualityPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{ background: '#1A1008', border: '1px solid #2E1C0C', borderRadius: 8, zIndex: 50 }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                                    <span className="text-4xl sm:text-[42px] font-mono font-bold text-quality drop-shadow-md leading-none tracking-tight">{currentGolden.layer3_outcome.quality_score.toFixed(1)}</span>
                                    <span className="text-[11px] font-bold tracking-widest text-text-primary uppercase mt-2">Quality</span>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Object.entries(currentGolden.layer3_outcome.quality_metrics).map(([key, val]) => (
                                <div key={key} className="relative rounded-xl border border-card-border bg-card bg-gradient-to-b from-white/[0.05] to-transparent shadow-[0_8px_16px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col hover:border-primary/30 transition-colors">
                                    <div className="px-5 py-3 border-b border-black/40 bg-white/[0.02] text-center">
                                        <span className="text-base font-medium text-text-primary tracking-wide">{key.replace('_', ' ')}</span>
                                    </div>
                                    <div className="px-5 py-5 flex-1 flex justify-center items-center">
                                        <span className="text-4xl sm:text-[44px] font-mono text-primary-light font-bold drop-shadow-[0_2px_4px_rgba(212,133,90,0.3)]">{val.toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="relative rounded-xl border border-energy/30 bg-card bg-gradient-to-b from-energy/10 to-transparent shadow-[0_8px_16px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col">
                                <div className="px-5 py-3 border-b border-black/40 bg-white/[0.02] text-center">
                                    <span className="text-base font-medium text-energy tracking-wide">Total Energy (kWh)</span>
                                </div>
                                <div className="px-5 py-5 flex-1 flex justify-center items-center">
                                    <span className="text-4xl sm:text-[44px] font-mono text-energy font-bold drop-shadow-[0_2px_4px_rgba(122,176,212,0.3)]">{currentGolden.layer3_outcome.total_energy_kwh.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
