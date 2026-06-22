import { useEffect, useState } from 'react';
import { extractPathFromUrl, getSignedUrl } from '@/utils/signedUrl';

// Resolves a raw stored URL into a usable URL. External URLs (e.g. seeded
// picsum links, or local file:// URIs on optimistic sends) pass through
// untouched; Supabase private-bucket URLs are signed on demand. Returns null
// while a signed URL is being fetched — callers should show a placeholder.
export function useSignedUrl(rawUrl: string | null | undefined, bucket: string): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(
    rawUrl && !rawUrl.includes('supabase') ? rawUrl : null,
  );

  useEffect(() => {
    let active = true;
    if (!rawUrl) {
      setSignedUrl(null);
      return;
    }
    // Local URIs and external (non-Supabase) URLs are used as-is.
    if (!rawUrl.includes('supabase')) {
      setSignedUrl(rawUrl);
      return;
    }
    const path = extractPathFromUrl(rawUrl, bucket);
    if (!path) {
      setSignedUrl(rawUrl);
      return;
    }
    setSignedUrl(null);
    getSignedUrl(bucket, path).then((url) => {
      if (active && url) setSignedUrl(url);
    });
    return () => {
      active = false;
    };
  }, [rawUrl, bucket]);

  return signedUrl;
}
