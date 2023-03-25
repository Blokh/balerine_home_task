import { useState, useCallback } from 'react';

export function useForceUpdate() {
    const [, setTick] = useState(0);
    const update = useCallback(() => {
        setTick((unnecessaryNumber) => unnecessaryNumber + 1);
    }, []);
    return update;
}