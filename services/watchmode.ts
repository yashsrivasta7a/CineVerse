import { WatchmodeClient, TitleSource } from '@watchmode/api-client';

const client = new WatchmodeClient({ apiKey: process.env.EXPO_PUBLIC_WATCH_MODE_API_KEY! });


import { useQuery } from '@tanstack/react-query';

export const getStreamingServices = async (tmdbId: string, type: 'movie' | 'tv' = 'movie'): Promise<TitleSource[]> => {
    try {
        const id = `${type}-${tmdbId}`;
        const { data, error } = await client.title.getSources(id, {
            regions: 'IN',
        });

        if (error) {
            console.error("Watchmode API Error:", error);
            return [];
        }
        return data?.filter(source => source.type === 'sub' || source.type === 'free') || [];
    } catch (error) {
        console.error("Error fetching streaming services:", error);
        return [];
    }
};

export const useStreamingServices = (tmdbId: string, type: 'movie' | 'tv' = 'movie') => {
    return useQuery({
        queryKey: ['streaming-services', tmdbId, type],
        queryFn: () => getStreamingServices(tmdbId, type),
        staleTime: 1000 * 60 * 60 * 24,
        enabled: !!tmdbId,
    });
};