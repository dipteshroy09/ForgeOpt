import { useState, useEffect } from 'react';

export function useData(filename) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        fetch(`/data/${filename}`)
            .then(res => {
                if (!res.ok) throw new Error(`Failed to load ${filename}: ${res.status}`);
                return res.json();
            })
            .then(json => {
                if (!cancelled) {
                    setData(json);
                    setLoading(false);
                }
            })
            .catch(err => {
                if (!cancelled) {
                    setError(err.message);
                    setLoading(false);
                    console.error(`useData(${filename}):`, err);
                }
            });

        return () => { cancelled = true; };
    }, [filename]);

    return { data, loading, error };
}
