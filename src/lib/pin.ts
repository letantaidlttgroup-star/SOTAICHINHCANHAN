const E = 'pw_pin_enabled';
const H = 'pw_pin_hash';

async function sha(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('pw-salt:' + pin));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const isPinEnabled = () => localStorage.getItem(E) === '1';
export async function setPin(pin: string) {
  localStorage.setItem(H, await sha(pin));
  localStorage.setItem(E, '1');
}
export function disablePin() {
  localStorage.removeItem(E);
  localStorage.removeItem(H);
}
export async function verifyPin(pin: string) {
  return (await sha(pin)) === localStorage.getItem(H);
}
