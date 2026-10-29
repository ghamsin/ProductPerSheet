import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  calculateQuantity,
  computeSheetLayout,
  buildPdfReportModel,
  createPdfBinaryFromJpeg,
} = require('./script.js');

test('calculateQuantity without gap computes exact products per paper and required sheets', () => {
  const elements: Record<string, { value: string | number; textContent?: string; style?: Record<string, string> }> = {
    length: { value: '10' },
    width: { value: '5' },
    paperLength: { value: '100' },
    paperWidth: { value: '50' },
    gap: { value: '0' },
    productCount: { value: '500' },
    quantity: { value: '' },
    paperCount: { value: '' },
  };

  (globalThis as any).document = {
    getElementById: (id: string) => elements[id] || null,
    querySelectorAll: () => [],
  };

  calculateQuantity();

  assert.equal(elements.quantity.value, 100);
  assert.equal(elements.paperCount.value, 5);
});

test('computeSheetLayout accounts for millimeter gap between products and calculates arranged size and waste', () => {
  const result = computeSheetLayout({
    length: 10,
    width: 5,
    paperLength: 100,
    paperWidth: 50,
    gapMm: 5,
    productCount: 500,
    orientation: 'normal',
  });

  assert.equal(result.active.valid, true);
  assert.equal(result.active.countX, 9);
  assert.equal(result.active.countY, 9);
  assert.equal(result.active.quantity, 81);
  assert.equal(result.active.paperCount, 7);
  assert.equal(result.active.usedLengthCm, 94);
  assert.equal(result.active.usedWidthCm, 49);
  assert.equal(result.active.unusedLengthCm, 6);
  assert.equal(result.active.unusedWidthCm, 1);
  assert.equal(result.active.paperAreaCm2, 5000);
  assert.equal(result.active.usedNetAreaCm2, 4050);
  assert.equal(result.active.totalWasteAreaCm2, 950);
  assert.equal(result.active.wastePercent, 19);
});

test('computeSheetLayout auto orientation picks rotated layout when it yields more products per sheet', () => {
  const result = computeSheetLayout({
    length: 10,
    width: 15,
    paperLength: 30,
    paperWidth: 20,
    gapMm: 0,
    productCount: 20,
    orientation: 'auto',
  });

  assert.equal(result.normal.quantity, 3);
  assert.equal(result.rotated.quantity, 4);
  assert.equal(result.isRotated, true);
  assert.equal(result.active.quantity, 4);
  assert.equal(result.active.paperCount, 5);
});

test('buildPdfReportModel and createPdfBinaryFromJpeg generate valid PDF report metadata and binary', () => {
  const layout = computeSheetLayout({
    length: 10,
    width: 6,
    paperLength: 70,
    paperWidth: 50,
    gapMm: 2,
    productCount: 1000,
    orientation: 'normal',
  });

  const report = buildPdfReportModel(layout);
  assert.equal(report.valid, true);
  assert.equal(report.filename, 'sheet-layout-70x50cm-48pcs.pdf');
  assert.ok(report.arrangedSizeText.includes('61 × 49.4 cm'));
  assert.ok(report.wasteSummaryText.includes('17.7%'));

  // Test PDF 1.4 binary wrapper with sample JPEG payload
  const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);
  const pdfBytes = createPdfBinaryFromJpeg(fakeJpeg, 1240, 1754);
  const pdfString = Buffer.from(pdfBytes).toString('latin1');

  assert.ok(pdfString.startsWith('%PDF-1.4'));
  assert.ok(pdfString.includes('/Type /Catalog'));
  assert.ok(pdfString.includes('/Subtype /Image'));
  assert.ok(pdfString.includes('/Filter /DCTDecode'));
  assert.ok(pdfString.trimEnd().endsWith('%%EOF'));
});
