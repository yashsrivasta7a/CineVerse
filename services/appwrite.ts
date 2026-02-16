import { Client, Databases, ID, Query } from "react-native-appwrite"

//track the search 
// check if record already stored if yes increment the searchcount 
// else create new docs with count 1



const DATABASE_id = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!;

const client = new Client()
    .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!)

const database = new Databases(client);

export const updateSearchcount = async (query: string, movie: Movie) => {
    try {
        const result = await database.listDocuments(DATABASE_id, COLLECTION_ID, [
            Query.equal('searchTerm', query)
        ]
        )
        if (result.documents.length > 0) {
            const existing_movie = result.documents[0];

            await database.updateDocument(
                DATABASE_id,
                COLLECTION_ID,
                existing_movie.$id,
                {
                    count: existing_movie.count + 1,

                }
            )
        }
        else {
            await database.createDocument(DATABASE_id, COLLECTION_ID, ID.unique(), {
                searchTerm: query,
                movie_id: movie.id,
                count: 1,
                poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
                title: movie.title,
            })
        }
    } catch (error) {
        console.log(error)
    }
}

export const getTrendingMovies = async (): Promise<TrendingMovie[] | undefined> => {
    try {
        const result = await database.listDocuments(DATABASE_id, COLLECTION_ID, [
            Query.orderDesc('count'),
            Query.limit(4)
        ])
        return result.documents as unknown as TrendingMovie[]
    } catch (error) {
        console.log(error)
        return undefined
    }
}

const BOOKMARK_COLLECTION_ID = 'bookmarks';

export const addBookmark = async (user_id: string, movie: MovieDetails) => {
    try {
        await database.createDocument(DATABASE_id, BOOKMARK_COLLECTION_ID, ID.unique(), {
            userId: user_id,
            movieId: movie.id,
            title: movie.title,
            bookmarkId: Date.now(),
            createdDate: new Date().toISOString(),

        })
        return true;
    } catch (error) {
        console.error("Error adding bookmark:", error);
        return false;
    }
}

export const removeBookmark = async (user_id: string, movie_id: number) => {
    try {
        const result = await database.listDocuments(DATABASE_id, BOOKMARK_COLLECTION_ID, [
            Query.equal('userId', user_id),
            Query.equal('movieId', movie_id)
        ]);

        if (result.documents.length > 0) {
            await database.deleteDocument(DATABASE_id, BOOKMARK_COLLECTION_ID, result.documents[0].$id);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error removing bookmark:", error);
        return false;
    }
}

export const checkIfBookmarked = async (user_id: string, movie_id: number) => {
    try {
        const result = await database.listDocuments(DATABASE_id, BOOKMARK_COLLECTION_ID, [
            Query.equal('userId', user_id),
            Query.equal('movieId', movie_id)
        ]);
        return result.documents.length > 0;
    } catch (error) {
        console.error("Error checking bookmark:", error);
        return false;
    }
}

export const getBookmarks = async (user_id: string) => {
    try {
        const result = await database.listDocuments(DATABASE_id, BOOKMARK_COLLECTION_ID, [
            Query.equal('userId', user_id),
            Query.orderDesc('createdDate')
        ]);
        return result.documents;
    } catch (error) {
        console.error("Error fetching bookmarks:", error);
        return [];
    }
}