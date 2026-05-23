export async function getDeviceFingerprint(): Promise<string> {
  const stored = sessionStorage.getItem('device_fp');
  if (stored) return stored;

  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    navigator.hardwareConcurrency,
    navigator.deviceMemory || '',
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('||');

  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  const fp = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem('device_fp', fp);
  return fp;
}
