import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  initRustWasmEngine,
  calculateQuantity,
  computeSheetLayout,
  computeStandardSheetsComparison,
  buildPdfReportModel,
  createPdfBinaryFromJpeg,
  toggleMobileDesktopMode,
  getViewportMode,
} = require('./script.js');

test('Rust WebAssembly engine initializes and exports native calculation functions including 4-sided margin span', () => {
  const wasm = initRustWasmEngine();
  assert.ok(wasm, 'Expected Rust WebAssembly exports to be initialized');
  assert.equal(wasm.calc_items_along_axis(70, 10, 2), 6);
  assert.equal(wasm.calc_items_along_axis(50, 6, 2), 8);
  assert.equal(wasm.calc_used_span_cm(6, 10, 2), 61);
  assert.equal(Math.round(wasm.calc_used_span_cm(8, 6, 2) * 10) / 10, 49.4);
  assert.equal(wasm.calc_guillotine_cuts(6, 8, 2, 9, 0.6), 26);
  assert.equal(Math.round(wasm.calc_total_paper_weight_kg(70, 50, 135, 21) * 100) / 100, 0.99);
  assert.equal(wasm.calc_effective_paper_span_cm(70, 50, 50), 60);
  assert.equal(wasm.calc_effective_paper_span_cm(50, 15, 15), 47);
});

test('calculateQuantity without gap or margin computes exact products per paper and required sheets', () => {
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

test('computeSheetLayout accounts for 4-sided margins (top, bottom, right, left) in mm', () => {
  // Paper: 70 x 50 cm, Product: 10 x 6 cm, Gap: 2 mm
  // Margins: left=50mm (5cm), right=50mm (5cm) -> effective length = 60cm -> 5 items (50.8cm)
  // Margins: top=15mm (1.5cm), bottom=15mm (1.5cm) -> effective width = 47cm -> 7 items (43.2cm)
  const result = computeSheetLayout({
    length: 10,
    width: 6,
    paperLength: 70,
    paperWidth: 50,
    gapMm: 2,
    productCount: 1000,
    gsm: 135,
    marginTopMm: 15,
    marginBottomMm: 15,
    marginRightMm: 50,
    marginLeftMm: 50,
    orientation: 'normal',
  });

  assert.equal(result.active.valid, true);
  assert.equal(result.active.effectivePaperLengthCm, 60);
  assert.equal(result.active.effectivePaperWidthCm, 47);
  assert.equal(result.active.countX, 5);
  assert.equal(result.active.countY, 7);
  assert.equal(result.active.quantity, 35);
  assert.equal(result.active.paperCount, 29); // ceil(1000 / 35) = 29
});

test('computeStandardSheetsComparison evaluates all standard sheets live with 4-sided margins', () => {
  const matrix = computeStandardSheetsComparison(10, 6, 2, 1000, 135, {
    top: 5,
    bottom: 5,
    right: 5,
    left: 5,
  });
  assert.equal(matrix.length, 5);
  const bestRows = matrix.filter((r: any) => r.isBest);
  assert.equal(bestRows.length, 1);
  assert.ok(bestRows[0].quantity > 0);
});

test('buildPdfReportModel and createPdfBinaryFromJpeg generate valid PDF report metadata and binary', () => {
  const layout = computeSheetLayout({
    length: 10,
    width: 6,
    paperLength: 70,
    paperWidth: 50,
    gapMm: 2,
    productCount: 1000,
    gsm: 135,
    marginTopMm: 5,
    marginBottomMm: 5,
    marginRightMm: 5,
    marginLeftMm: 5,
    orientation: 'normal',
  });

  const report = buildPdfReportModel(layout);
  assert.equal(report.valid, true);
  assert.ok(report.marginsText.includes('5mm'));

  const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);
  const pdfBytes = createPdfBinaryFromJpeg(fakeJpeg, 1240, 1754);
  const pdfString = Buffer.from(pdfBytes).toString('latin1');

  assert.ok(pdfString.startsWith('%PDF-1.4'));
  assert.ok(pdfString.trimEnd().endsWith('%%EOF'));
});

test('toggleMobileDesktopMode switches between mobile and desktop view modes on consecutive clicks', () => {
  const bodyClasses = new Set<string>();
  const bodyAttrs: Record<string, string> = {};
  const toggleBtn = {
    textContent: 'نمایش نسخه موبایل',
    attrs: {} as Record<string, string>,
    classes: new Set<string>(),
    setAttribute(k: string, v: string) {
      this.attrs[k] = v;
    },
    classList: {
      add: (c: string) => toggleBtn.classes.add(c),
      remove: (c: string) => toggleBtn.classes.delete(c),
    },
  };

  (globalThis as any).document = {
    body: {
      classList: {
        add: (c: string) => bodyClasses.add(c),
        remove: (c: string) => bodyClasses.delete(c),
      },
      setAttribute: (k: string, v: string) => {
        bodyAttrs[k] = v;
      },
    },
    getElementById: (id: string) => (id === 'toggleViewportModeBtn' ? toggleBtn : null),
  };

  assert.equal(getViewportMode(), 'desktop');

  // First click -> switches to mobile mode
  const mode1 = toggleMobileDesktopMode();
  assert.equal(mode1, 'mobile');
  assert.equal(bodyClasses.has('mobile-view-mode'), true);
  assert.equal(bodyAttrs['data-view-mode'], 'mobile');
  assert.equal(toggleBtn.textContent, 'بازگشت به نسخه دسکتاپ');
  assert.equal(toggleBtn.attrs['aria-pressed'], 'true');

  // Second click -> switches back to desktop mode
  const mode2 = toggleMobileDesktopMode();
  assert.equal(mode2, 'desktop');
  assert.equal(bodyClasses.has('mobile-view-mode'), false);
  assert.equal(bodyClasses.has('desktop-view-forced'), true);
  assert.equal(bodyAttrs['data-view-mode'], 'desktop');
  assert.equal(toggleBtn.textContent, 'نمایش نسخه موبایل');
  assert.equal(toggleBtn.attrs['aria-pressed'], 'false');
});



