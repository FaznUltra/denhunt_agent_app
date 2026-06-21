import { router, type Href } from 'expo-router';
import { ListingForm } from '@/components/listings/ListingForm';

// Create entry point — blank form, draft-saved as you go.
export default function CreateListingScreen() {
  return <ListingForm onComplete={() => router.push('/(agent)/listings' as Href)} />;
}
