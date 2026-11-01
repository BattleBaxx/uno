import {useEffect, useState} from "react";

export function useNow(intervalMs: number | null): number {
    const [now, setNow] = useState(Date.now);

    useEffect(() => {
        if (intervalMs === null) {
            return;
        }
        const timer = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(timer);
    }, [intervalMs]);

    return now;
}
