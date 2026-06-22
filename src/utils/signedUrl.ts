import { supabase } from '@/lib/supabase';

type CacheEntry = { url: string; expiresAt: number };
const cache = new Map<string, CacheEntry>();

// Create (and cache) a signed URL for a private Storage object. Re-uses a cached
// URL while it still has >5 min of validity left.
export async function getSignedUrl(
  bucket: string,
  path: string,
  expirySeconds = 3600,
): Promise<string | null> {
  const cacheKey = `${bucket}:${path}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt - Date.now() > 300_000) return cached.url;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expirySeconds);
  if (error || !data?.signedUrl) return null;

  cache.set(cacheKey, { url: data.signedUrl, expiresAt: Date.now() + expirySeconds * 1000 });
  return data.signedUrl;
}

// Pull the storage path out of a Supabase public/sign URL (everything after the
// bucket name, query string stripped). Returns null if the bucket isn't found.
export function extractPathFromUrl(fullUrl: string, bucket: string): string | null {
  const publicMarker = `/object/public/${bucket}/`;
  const signMarker = `/object/sign/${bucket}/`;
  const pubIdx = fullUrl.indexOf(publicMarker);
  const signIdx = fullUrl.indexOf(signMarker);
  let start = -1;
  if (pubIdx !== -1) start = pubIdx + publicMarker.length;
  else if (signIdx !== -1) start = signIdx + signMarker.length;
  if (start === -1) return null;
  return fullUrl.substring(start).split('?')[0];
}
