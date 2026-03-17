export default function PageHeader({ title, description }) {
    return (
        <div
            className="mb-10 relative"
            style={{ paddingLeft: '16px', paddingTop: '12px' }}
        >
            {/* Left accent bar */}
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: '4px',
                    bottom: description ? '4px' : '6px',
                    width: '3px',
                    borderRadius: '2px',
                    background: 'linear-gradient(180deg, #D4855A 0%, #7AB0D4 100%)',
                    boxShadow: '0 0 10px rgba(212,133,90,0.5)',
                }}
            />

            {/* Gradient title */}
            <h1
                className="font-extrabold tracking-tight leading-none"
                style={{
                    fontSize: '1.85rem',
                    background: 'linear-gradient(90deg, #E28A4A 0%, #FFFFFF 45%, #9FC5E8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '-0.02em',
                    fontFamily: "'Orbitron', sans-serif",
                    textShadow: 'none',
                }}
            >
                {title}
            </h1>

            {description && (
                <p
                    className="text-sm mt-1.5"
                    style={{ color: 'rgba(230,220,210,0.9)', letterSpacing: '0.01em' }}
                >
                    {description}
                </p>
            )}

            {/* Bottom decoration line */}
            <div
                style={{
                    marginTop: '10px',
                    height: '1px',
                    background: 'linear-gradient(90deg, rgba(212,133,90,0.5) 0%, rgba(122,176,212,0.3) 50%, transparent 100%)',
                    borderRadius: '1px',
                }}
            />
        </div>
    );
}
