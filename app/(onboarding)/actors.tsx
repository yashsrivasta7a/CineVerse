import { useMemo, useState } from 'react'
import { useRouter } from 'expo-router'

import { PreferenceStep } from '@/components/onboarding/PreferenceStep'
import { usePeopleSearch } from '@/lib/queries/reference'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { usePrefs } from '@/lib/store/prefs'

export default function ActorsLike() {
    const router = useRouter()
    const [query, setQuery] = useState('')
    const debounced = useDebouncedValue(query, 400)
    const { data = [], isPending } = usePeopleSearch(debounced)
    const completeOnboarding = usePrefs((state) => state.completeOnboarding)

    const items = useMemo(
        () =>
            data.map((person) => ({
                value: String(person.id),
                label: person.name,
                imagePath: person.profile_path,
            })),
        [data]
    )

    /** Last step of the flow — FORWARD and SKIP both land here. */
    const finish = () => {
        completeOnboarding()
        // replace, not push — the user must not be able to swipe back into a
        // flow they have already completed.
        router.replace('/(tabs)' as never)
    }

    return (
        <PreferenceStep
            title="Actor"
            subtitle="Choose the actors you like"
            facet="person"
            stance="like"
            items={items}
            loading={isPending}
            variant="avatar"
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search actors"
            onNext={finish}
        />
    )
}
