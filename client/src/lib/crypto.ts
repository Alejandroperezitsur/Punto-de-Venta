const ALGORITHM = 'AES-GCM';
let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const stored = sessionStorage.getItem('encryption_key');
  let keyData: Uint8Array;

  if (stored) {
    keyData = new Uint8Array(stored.split(',').map(Number));
  } else {
    keyData = crypto.getRandomValues(new Uint8Array(32));
    sessionStorage.setItem('encryption_key', Array.from(keyData).join(','));
  }

  cachedKey = await crypto.subtle.importKey('raw', keyData as BufferSource, ALGORITHM, false, ['encrypt', 'decrypt']);
  return cachedKey;
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(ciphertext: string): Promise<string> {
  const key = await getKey();
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data);
  return new TextDecoder().decode(decrypted);
}
