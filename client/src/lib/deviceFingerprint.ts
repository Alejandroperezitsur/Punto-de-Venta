export async function getDeviceFingerprint(): Promise<string> {
  const storageKey = 'device_fp';
  const stored = localStorage.getItem(storageKey);
  if (stored) return stored;

  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    navigator.hardwareConcurrency,
    (navigator as any).deviceMemory || '',
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('||');

  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  const fp = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  try {
    localStorage.setItem(storageKey, fp);
  } catch {
    // ignore localStorage failures in restricted environments
  }
  return fp;
}
