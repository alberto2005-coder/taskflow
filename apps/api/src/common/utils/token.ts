import { createHash } from 'crypto';

/**
 * Convierte duraciones tipo `15m`, `7d`, `3600s` a milisegundos.
 * Si el formato no es válido se devuelve el valor por defecto.
 */
export function durationToMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/i.exec(value.trim());
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = (match[2] ?? 'ms').toLowerCase();

  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return amount;
  }
}

/** SHA-256 en hexadecimal: forma en la que guardamos los refresh tokens. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
