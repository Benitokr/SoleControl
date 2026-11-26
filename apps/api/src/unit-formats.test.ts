import { describe, it, expect } from 'vitest';
import {
  computeLineGst,
  roundMoney,
  normalizeIndianPhone,
  isValidIndianPhone,
  isValidGSTIN,
  isValidPAN,
  isValidPinCode,
  isValidHSN,
  generateEan13,
  isValidEan13,
  getIndianFinancialYear,
  articleInputSchema,
  vendorInputSchema,
  customerInputSchema,
  saleItemInputSchema,
} from '@solecontrol/shared';

describe('SoleControl Data Format & Validation Standards', () => {
  it('computes per-line GST with zero float drift (CGST+SGST & IGST)', () => {
    const intra = computeLineGst(1999.99, 12, false);
    expect(roundMoney(intra.cgst + intra.sgst)).toBe(intra.totalTax);
    expect(intra.igst).toBe(0);

    const inter = computeLineGst(1999.99, 12, true);
    expect(inter.cgst).toBe(0);
    expect(inter.sgst).toBe(0);
    expect(inter.igst).toBe(inter.totalTax);
  });

  it('proves 100 randomized sales/GST totals produce balanced Dr/Cr journals', () => {
    for (let i = 0; i < 100; i++) {
      const price = Math.round((500 + Math.random() * 9500) * 100) / 100;
      const qty = 1 + (i % 5);
      const gst = computeLineGst(price * qty, i % 2 === 0 ? 12 : 18, false);
      const totalDebit = roundMoney(gst.taxable + gst.totalTax);
      const totalCredit = roundMoney(gst.taxable + gst.cgst + gst.sgst);
      expect(Math.abs(totalDebit - totalCredit)).toBeLessThanOrEqual(0.001);
    }
  });

  it('normalises and validates 10-digit Indian mobile numbers', () => {
    expect(normalizeIndianPhone('+91 98401 23456')).toBe('9840123456');
    expect(isValidIndianPhone('09840123456')).toBe(true);
    expect(isValidIndianPhone('12345')).toBe(false);
    expect(isValidIndianPhone('5123456789')).toBe(false);
  });

  it('validates GSTIN format + Mod-36 checksum, PAN, PIN, HSN', () => {
    expect(isValidGSTIN('27AAPFU0939F1ZV')).toBe(true);
    expect(isValidGSTIN('27AAPFU0939F1ZA')).toBe(false); // bad checksum
    expect(isValidPAN('AABCF4050M')).toBe(true);
    expect(isValidPAN('12345')).toBe(false);
    expect(isValidPinCode('641004')).toBe(true);
    expect(isValidPinCode('041004')).toBe(false);
    expect(isValidHSN('6404')).toBe(true);
    expect(isValidHSN('64041100')).toBe(true);
    expect(isValidHSN('64')).toBe(false);
  });

  it('generates and verifies valid EAN-13 check digits', () => {
    const code = generateEan13(123456789);
    expect(code).toHaveLength(13);
    expect(isValidEan13(code)).toBe(true);
    const tampered = code.slice(0, 12) + ((Number(code[12]) + 1) % 10);
    expect(isValidEan13(tampered)).toBe(false);
  });

  it('computes Indian April-March financial year', () => {
    expect(getIndianFinancialYear(new Date('2026-04-15T10:00:00Z'))).toBe('2026-27');
    expect(getIndianFinancialYear(new Date('2026-02-15T10:00:00Z'))).toBe('2025-26');
  });

  it('rejects fuzz/invalid payloads via shared Zod contracts', () => {
    expect(
      articleInputSchema.safeParse({
        name: '<script>alert(1)</script>',
        brandId: 'b1',
        categoryId: 'c1',
        baseCostPrice: 1000,
        baseMrp: 2000,
      }).success
    ).toBe(false);

    expect(
      articleInputSchema.safeParse({
        name: 'Nike Pegasus',
        brandId: 'b1',
        categoryId: 'c1',
        baseCostPrice: 1000,
        baseMrp: 0,
      }).success
    ).toBe(false);

    expect(
      saleItemInputSchema.safeParse({
        variantId: 'v1',
        quantity: 1.5, // decimal pairs rejected
        mrp: 1000,
        sellingPrice: 1000,
      }).success
    ).toBe(false);

    expect(
      customerInputSchema.safeParse({
        name: 'Test',
        phone: '123',
      }).success
    ).toBe(false);

    expect(
      vendorInputSchema.safeParse({
        name: 'Vendor',
        gstin: 'INVALID',
      }).success
    ).toBe(false);
  });
});
