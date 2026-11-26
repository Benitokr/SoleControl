/**
 * Data format & validation standards for SoleControl (Indian Footwear Retail ERP).
 * Money: stored as DECIMAL(14,2), computed in integer paise to avoid float drift.
 * GST rounding rule: round GST per line item to 2 decimal places (nearest paise), then sum.
 * Dates: stored as UTC ISO; displayed DD/MM/YYYY in Asia/Kolkata; financial year April-March.
 */

export function toPaise(rupees: number | string): number {
  const n = Number(rupees ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}

export function roundMoney(val: number): number {
  return Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
}

export function computeLineGst(
  taxableAmount: number,
  gstRatePct: number,
  interState = false
): { taxable: number; cgst: number; sgst: number; igst: number; totalTax: number } {
  const taxable = roundMoney(taxableAmount);
  const totalTax = roundMoney((taxable * Number(gstRatePct || 0)) / 100);
  if (interState) {
    return { taxable, cgst: 0, sgst: 0, igst: totalTax, totalTax };
  }
  const cgst = roundMoney(totalTax / 2);
  const sgst = roundMoney(totalTax - cgst);
  return { taxable, cgst, sgst, igst: 0, totalTax };
}

export function normalizeIndianPhone(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function isValidIndianPhone(raw: string): boolean {
  const norm = normalizeIndianPhone(raw);
  return /^[6-9]\d{9}$/.test(norm);
}

export const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function isValidGSTIN(gstin: string): boolean {
  const code = String(gstin || '').trim().toUpperCase();
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(code)) return false;
  // GSTIN Mod-36 checksum verification
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const val = GSTIN_CHARS.indexOf(code[i]);
    if (val < 0) return false;
    const factor = i % 2 === 0 ? 1 : 2;
    const prod = val * factor;
    sum += Math.floor(prod / 36) + (prod % 36);
  }
  const checkIdx = (36 - (sum % 36)) % 36;
  return code[14] === GSTIN_CHARS[checkIdx];
}

export function isValidPAN(pan: string): boolean {
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(String(pan || '').trim().toUpperCase());
}

export function isValidPinCode(pin: string): boolean {
  return /^[1-9]\d{5}$/.test(String(pin || '').trim());
}

export function isValidHSN(hsn: string): boolean {
  return /^\d{4}(\d{2})?(\d{2})?$/.test(String(hsn || '').trim());
}

export function computeEan13CheckDigit(twelveDigits: string): string {
  const d = String(twelveDigits || '').replace(/\D/g, '').slice(0, 12).padStart(12, '0');
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const num = Number(d[i]);
    sum += i % 2 === 0 ? num : num * 3;
  }
  const mod = sum % 10;
  return String(mod === 0 ? 0 : 10 - mod);
}

export function generateEan13(seedNumber?: number | string): string {
  const base = String(seedNumber ?? Date.now()).replace(/\D/g, '').slice(-9).padStart(9, '0');
  const prefix12 = `890${base}`;
  return prefix12 + computeEan13CheckDigit(prefix12);
}

export function isValidEan13(barcode: string): boolean {
  const clean = String(barcode || '').trim();
  if (!/^\d{13}$/.test(clean)) return false;
  return computeEan13CheckDigit(clean.slice(0, 12)) === clean[12];
}

export function getIndianFinancialYear(date: Date = new Date()): string {
  const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const y = ist.getFullYear();
  const m = ist.getMonth() + 1; // 1-12
  return m >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
}
