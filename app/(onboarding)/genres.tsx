import { useMemo, useState } from 'react'
import { useRouter } from 'expo-router'

import { PreferenceStep } from '@/components/onboarding/PreferenceStep'
import { useGenres } from '@/lib/queries/reference'
import { useGenreArt } from '@/lib/queries/genreArt'

export default function GenresLike() {
    const router = useRouter()
    const [query, setQuery] = useState('')
    const { data: genres = [], isPending } = useGenres('movie')
    // Artwork fills in when it lands; the tiles are usable before it does, so
    // this deliberately does not gate the loading state.
    const { data: art = {} } = useGenreArt()

    const items = useMemo(() => {
        const needle = query.trim().toLowerCase()
        return genres
            .filter((genre) => genre.name.toLowerCase().includes(needle))
            .map((genre) => ({
                value: String(genre.id),
                label: genre.name,
                imagePath: art[String(genre.id)] ?? null,
            }))
    }, [genres, art, query])

    return (
        <PreferenceStep
            title="Genre"
            subtitle="Choose the genres you like"
            facet="genre"
            stance="like"
            items={items}
            loading={isPending}
            variant="tile"
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search"
            onNext={() => router.push('/actors' as never)}
        />
    )
}
