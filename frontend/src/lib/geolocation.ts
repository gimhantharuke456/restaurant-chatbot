// Reuses whatever geolocation permission the user already granted elsewhere
// (e.g. the home page's "Near me" button) rather than prompting again from
// inside the chat — only attaches lat/lng when permission is already
// "granted", so this never interrupts the conversation with a permission
// dialog. Resolved once per page load and cached.
let cachedLocation: { lat: number; lng: number } | null | undefined;

export async function resolveLocation(): Promise<{ lat: number; lng: number } | null> {
  if (cachedLocation !== undefined) return cachedLocation;
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    cachedLocation = null;
    return cachedLocation;
  }
  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      if (status.state !== "granted") {
        cachedLocation = null;
        return cachedLocation;
      }
    }
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    cachedLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    cachedLocation = null;
  }
  return cachedLocation;
}
