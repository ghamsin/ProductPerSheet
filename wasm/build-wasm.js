const fs = require('fs');
const path = require('path');

/**
 * Emits the compiled WebAssembly binary (`imposition_engine.wasm`) corresponding to `rust-engine/src/lib.rs`.
 * Exports:
 * 0: calc_items_along_axis(paper_cm: f64, item_cm: f64, gap_mm: f64) -> i32
 * 1: calc_used_span_cm(count: i32, item_cm: f64, gap_mm: f64) -> f64
 * 2: calc_waste_percent(paper_l: f64, paper_w: f64, item_l: f64, item_w: f64, quantity: i32) -> f64
 * 3: calc_guillotine_cuts(cols: i32, rows: i32, gap_mm: f64, unused_l: f64, unused_w: f64) -> i32
 * 4: calc_total_paper_weight_kg(paper_l: f64, paper_w: f64, gsm: f64, sheets: i32) -> f64
 * 5: calc_effective_paper_span_cm(paper_cm: f64, margin_a_mm: f64, margin_b_mm: f64) -> f64
 */
function uleb128(val) {
  const bytes = [];
  do {
    let b = val & 0x7f;
    val >>>= 7;
    if (val !== 0) b |= 0x80;
    bytes.push(b);
  } while (val !== 0);
  return bytes;
}

function f64Bytes(num) {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(num, 0);
  return Array.from(buf);
}

function strBytes(str) {
  const b = Buffer.from(str, 'utf8');
  return [...uleb128(b.length), ...Array.from(b)];
}

function section(id, payload) {
  return [id, ...uleb128(payload.length), ...payload];
}

function funcBody(locals, instructions) {
  const body = [...uleb128(locals.length), ...locals.flat(), ...instructions, 0x0b];
  return [...uleb128(body.length), ...body];
}

const I32 = 0x7f;
const F64 = 0x7c;

// Type section (id = 1): 6 function signatures
const types = [
  // type 0: (f64, f64, f64) -> i32
  [0x60, 3, F64, F64, F64, 1, I32],
  // type 1: (i32, f64, f64) -> f64
  [0x60, 3, I32, F64, F64, 1, F64],
  // type 2: (f64, f64, f64, f64, i32) -> f64
  [0x60, 5, F64, F64, F64, F64, I32, 1, F64],
  // type 3: (i32, i32, f64, f64, f64) -> i32
  [0x60, 5, I32, I32, F64, F64, F64, 1, I32],
  // type 4: (f64, f64, f64, i32) -> f64
  [0x60, 4, F64, F64, F64, I32, 1, F64],
  // type 5: (f64, f64, f64) -> f64
  [0x60, 3, F64, F64, F64, 1, F64],
];
const typeSection = section(1, [...uleb128(types.length), ...types.flat()]);

// Function section (id = 3)
const funcSection = section(3, [6, 0, 1, 2, 3, 4, 5]);

// Export section (id = 7)
const exportsList = [
  [...strBytes('calc_items_along_axis'), 0x00, 0],
  [...strBytes('calc_used_span_cm'), 0x00, 1],
  [...strBytes('calc_waste_percent'), 0x00, 2],
  [...strBytes('calc_guillotine_cuts'), 0x00, 3],
  [...strBytes('calc_total_paper_weight_kg'), 0x00, 4],
  [...strBytes('calc_effective_paper_span_cm'), 0x00, 5],
];
const exportSection = section(7, [...uleb128(exportsList.length), ...exportsList.flat()]);

// Func 0: calc_items_along_axis
const body0 = funcBody(
  [[1, F64]],
  [
    0x20, 0,
    0x20, 1,
    0x63,
    0x20, 1,
    0x44, ...f64Bytes(0.0),
    0x65,
    0x72,
    0x04, 0x40,
      0x41, 0,
      0x0f,
    0x0b,
    0x20, 2,
    0x44, ...f64Bytes(0.0),
    0x64,
    0x04, F64,
      0x20, 2,
      0x44, ...f64Bytes(10.0),
      0xa3,
    0x05,
      0x44, ...f64Bytes(0.0),
    0x0b,
    0x21, 3,
    0x20, 0,
    0x20, 3,
    0xa0,
    0x44, ...f64Bytes(1e-9),
    0xa0,
    0x20, 1,
    0x20, 3,
    0xa0,
    0xa3,
    0x9c, // f64.floor
    0xaa, // i32.trunc_f64_s
  ]
);

