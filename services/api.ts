import { getBookmarks } from '@/services/appwrite';

export const TMDB_CONFIG = {
    BASE_URL: 'https://api.themoviedb.org/3',
    API_KEY: process.env.EXPO_PUBLIC_MOVIE_API_KEY,
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_MOVIE_API_KEY}`
    }
}

export const fetchMovies = async ({
    query,
}: {
    query: string;
}): Promise<Movie[]> => {
    const endpoint = query
        ? `${TMDB_CONFIG.BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
        : `${TMDB_CONFIG.BASE_URL}/discover/movie?sort_by=popularity.desc`;

    const response = await fetch(endpoint, {
        method: "GET",
        headers: TMDB_CONFIG.headers,
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch movies: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results;
};

export const fetchMovieDetails = async (
    movieId: string
): Promise<MovieDetails> => {
    try {
        const response = await fetch(
            `${TMDB_CONFIG.BASE_URL}/movie/${movieId}?api_key=${TMDB_CONFIG.API_KEY}`,
            {
                method: "GET",
                headers: TMDB_CONFIG.headers,
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch movie details: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching movie details:", error);
        throw error;
    }
};


export const fetchBookmarkedMovies = async (userId: string): Promise<MovieDetails[]> => {
    try {
        const bookmarks = await getBookmarks(userId);

        if (!bookmarks || bookmarks.length === 0) {
            return [];
        }

        const moviePromises = bookmarks.map(bookmark =>
            fetchMovieDetails(bookmark.movieId.toString())
        );

        const movies = await Promise.all(moviePromises);
        return movies;
    } catch (error) {
        console.error("Error fetching bookmarked movies:", error);
        return [];
    }
};

export const fetchUpcomingMovies = async (): Promise<Movie[]> => {
    const allMovies: Movie[] = [];

    // Fetch multiple pages to get more upcoming months
    for (let page = 1; page <= 3; page++) {
        const endpoint = `${TMDB_CONFIG.BASE_URL}/movie/upcoming?language=en-US&page=${page}`;

        const response = await fetch(endpoint, {
            method: "GET",
            headers: TMDB_CONFIG.headers,
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch upcoming movies: ${response.statusText}`);
        }

        const data = await response.json();
        allMovies.push(...data.results);

        // Stop if we've reached the last page
        if (page >= data.total_pages) break;
    }

    return allMovies;
};
