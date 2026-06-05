const FETCH_TIMEOUT_MS = 5_000;

function googleKey(): string | undefined {
  return process.env.GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

/**
 * Resolve a Google Places photo resource name
 * ("places/<id>/photos/<ref>") to a directly-fetchable image URL.
 * Returns null when there is no key, the name is empty, or the call fails.
 */
export async function googlePhotoUri(
  photoName: string | undefined,
  maxWidthPx = 800
): Promise<string | null> {
  const key = googleKey();
  if (!key || !photoName) return null;

  try {
    const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const resp = await fetch(url, {
      headers: { 'X-Goog-Api-Key': key },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!resp.ok) return null;
    const data = (await resp.json()) as { photoUri?: string };
    return data.photoUri ?? null;
  } catch {
    return null;
  }
}
