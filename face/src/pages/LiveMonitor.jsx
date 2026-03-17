import { useState, useMemo, useEffect } from 'react';
import { useData } from '../hooks/useData';
import PageHeader from '../components/PageHeader';
import KPICard from '../components/KPICard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const SPEEDS = {
    SLOW: 800,
    NORMAL: 400,
    FAST: 150
};

export default function LiveMonitor() {
    const { data: simData, loading: loadingSim } = useData('simulation_batch.json');
    const { data: goldenData, loading: loadingGolden } = useData('golden_signatures.json');

    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState('NORMAL');
    const [currentMinute, setCurrentMinute] = useState(0);

    const fullData = simData?.data || [];
    const goldenP2 = goldenData?.preset_2?.layer2_fingerprint;

    // Max minutes available
    const maxMinutes = fullData.length > 0 ? Math.max(...fullData.map(d => d.Time_Minutes)) : 120;

    // Real-time playback logic
    useEffect(() => {
        let interval;
        if (isPlaying && currentMinute <= maxMinutes) {
            interval = setInterval(() => {
                setCurrentMinute(prev => {
                    if (prev >= maxMinutes) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, SPEEDS[speed]);
        }
        return () => clearInterval(interval);
    }, [isPlaying, speed, maxMinutes, currentMinute]);

    // Normalize data for chart against Golden P2 for the active phase
    const chartData = useMemo(() => {
        if (!fullData.length || !goldenP2) return [];

        return fullData.slice(0, currentMinute + 1).map(d => {
            const gPhase = goldenP2[d.Phase];
            if (!gPhase) return d;

            // Safe division guards
            const tempG = gPhase.Temperature_C || 1;
            const presG = gPhase.Pressure_Bar || 1;
            const motrG = gPhase.Motor_Speed_RPM || 1;

            return {
                ...d,
                temp_norm: parseFloat(((d.Temperature_C / tempG) * 100).toFixed(1)),
                pres_norm: parseFloat(((d.Pressure_Bar / presG) * 100).toFixed(1)),
                motr_norm: parseFloat(((d.Motor_Speed_RPM / motrG) * 100).toFixed(1)),
                // Provide the golden standard flat line value
                golden_baseline: 100
            };
        });
    }, [fullData, currentMinute, goldenP2]);

    const currentReading = chartData.length > 0 ? chartData[chartData.length - 1] : null;

    if (loadingSim || loadingGolden) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!fullData.length || !goldenP2) return null;

    return (
        <div className="pb-10">
            <div className="flex justify-between items-start mb-8">
                <PageHeader
                    title="Live Batch Monitor"
                    description={`Real-time telemetry for active batch ${simData.simulation_batch_id}`}
                />

                {/* Playback Controls */}
                <div className="bg-card border border-card-border rounded-xl p-2 flex items-center gap-3">
                    <button
                        onClick={() => setCurrentMinute(0)}
                        className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                        title="Restart"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                        </svg>
                    </button>

                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`p-2.5 rounded-lg ${isPlaying ? 'bg-primary border-primary text-page' : 'bg-primary/20 border-primary text-primary-light'} border transition-colors`}
                    >
                        {isPlaying ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                        ) : (
                            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        )}
                    </button>

                    <div className="flex bg-page rounded-lg p-1 border border-card-border ml-2">
                        {['SLOW', 'NORMAL', 'FAST'].map(s => (
                            <button
                                key={s}
                                onClick={() => setSpeed(s)}
                                className={`px-3 py-1 text-xs font-mono rounded ${speed === s ? 'bg-card-border text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Live Readouts */}
            {currentReading && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-card border border-primary/30 rounded-xl p-5 border-l-[3px] border-l-primary flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-text-secondary mb-1">Time Elapsed</p>
                            <p className="text-2xl font-bold font-mono text-primary-light">{Math.floor(currentMinute / 60)}h {(currentMinute % 60).toString().padStart(2, '0')}m</p>
                        </div>
                        {isPlaying && <div className="w-3 h-3 rounded-full bg-alert-red animate-pulse" />}
                    </div>

                    <KPICard
                        label="Current Phase"
                        value={currentReading.Phase}
                        color="primary"
                    />
                    <KPICard
                        label="Temp Deviation"
                        value={`${currentReading.temp_norm.toFixed(1)}%`}
                        subtitle={`Raw: ${currentReading.Temperature_C.toFixed(1)}°C`}
                        color={Math.abs(100 - currentReading.temp_norm) > 15 ? 'orange' : 'green'}
                        mono
                    />
                    <KPICard
                        label="Pressure Deviation"
                        value={`${currentReading.pres_norm.toFixed(1)}%`}
                        subtitle={`Raw: ${currentReading.Pressure_Bar.toFixed(2)} Bar`}
                        color={Math.abs(100 - currentReading.pres_norm) > 15 ? 'orange' : 'green'}
                        mono
                    />
                </div>
            )}

            {/* Main Telemetry Chart */}
            <div className="bg-card border border-card-border rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="chart-title border-l-2 border-primary pl-3">Normalized Sensor Telemetry</h3>
                        <p className="chart-subtitle mt-1 pl-3">% variance against Golden Signature (Preset 2). Flat 100% = Perfect match.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <span className="w-3 h-0.5 bg-quality"></span> Temp
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <span className="w-3 h-0.5 bg-[#3B82F6]"></span> Pressure
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <span className="w-3 h-0.5 bg-alert-orange"></span> Motor Speed
                        </div>
                    </div>
                </div>

                <div className="w-full relative h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#D4855A" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#D4855A" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />

                            <XAxis
                                dataKey="Time_Minutes"
                                type="number"
                                domain={[0, maxMinutes]}
                                tick={{ fontSize: 11 }}
                                label={{ value: 'Time (Minutes)', position: 'bottom', offset: 0, style: { fill: '#6B7280', fontSize: 11 } }}
                            />
                            <YAxis
                                domain={[0, 200]}
                                tick={{ fontSize: 11 }}
                                tickFormatter={(val) => `${val}%`}
                            />

                            <RechartsTooltip
                                contentStyle={{ background: '#1A1008', border: '1px solid #2E1C0C', borderRadius: 8, fontFamily: 'JetBrains Mono' }}
                                cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                                labelFormatter={(val) => `Minute ${val}`}
                            />

                            <ReferenceLine y={100} stroke="#D4855A" strokeDasharray="5 5" label={{ value: 'GOLDEN (100%)', position: 'insideTopLeft', fill: '#D4855A', fontSize: 10 }} />

                            <Area type="monotone" dataKey="temp_norm" name="Temperature %" stroke="#D4855A" fillOpacity={1} fill="url(#colorTemp)" isAnimationActive={false} />
                            <Area type="monotone" dataKey="pres_norm" name="Pressure %" stroke="#7AB0D4" fill="transparent" strokeWidth={2} isAnimationActive={false} />
                            <Area type="monotone" dataKey="motr_norm" name="Motor Speed %" stroke="#E28A4A" fill="transparent" strokeWidth={2} isAnimationActive={false} />

                        </AreaChart>
                    </ResponsiveContainer>

                    {/* Scrubber overlay */}
                    <input
                        type="range"
                        min="0"
                        max={maxMinutes}
                        value={currentMinute}
                        onChange={(e) => {
                            setCurrentMinute(parseInt(e.target.value));
                            setIsPlaying(false);
                        }}
                        className="w-[calc(100%-80px)] absolute bottom-0 left-[60px] cursor-pointer opacity-0 hover:opacity-100 z-10"
                    />
                </div>
            </div>
        </div>
    );
}
