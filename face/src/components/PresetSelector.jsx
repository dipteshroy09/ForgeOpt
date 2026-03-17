export default function PresetSelector({ value, onChange, showPreset4 = false }) {
    const presets = [
        { id: 1, label: 'Preset 1', desc: 'Best Quality' },
        { id: 2, label: 'Preset 2', desc: 'Balanced (60/40)' },
        { id: 3, label: 'Preset 3', desc: 'Lowest Energy' },
    ];

    if (showPreset4) {
        presets.push({ id: 4, label: 'Preset 4', desc: 'Custom Weights' });
    }

    return (
        <div className="flex flex-wrap items-center gap-4">
            {presets.map(p => (
                <button
                    key={p.id}
                    onClick={() => onChange(p.id)}
                    className={`group relative flex flex-col items-start min-w-[140px] px-5 py-3 rounded-xl border transition-all duration-300 ease-out cursor-pointer overflow-hidden
            ${value === p.id
                            ? 'bg-primary/10 border-primary/40 shadow-[0_4px_20px_rgba(196,115,58,0.15)] scale-[1.02]'
                            : 'bg-page/40 border-card-border hover:bg-card hover:border-primary/30 hover:scale-[1.01]'
                        }`}
                >
                    {value === p.id && (
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-70" />
                    )}
                    <span className={`block font-medium text-sm mb-1 transition-colors ${value === p.id ? 'text-primary-light' : 'text-text-secondary group-hover:text-text-primary'}`}>
                        {p.label}
                    </span>
                    <span className={`block text-[11px] tracking-wide uppercase transition-colors ${value === p.id ? 'text-text-primary' : 'text-text-muted group-hover:text-text-secondary'}`}>
                        {p.desc}
                    </span>
                </button>
            ))}
        </div>
    );
}
