import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ListingForm } from '@/components/listings/ListingForm';

// Edit entry point — loads the existing listing into the same form.
export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ListingForm
      listingId={id}
      onComplete={() => router.push(`/(agent)/listings/${id}` as Href)}
    />
  );
}
