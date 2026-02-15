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

export const getTrendingMovies = async():Promise<TrendingMovie[] | undefined>=>{
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