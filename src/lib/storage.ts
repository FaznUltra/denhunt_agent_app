import * as LegacyFS from 'expo-file-system/legacy';
import { supabase } from './supabase';

// Upload a local file to Supabase Storage by streaming the bytes directly
// (binary), so files never get loaded into JS memory. Returns the public URL.
export async function uploadToStorage(
  bucket: string,
  path: string,
  localUri: string,
  contentType: string,
): Promise<string> {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const endpoint = `${base}/storage/v1/object/${bucket}/${path}`;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const result = await LegacyFS.uploadAsync(endpoint, localUri, {
    httpMethod: 'POST',
    uploadType: LegacyFS.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      'content-type': contentType,
      'x-upsert': 'true',
    },
  });
  if (result.status !== 200) throw new Error(`Upload failed (${result.status})`);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
