import { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

/* ─────────────────────────────────────────────────────────
   Animated counter hook – counts from 0 to `target`
───────────────────────────────────────────────────────── */
function useAnimatedNumber(target, duration = 900) {
    const [current, setCurrent] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
        const num = parseFloat(target);
        if (isNaN(num)) { setCurrent(target); return; }

        const start = performance.now();
        const step = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
            setCurrent((num * eased).toFixed(typeof target === 'number' ? 0 : String(target).includes('.') ? String(target).split('.')[1].length : 0));
            if (t < 1) rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target, duration]);

    return String(target).match(/[a-zA-Z%]/) ? target : current;
}

/* ─────────────────────────────────────────────────────────
   Tiny sparkline SVG – no library needed
───────────────────────────────────────────────────────── */
function Sparkline({ data, color, height = 40 }) {
    if (!data || data.length < 2) return null;
    const w = 100; const h = height;
    const min = Math.min(...data); const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => [
        (i / (data.length - 1)) * w,
        h - ((v - min) / range) * (h - 4) - 2,
    ]);
    const polyline = pts.map(p => p.join(',')).join(' ');
    const area = `M${pts[0][0]},${h} ` + pts.map(p => `L${p[0]},${p[1]}`).join(' ') + ` L${pts[pts.length - 1][0]},${h} Z`;

    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
            <defs>
                <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#sg-${color.replace('#', '')})`} />
            <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            {/* Last dot */}
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
        </svg>
    );
}

/* ─────────────────────────────────────────────────────────
   Trend badge
───────────────────────────────────────────────────────── */
function TrendBadge({ trend }) {
    if (!trend) return null;
    const up = trend > 0;
    return (
        <span
            className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto"
            style={{
                background: up ? 'rgba(212,133,90,0.15)' : 'rgba(122,176,212,0.15)',
                color: up ? '#D4855A' : '#7AB0D4',
                border: `1px solid ${up ? 'rgba(212,133,90,0.3)' : 'rgba(122,176,212,0.3)'}`,
            }}
        >
            {up ? '▲' : '▼'} {Math.abs(trend)}%
        </span>
    );
}

/* ─────────────────────────────────────────────────────────
   Main KPICard
───────────────────────────────────────────────────────── */
export default function KPICard({
    label,
    value,
    subtitle,
    color = 'primary',
    mono = false,
    icon,
    sparkline,   // array of numbers for mini chart
    trend,       // number: positive = up, negative = down
    unit,        // optional unit string appended after value
}) {
    const [hovered, setHovered] = useState(false);

    const colorMap = {
        primary: { accent: '#C4733A', glow: 'rgba(196,115,58,0.25)', text: '#D4855A', border: 'rgba(196,115,58,' },
        quality: { accent: '#D4855A', glow: 'rgba(212,133,90,0.25)', text: '#D4855A', border: 'rgba(212,133,90,' },
        energy: { accent: '#7AB0D4', glow: 'rgba(122,176,212,0.25)', text: '#7AB0D4', border: 'rgba(122,176,212,' },
        golden: { accent: '#D4855A', glow: 'rgba(212,133,90,0.25)', text: '#D4855A', border: 'rgba(212,133,90,' },
        green: { accent: '#22C55E', glow: 'rgba(34,197,94,0.25)', text: '#22C55E', border: 'rgba(34,197,94,' },
        orange: { accent: '#E28A4A', glow: 'rgba(226,138,74,0.25)', text: '#E28A4A', border: 'rgba(226,138,74,' },
        red: { accent: '#EF4444', glow: 'rgba(239,68,68,0.25)', text: '#EF4444', border: 'rgba(239,68,68,' },
    };
    const c = colorMap[color] || colorMap.primary;
    const animated = useAnimatedNumber(value);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: hovered
                    ? `linear-gradient(135deg, #1A1008 0%, #221508 100%)`
                    : '#1A1008',
                border: `1px solid ${c.border}${hovered ? '0.45)' : '0.18)'}`,
                borderLeft: `3px solid ${c.accent}`,
                borderRadius: '14px',
                padding: '18px 20px 14px',
                cursor: 'default',
                transition: 'all 0.25s ease',
                boxShadow: hovered
                    ? `0 8px 32px ${c.glow}, 0 0 0 1px ${c.border}0.1)`
                    : '0 2px 8px rgba(0,0,0,0.3)',
                transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Background shimmer on hover */}
            {hovered && (
                <div
                    style={{
                        position: 'absolute', inset: 0,
                        background: `radial-gradient(ellipse at 0% 0%, ${c.glow} 0%, transparent 70%)`,
                        pointerEvents: 'none',
                    }}
                />
            )}

            {/* Label row */}
            <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: c.accent }}>
                    {label}
                </p>
                {trend !== undefined && <TrendBadge trend={trend} />}
            </div>

            {/* Value */}
            <p
                className={`text-2xl font-bold leading-tight mb-0.5 ${mono ? 'font-mono' : ''}`}
                style={{ color: c.text }}
            >
                {animated}{unit ? <span className="text-base ml-1 font-semibold opacity-80">{unit}</span> : ''}
            </p>

            {/* Subtitle */}
            {subtitle && (
                <p className="text-xs mt-0.5" style={{ color: 'rgba(138,112,96,0.8)' }}>
                    {subtitle}
                </p>
            )}

            {/* Sparkline */}
            {sparkline && sparkline.length > 1 && (
                <div className="mt-3 -mx-1">
                    <Sparkline data={sparkline} color={c.accent} height={36} />
                </div>
            )}

            {/* Bottom accent line */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    height: '1px',
                    background: `linear-gradient(90deg, ${c.accent}40 0%, transparent 100%)`,
                }}
            />
        </div>
    );
}
