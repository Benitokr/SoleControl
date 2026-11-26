import { z } from 'zod';
import {
  isValidIndianPhone,
  isValidGSTIN,
  isValidHSN,
  isValidEan13,
  normalizeIndianPhone,
} from './formats.js';

const safeText = (min = 1, max = 200) =>
  z.string().trim().min(min).max(max).refine((v) => !/[<>]/.test(v), 'HTML characters (<, >) are not allowed');

export const brandInputSchema = z.object({
  name: safeText(1, 100),
  code: z.string().trim().min(1).max(20).toUpperCase(),
  description: z.string().trim().max(500).optional(),
});

export const categoryInputSchema = z.object({
  name: safeText(1, 100),
  code: z.string().trim().min(1).max(20).toUpperCase(),
  gender: z.enum(['MENS', 'WOMENS', 'KIDS', 'UNISEX']).default('UNISEX'),
  description: z.string().trim().max(500).optional(),
});

export const articleInputSchema = z.object({
  articleNumber: z.string().trim().min(1).max(40).toUpperCase().optional(),
  code: z.string().trim().min(1).max(40).toUpperCase().optional(),
  name: safeText(2, 150),
  brandId: z.string().min(1, 'Brand is required'),
  categoryId: z.string().min(1, 'Category is required'),
  gender: z.enum(['MENS', 'WOMENS', 'KIDS', 'UNISEX']).default('UNISEX'),
  hsnCode: z.string().trim().refine(isValidHSN, 'HSN must be 4, 6, or 8 digits').default('6404'),
  baseCostPrice: z.coerce.number().min(0, 'Cost cannot be negative'),
  baseMrp: z.coerce.number().positive('MRP must be greater than 0'),
  baseSellingPrice: z.coerce.number().min(0).optional(),
  description: z.string().trim().max(1000).optional(),
});

export const vendorInputSchema = z.object({
  name: safeText(2, 150),
  gstin: z.string().trim().optional().refine((v) => !v || isValidGSTIN(v), 'Invalid 15-character GSTIN'),
  phone: z.string().trim().optional().transform((v) => (v ? normalizeIndianPhone(v) : v)).refine((v) => !v || isValidIndianPhone(v), 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  address: z.string().trim().max(500).optional(),
});

export const customerInputSchema = z.object({
  name: safeText(2, 150),
  phone: z.string().trim().transform(normalizeIndianPhone).refine(isValidIndianPhone, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  address: z.string().trim().max(500).optional(),
});

export const purchaseItemInputSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().positive('Quantity must be a positive integer'),
  costPrice: z.coerce.number().min(0),
  mrp: z.coerce.number().positive(),
  sellingPrice: z.coerce.number().min(0).optional(),
  taxRate: z.coerce.number().min(0).max(28).default(12),
});

export const saleItemInputSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().positive('Quantity must be a positive integer'),
  mrp: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(28).default(12),
  taxAmount: z.coerce.number().min(0).default(0),
});

export const barcodeValidationSchema = z.string().trim().refine(isValidEan13, 'Invalid EAN-13 barcode check digit');