// Func 1: calc_used_span_cm
const body1 = funcBody(
  [[1, F64]],
  [
    0x20, 0,
    0x41, 0,
    0x4c,
    0x04, 0x40,
      0x44, ...f64Bytes(0.0),
      0x0f,
    0x0b,
    0x20, 2,
    0x44, ...f64Bytes(0.0),
    0x64,
    0x04, F64,
      0x20, 2,
      0x44, ...f64Bytes(10.0),
      0xa3,
    0x05,
      0x44, ...f64Bytes(0.0),
    0x0b,
    0x21, 3,
    0x20, 0,
    0xb7,
    0x20, 1,
    0xa2,
    0x20, 0,
    0x41, 1,
    0x6b,
    0xb7,
    0x20, 3,
    0xa2,
    0xa0,
  ]
);

// Func 2: calc_waste_percent
const body2 = funcBody(
  [[2, F64]],
  [
    0x20, 0,
    0x20, 1,
    0xa2,
    0x22, 5,
    0x44, ...f64Bytes(0.0),
    0x65,
    0x04, 0x40,
      0x44, ...f64Bytes(0.0),
      0x0f,
    0x0b,
    0x20, 4,
    0xb7,
    0x20, 2,
    0xa2,
    0x20, 3,
    0xa2,
    0x21, 6,
    0x20, 5,
    0x20, 6,
    0xa1,
    0x44, ...f64Bytes(0.0),
    0xa5, // f64.max
    0x20, 5,
    0xa3,
    0x44, ...f64Bytes(100.0),
    0xa2,
  ]
);

// Func 3: calc_guillotine_cuts
const body3 = funcBody(
  [[2, I32]],
  [
    0x20, 0,
    0x41, 0,
    0x4c,
    0x20, 1,
    0x41, 0,
    0x4c,
    0x72,
    0x04, 0x40,
      0x41, 0,
      0x0f,
    0x0b,
    0x20, 2,
    0x44, ...f64Bytes(0.0),
    0x64,
    0x04, I32,
      0x41, 2,
    0x05,
      0x41, 1,
    0x0b,
    0x21, 5,
    0x20, 0,
    0x41, 1,
    0x6b,
    0x20, 1,
    0x41, 1,
    0x6b,
    0x6a,
    0x20, 5,
    0x6c,
    0x20, 3,
    0x44, ...f64Bytes(0.001),
    0x64,
    0x6a,
    0x20, 4,
    0x44, ...f64Bytes(0.001),
    0x64,
    0x6a,
  ]
);

// Func 4: calc_total_paper_weight_kg
const body4 = funcBody(
  [],
  [
    0x20, 0,
    0x20, 1,
    0xa2,
    0x20, 2,
    0xa2,
    0x20, 3,
    0xb7,
    0xa2,
    0x44, ...f64Bytes(10000000.0),
    0xa3,
  ]
);

// Func 5: calc_effective_paper_span_cm(paper_cm: 0, margin_a_mm: 1, margin_b_mm: 2) -> f64
const body5 = funcBody(
  [],
  [
    // max(0.0, paper_cm - (max(0.0, margin_a_mm) + max(0.0, margin_b_mm)) / 10.0)
    0x20, 0,
    0x20, 1,
    0x44, ...f64Bytes(0.0),
    0xa5, // f64.max
    0x20, 2,
    0x44, ...f64Bytes(0.0),
    0xa5, // f64.max
    0xa0, // f64.add
    0x44, ...f64Bytes(10.0),
    0xa3, // f64.div
    0xa1, // f64.sub
    0x44, ...f64Bytes(0.0),
    0xa5, // f64.max
  ]
);

const codeSection = section(10, [
  6,
  ...body0,
  ...body1,
  ...body2,
  ...body3,
  ...body4,
  ...body5,
]);

const wasmBinary = Buffer.from([
  0x00, 0x61, 0x73, 0x6d,
  0x01, 0x00, 0x00, 0x00,
  ...typeSection,
  ...funcSection,
  ...exportSection,
  ...codeSection,
]);

const outDir = path.join(__dirname);
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'imposition_engine.wasm');
fs.writeFileSync(outFile, wasmBinary);
console.log('Wrote WASM binary:', outFile, 'bytes:', wasmBinary.length);
console.log('Base64:', wasmBinary.toString('base64'));
