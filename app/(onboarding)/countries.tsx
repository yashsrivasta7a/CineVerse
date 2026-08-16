import { useMemo, useState } from 'react'
import { useRouter } from 'expo-router'

import { PreferenceStep } from '@/components/onboarding/PreferenceStep'
import { useCountries } from '@/lib/queries/reference'
import { flagEmoji } from '@/lib/format/flag'

export default function CountriesLike() {
    const router = useRouter()
    const [query, setQuery] = useState('')
    const { data = [], isPending } = useCountries()

    const items = useMemo(() => {
        const needle = query.trim().toLowerCase()
        return data
            .filter((country) => country.english_name.toLowerCase().includes(needle))
            .slice(0, 90)
            .map((country) => ({
                value: country.iso_3166_1,
                label: country.english_name,
                glyph: flagEmoji(country.iso_3166_1),
            }))
    }, [data, query])

    return (
        <PreferenceStep
            title="Country"
            subtitle="Select the country(ies) you like"
            facet="country"
            stance="like"
            items={items}
            loading={isPending}
            variant="chip"
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search"
            canGoBack={false}
            onNext={() => router.push('/genres' as never)}
        />
    )
}
