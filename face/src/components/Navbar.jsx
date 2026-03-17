import { NavLink } from 'react-router-dom';

const navItems = [
    {
        path: '/', label: 'Dashboard',
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
        )
    },
    {
        path: '/pareto', label: 'Pareto Chart',
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M5 9.2h3V19H5V9.2zm5.6-4.2h2.8v14h-2.8V5zm5.6 8h2.8v6h-2.8v-6z" />
            </svg>
        )
    },
    {
        path: '/golden-signature', label: 'Golden Signature',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
        )
    },
    {
        path: '/comparison', label: 'Batch Comparison',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
        )
    },
    {
        path: '/live-monitor', label: 'Live Monitor',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h3l3-9 4 18 3-9h5" />
            </svg>
        )
    },
    {
        path: '/hitl', label: 'HITL Panel',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        )
    },
    {
        path: '/decision-log', label: 'Decision Log',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
        )
    },
    {
        path: '/impact', label: 'Impact Report',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
        )
    },
];

export default function Navbar() {
    return (
        <aside
            className="fixed left-0 top-3 w-60 flex flex-col z-50 rounded-tr-xl"
            style={{
                height: 'calc(100vh - 0.75rem)',
                background: 'linear-gradient(180deg, #100804 0%, #180E06 60%, #0F0703 100%)',
                borderRight: '1px solid rgba(196,115,58,0.2)',
                borderTop: '1px solid rgba(196,115,58,0.2)',
            }}
        >
            {/* Dot-grid texture overlay */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(13,148,136,0.08) 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                }}
            />

            {/* Top glow */}
            <div
                className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(196,115,58,0.15) 0%, transparent 70%)' }}
            />

            {/* Logo / Header */}
            <div className="relative px-4 pt-[12px] pb-5" style={{ borderBottom: '1px solid rgba(196,115,58,0.15)' }}>
                <div className="flex items-center gap-3">
                    <div
                        className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                        style={{
                            background: 'linear-gradient(135deg, rgba(196,115,58,0.3) 0%, rgba(196,115,58,0.1) 100%)',
                            border: '1px solid rgba(196,115,58,0.5)',
                            boxShadow: '0 0 20px rgba(196,115,58,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                        }}
                    >
                        <img src="/logo.png" alt="ForgeOpt Logo" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h1
                            className="text-2xl font-bold tracking-wide"
                            style={{
                                background: 'linear-gradient(90deg, #F0A06A 0%, #FFFFFF 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                fontFamily: "'Orbitron', sans-serif"
                            }}
                        >
                            ForgeOpt
                        </h1>
                        <p className="text-sm font-medium" style={{ color: 'rgba(240,160,106,0.85)' }}>Manufacturing AI</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="relative flex-1 px-3 py-5 overflow-y-auto flex flex-col">
                {/* Individual pill buttons with spacing */}
                <div className="flex flex-col gap-1.5 flex-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className="flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 relative group"
                            style={({ isActive }) => ({
                                background: isActive
                                    ? 'linear-gradient(90deg, rgba(196,115,58,0.4) 0%, rgba(196,115,58,0.15) 100%)'
                                    : 'rgba(255,255,255,0.02)',
                                border: isActive
                                    ? '1px solid rgba(196,115,58,0.45)'
                                    : '1px solid rgba(196,115,58,0.1)',
                                boxShadow: isActive ? '0 2px 16px rgba(196,115,58,0.12), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                            })}
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Left accent for active */}
                                    {isActive && (
                                        <div
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                            style={{ background: '#C4733A', boxShadow: '0 0 10px #C4733A' }}
                                        />
                                    )}

                                    {/* Icon */}
                                    <span
                                        className="shrink-0 transition-all duration-200"
                                        style={{
                                            color: isActive ? '#D4855A' : 'rgba(196,115,58,0.55)',
                                            filter: isActive ? 'drop-shadow(0 0 5px rgba(212,133,90,0.7))' : 'none',
                                        }}
                                    >
                                        {item.icon}
                                    </span>

                                    {/* Label */}
                                    <span
                                        className="flex-1 text-sm font-medium tracking-wide truncate"
                                        style={{ color: isActive ? '#f0fdf4' : 'rgba(180,210,210,0.65)' }}
                                    >
                                        {item.label}
                                    </span>

                                    {/* Chevron for active */}
                                    {isActive && (
                                        <svg
                                            className="w-3.5 h-3.5 shrink-0"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#14B8A6"
                                            strokeWidth="2.5"
                                            style={{ filter: 'drop-shadow(0 0 4px rgba(20,184,166,0.6))' }}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>

                {/* System Active — positioned above the bottom, inside nav */}
                <div className="mt-6 mb-2 px-1">
                    <div
                        className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                        style={{
                            background: 'rgba(34,197,94,0.05)',
                            border: '1px solid rgba(34,197,94,0.15)',
                        }}
                    >
                        <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                                background: '#22C55E',
                                boxShadow: '0 0 8px #22C55E',
                                animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
                            }}
                        />
                        <span className="text-xs font-medium" style={{ color: 'rgba(180,220,180,0.7)' }}>
                            System Active
                        </span>
                    </div>
                </div>
            </nav>
        </aside>
    );
}
