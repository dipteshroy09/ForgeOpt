const bands = {
    GREEN: { bg: 'bg-alert-green/20', border: 'border-alert-green', text: 'text-alert-green', label: 'GREEN' },
    YELLOW: { bg: 'bg-alert-yellow/20', border: 'border-alert-yellow', text: 'text-alert-yellow', label: 'YELLOW' },
    ORANGE: { bg: 'bg-alert-orange/20', border: 'border-alert-orange', text: 'text-alert-orange', label: 'ORANGE' },
    RED: { bg: 'bg-alert-red/20', border: 'border-alert-red', text: 'text-alert-red', label: 'RED' },
};

export function getDeviationBand(percent) {
    if (percent < 10) return 'GREEN';
    if (percent < 20) return 'YELLOW';
    if (percent < 30) return 'ORANGE';
    return 'RED';
}

export function getDeviationColor(band) {
    const colors = {
        GREEN: '#22C55E',
        YELLOW: '#EAB308',
        ORANGE: '#F97316',
        RED: '#EF4444',
    };
    return colors[band] || colors.GREEN;
}

export default function DeviationBadge({ band, value }) {
    const style = bands[band] || bands.GREEN;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.border} ${style.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${band === 'GREEN' ? 'bg-alert-green' : band === 'YELLOW' ? 'bg-alert-yellow' : band === 'ORANGE' ? 'bg-alert-orange' : 'bg-alert-red'}`} />
            {value !== undefined ? `${value.toFixed(1)}%` : style.label}
        </span>
    );
}
