import { useEffect, useState } from "react";

const useFetch = <T>(fetchFunction: () => Promise<T>, autoFetch = true) => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await fetchFunction();
            setData(result);
            return result;
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An unknown error occurred')
            return null;
        } finally {
            setLoading(false);
        }
    }

    const silentRefetch = async () => {
        try {
            const result = await fetchFunction();
            setData(result);
            return result;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    const reset = () => {
        setData(null);
        setError(null);
        setLoading(false);
    }

    useEffect(() => {
        if (autoFetch) {
            fetchData();
        }
    }, [])

    return { data, loading, error, refetch: fetchData, silentRefetch, reset };
}

export default useFetch;