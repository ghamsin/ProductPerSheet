/**
 * Rust -> WebAssembly (wasm32-unknown-unknown) compiled binary from `rust-engine/src/lib.rs`.
 * Embedded directly as Uint8Array so it initializes synchronously in <1ms on both cPanel
 * static folders (root or subfolder) and Node.js without MIME or path issues, while also
 * supporting external `./wasm/imposition_engine.wasm`.
 */
var WASM_BASE64 =
  "AGFzbQEAAAABMAZgA3x8fAF/YAN/fHwBfGAFfHx8fH8BfGAFf398fHwBf2AEfHx8fwF8YAN8fHwBfAMHBgABAgMEBQeVAQYVY2FsY19pdGVtc19hbG9uZ19heGlzAAARY2FsY191c2VkX3NwYW5fY20AARJjYWxjX3dhc3RlX3BlcmNlbnQAAhRjYWxjX2d1aWxsb3RpbmVfY3V0cwADGmNhbGNfdG90YWxfcGFwZXJfd2VpZ2h0X2tnAAQcY2FsY19lZmZlY3RpdmVfcGFwZXJfc3Bhbl9jbQAFCpQDBloBAXwgACABYyABRAAAAAAAAAAAZXIEQEEADwsgAkQAAAAAAAAAAGQEfCACRAAAAAAAACRAowVEAAAAAAAAAAALIQMgACADoESV1iboCy4RPqAgASADoKOcqgtNAQF8IABBAEwEQEQAAAAAAAAAAA8LIAJEAAAAAAAAAABkBHwgAkQAAAAAAAAkQKMFRAAAAAAAAAAACyEDIAC3IAGiIABBAWu3IAOioAtJAQJ8IAAgAaIiBUQAAAAAAAAAAGUEQEQAAAAAAAAAAA8LIAS3IAKiIAOiIQYgBSAGoUQAAAAAAAAAAKUgBaNEAAAAAAAAWUCiC1MBAn8gAEEATCABQQBMcgRAQQAPCyACRAAAAAAAAAAAZAR/QQIFQQELIQUgAEEBayABQQFraiAFbCADRPyp8dJNYlA/ZGogBET8qfHSTWJQP2RqCxgAIAAgAaIgAqIgA7eiRAAAAADQEmNBowsyACAAIAFEAAAAAAAAAAClIAJEAAAAAAAAAACloEQAAAAAAAAkQKOhRAAAAAAAAAAApQs=";

var rustWasmExports = null;

function decodeBase64ToBytes(b64) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  var bin = atob(b64);
  var arr = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return arr;
}

function initRustWasmEngine() {
  if (rustWasmExports) return rustWasmExports;
  try {
    if (typeof WebAssembly !== "undefined") {
      var bytes = decodeBase64ToBytes(WASM_BASE64);
      var mod = new WebAssembly.Module(bytes);
      var inst = new WebAssembly.Instance(mod);
      rustWasmExports = inst.exports;
    }
  } catch (e) {
    rustWasmExports = null;
  }
  return rustWasmExports;
}

initRustWasmEngine();

function roundNum(val, decimals) {
  var factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

/**
 * Pure calculation engine powered by the Rust WebAssembly exports (`rust-engine/src/lib.rs`)
 * including 4-sided sheet margins (Top, Bottom, Right, Left in mm).
 */
function computeLayoutForOrientation(
  lengthCm,
  widthCm,
  paperLengthCm,
  paperWidthCm,
  gapMm,
  productCount,
  gsm,
  marginsMm
) {
  var safeGapMm = !isNaN(gapMm) && gapMm > 0 ? gapMm : 0;
  var gapCm = safeGapMm / 10;
  var safeGsm = !isNaN(gsm) && gsm > 0 ? gsm : 135;

  var mTopMm = marginsMm && !isNaN(marginsMm.top) && marginsMm.top > 0 ? marginsMm.top : 0;
  var mBottomMm = marginsMm && !isNaN(marginsMm.bottom) && marginsMm.bottom > 0 ? marginsMm.bottom : 0;
  var mRightMm = marginsMm && !isNaN(marginsMm.right) && marginsMm.right > 0 ? marginsMm.right : 0;
  var mLeftMm = marginsMm && !isNaN(marginsMm.left) && marginsMm.left > 0 ? marginsMm.left : 0;

  var mTopCm = roundNum(mTopMm / 10, 2);
  var mBottomCm = roundNum(mBottomMm / 10, 2);
  var mRightCm = roundNum(mRightMm / 10, 2);
  var mLeftCm = roundNum(mLeftMm / 10, 2);

  if (
    isNaN(lengthCm) || lengthCm <= 0 ||
    isNaN(widthCm) || widthCm <= 0 ||
    isNaN(paperLengthCm) || paperLengthCm <= 0 ||
    isNaN(paperWidthCm) || paperWidthCm <= 0
  ) {
    return {
      valid: false,
      engine: rustWasmExports ? "rust-wasm" : "js-fallback",
      countX: 0,
      countY: 0,
      quantity: 0,
      paperCount: 0,
      gapMm: safeGapMm,
      gapCm: gapCm,
      gsm: safeGsm,
      marginTopMm: mTopMm,
      marginBottomMm: mBottomMm,
      marginRightMm: mRightMm,
      marginLeftMm: mLeftMm,
      marginTopCm: mTopCm,
      marginBottomCm: mBottomCm,
      marginRightCm: mRightCm,
      marginLeftCm: mLeftCm,
      effectivePaperLengthCm: 0,
      effectivePaperWidthCm: 0,
      usedLengthCm: 0,
      usedWidthCm: 0,
      unusedLengthCm: 0,
      unusedWidthCm: 0,
      paperAreaCm2: 0,
      productAreaCm2: 0,
      usedNetAreaCm2: 0,
      arrangedBoundingAreaCm2: 0,
      gapWasteAreaCm2: 0,
      edgeWasteAreaCm2: 0,
      totalWasteAreaCm2: 0,
      wastePercent: 0,
      efficiencyPercent: 0,
      totalWasteAllSheetsCm2: 0,
      surplusProducts: 0,
      guillotineCuts: 0,
      totalWeightKg: 0
    };
  }

  var wasm = initRustWasmEngine();

  var rawEffLengthCm = wasm
    ? wasm.calc_effective_paper_span_cm(paperLengthCm, mLeftMm, mRightMm)
    : Math.max(0, paperLengthCm - mLeftCm - mRightCm);
  var rawEffWidthCm = wasm
    ? wasm.calc_effective_paper_span_cm(paperWidthCm, mTopMm, mBottomMm)
    : Math.max(0, paperWidthCm - mTopCm - mBottomCm);

  var effectivePaperLengthCm = roundNum(rawEffLengthCm, 2);
  var effectivePaperWidthCm = roundNum(rawEffWidthCm, 2);

  var countX = wasm
    ? wasm.calc_items_along_axis(effectivePaperLengthCm, lengthCm, safeGapMm)
    : (effectivePaperLengthCm >= lengthCm
      ? Math.floor((effectivePaperLengthCm + gapCm + 1e-9) / (lengthCm + gapCm))
      : 0);

  var countY = wasm
    ? wasm.calc_items_along_axis(effectivePaperWidthCm, widthCm, safeGapMm)
    : (effectivePaperWidthCm >= widthCm
      ? Math.floor((effectivePaperWidthCm + gapCm + 1e-9) / (widthCm + gapCm))
      : 0);

  var quantity = countX * countY;
  var safeProductCount = !isNaN(productCount) && productCount > 0 ? productCount : 0;
  var paperCount = quantity > 0 && safeProductCount > 0
    ? Math.ceil(safeProductCount / quantity)
    : 0;

  var rawUsedL = wasm
    ? wasm.calc_used_span_cm(countX, lengthCm, safeGapMm)
    : (countX > 0 ? countX * lengthCm + (countX - 1) * gapCm : 0);
  var rawUsedW = wasm
    ? wasm.calc_used_span_cm(countY, widthCm, safeGapMm)
    : (countY > 0 ? countY * widthCm + (countY - 1) * gapCm : 0);

  var usedLengthCm = roundNum(rawUsedL, 2);
  var usedWidthCm = roundNum(rawUsedW, 2);

  // Total unused margin + offcut along length & width of full sheet
  var unusedLengthCm = roundNum(Math.max(0, paperLengthCm - usedLengthCm), 2);
  var unusedWidthCm = roundNum(Math.max(0, paperWidthCm - usedWidthCm), 2);

  // Remaining offcut inside the printable area (excluding the 4 defined margins)
  var innerUnusedLengthCm = roundNum(Math.max(0, effectivePaperLengthCm - usedLengthCm), 2);
  var innerUnusedWidthCm = roundNum(Math.max(0, effectivePaperWidthCm - usedWidthCm), 2);

  var paperAreaCm2 = roundNum(paperLengthCm * paperWidthCm, 2);
  var productAreaCm2 = roundNum(lengthCm * widthCm, 2);
  var usedNetAreaCm2 = roundNum(quantity * productAreaCm2, 2);
  var arrangedBoundingAreaCm2 = roundNum(usedLengthCm * usedWidthCm, 2);

  var gapWasteAreaCm2 = roundNum(Math.max(0, arrangedBoundingAreaCm2 - usedNetAreaCm2), 2);
  var edgeWasteAreaCm2 = roundNum(Math.max(0, paperAreaCm2 - arrangedBoundingAreaCm2), 2);
  var totalWasteAreaCm2 = roundNum(Math.max(0, paperAreaCm2 - usedNetAreaCm2), 2);

  var rawWastePct = wasm
    ? wasm.calc_waste_percent(paperLengthCm, paperWidthCm, lengthCm, widthCm, quantity)
    : (paperAreaCm2 > 0 ? (totalWasteAreaCm2 / paperAreaCm2) * 100 : 0);

  var wastePercent = roundNum(rawWastePct, 1);
  var efficiencyPercent = paperAreaCm2 > 0
    ? roundNum(100 - wastePercent, 1)
    : 0;

  var baseCuts = wasm
    ? wasm.calc_guillotine_cuts(countX, countY, safeGapMm, innerUnusedLengthCm, innerUnusedWidthCm)
    : (quantity > 0
      ? ((countX - 1) + (countY - 1)) * (safeGapMm > 0 ? 2 : 1) +
        (innerUnusedLengthCm > 0 ? 1 : 0) +
        (innerUnusedWidthCm > 0 ? 1 : 0)
      : 0);

  var marginTrimCuts =
    quantity > 0
      ? (mLeftMm > 0 ? 1 : 0) +
        (mRightMm > 0 && innerUnusedLengthCm <= 0.001 ? 1 : 0) +
        (mTopMm > 0 ? 1 : 0) +
        (mBottomMm > 0 && innerUnusedWidthCm <= 0.001 ? 1 : 0)
      : 0;

  var guillotineCuts = baseCuts + marginTrimCuts;

  var rawWeightKg = wasm
    ? wasm.calc_total_paper_weight_kg(paperLengthCm, paperWidthCm, safeGsm, paperCount || 1)
    : ((paperLengthCm * paperWidthCm) / 10000) * safeGsm * (paperCount || 1) / 1000;

  var totalWeightKg = roundNum(rawWeightKg, 2);
  var totalWasteAllSheetsCm2 = roundNum(totalWasteAreaCm2 * (paperCount || 1), 2);
  var surplusProducts = paperCount > 0 ? (paperCount * quantity) - safeProductCount : 0;

  return {
    valid: true,
    engine: wasm ? "rust-wasm" : "js-fallback",
    itemLengthCm: lengthCm,
    itemWidthCm: widthCm,
    paperLengthCm: paperLengthCm,
    paperWidthCm: paperWidthCm,
    effectivePaperLengthCm: effectivePaperLengthCm,
    effectivePaperWidthCm: effectivePaperWidthCm,
    marginTopMm: mTopMm,
    marginBottomMm: mBottomMm,
    marginRightMm: mRightMm,
    marginLeftMm: mLeftMm,
    marginTopCm: mTopCm,
    marginBottomCm: mBottomCm,
    marginRightCm: mRightCm,
    marginLeftCm: mLeftCm,
    countX: countX,
    countY: countY,
    quantity: quantity,
    paperCount: paperCount,
    productCount: safeProductCount,
    gapMm: safeGapMm,
    gapCm: gapCm,
    gsm: safeGsm,
    usedLengthCm: usedLengthCm,
    usedWidthCm: usedWidthCm,
    unusedLengthCm: unusedLengthCm,
    unusedWidthCm: unusedWidthCm,
    innerUnusedLengthCm: innerUnusedLengthCm,
    innerUnusedWidthCm: innerUnusedWidthCm,
    paperAreaCm2: paperAreaCm2,
    productAreaCm2: productAreaCm2,
    usedNetAreaCm2: usedNetAreaCm2,
    arrangedBoundingAreaCm2: arrangedBoundingAreaCm2,
    gapWasteAreaCm2: gapWasteAreaCm2,
    edgeWasteAreaCm2: edgeWasteAreaCm2,
    totalWasteAreaCm2: totalWasteAreaCm2,
    wastePercent: wastePercent,
    efficiencyPercent: efficiencyPercent,
    totalWasteAllSheetsCm2: totalWasteAllSheetsCm2,
    surplusProducts: surplusProducts,
    guillotineCuts: guillotineCuts,
    totalWeightKg: totalWeightKg
  };
}

function computeSheetLayout(params) {
  var length = parseFloat(params.length);
  var width = parseFloat(params.width);
  var paperLength = parseFloat(params.paperLength);
  var paperWidth = parseFloat(params.paperWidth);
  var gapMm = params.gapMm !== undefined && params.gapMm !== "" ? parseFloat(params.gapMm) : 0;
  var productCount = params.productCount !== undefined && params.productCount !== "" ? parseFloat(params.productCount) : 0;
  var gsm = params.gsm !== undefined && params.gsm !== "" ? parseFloat(params.gsm) : 135;
  var orientation = params.orientation || "normal";

  var marginsMm = {
    top: params.marginTopMm !== undefined && params.marginTopMm !== "" ? parseFloat(params.marginTopMm) : 0,
    bottom: params.marginBottomMm !== undefined && params.marginBottomMm !== "" ? parseFloat(params.marginBottomMm) : 0,
    right: params.marginRightMm !== undefined && params.marginRightMm !== "" ? parseFloat(params.marginRightMm) : 0,
    left: params.marginLeftMm !== undefined && params.marginLeftMm !== "" ? parseFloat(params.marginLeftMm) : 0
  };

  var normalLayout = computeLayoutForOrientation(length, width, paperLength, paperWidth, gapMm, productCount, gsm, marginsMm);
  var rotatedLayout = computeLayoutForOrientation(width, length, paperLength, paperWidth, gapMm, productCount, gsm, marginsMm);

  var activeLayout = normalLayout;
  var isRotated = false;

  if (orientation === "rotated") {
    activeLayout = rotatedLayout;
    isRotated = true;
  } else if (orientation === "auto") {
    if (rotatedLayout.quantity > normalLayout.quantity) {
      activeLayout = rotatedLayout;
      isRotated = true;
    }
  }

  return {
    active: activeLayout,
    normal: normalLayout,
    rotated: rotatedLayout,
    isRotated: isRotated,
    orientationMode: orientation
  };
}

var STANDARD_PAPERS = [
  { code: "A4", name: "A4 استاندارد", length: 29.7, width: 21 },
  { code: "B4", name: "B4 (25×35)", length: 35, width: 25 },
  { code: "A3", name: "A3 استاندارد", length: 42, width: 29.7 },
  { code: "B2", name: "50×70 (B2)", length: 70, width: 50 },
  { code: "60x90", name: "60×90 شیت", length: 90, width: 60 },
  { code: "B1", name: "70×100 (B1)", length: 100, width: 70 }
];

function computeStandardSheetsComparison(lengthCm, widthCm, gapMm, productCount, gsm, marginsMm) {
  var rows = [];
  var bestCode = null;
  var lowestWaste = 101;
  var m = marginsMm || { top: 0, bottom: 0, right: 0, left: 0 };

  for (var i = 0; i < STANDARD_PAPERS.length; i++) {
    var sp = STANDARD_PAPERS[i];
    var res = computeSheetLayout({
      length: lengthCm,
      width: widthCm,
      paperLength: sp.length,
      paperWidth: sp.width,
      gapMm: gapMm,
      productCount: productCount,
      gsm: gsm,
      marginTopMm: m.top,
      marginBottomMm: m.bottom,
      marginRightMm: m.right,
      marginLeftMm: m.left,
      orientation: "auto"
    });
    var act = res.active;
    if (act.valid && act.quantity > 0 && act.wastePercent < lowestWaste) {
      lowestWaste = act.wastePercent;
      bestCode = sp.code;
    }
    rows.push({
      code: sp.code,
      name: sp.name,
      paperLength: sp.length,
      paperWidth: sp.width,
      quantity: act.quantity,
      paperCount: act.paperCount,
      arrangedSize: act.usedLengthCm + "×" + act.usedWidthCm + " cm",
      wastePercent: act.wastePercent,
      efficiencyPercent: act.efficiencyPercent,
      guillotineCuts: act.guillotineCuts,
      isRotated: res.isRotated,
      isBest: false
    });
  }

  for (var j = 0; j < rows.length; j++) {
    if (rows[j].code === bestCode) {
      rows[j].isBest = true;
    }
  }
  return rows;
}

var currentOrientationMode = "normal";
var showCutDimensions = true;

function setOrientationMode(mode) {
  currentOrientationMode = mode;
  if (typeof document !== "undefined") {
    var btns = document.querySelectorAll("[data-orientation-btn]");
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      var isSelected = btn.getAttribute("data-orientation-btn") === mode;
      btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
      btn.classList.toggle("active", isSelected);
    }
  }
  calculateQuantity();
}

function applyPaperPreset(pLength, pWidth, label) {
  if (typeof document === "undefined") return;
  var plInput = document.getElementById("paperLength");
  var pwInput = document.getElementById("paperWidth");
  var plRange = document.getElementById("paperLengthRange");
  var pwRange = document.getElementById("paperWidthRange");
  if (plInput && pwInput) {
    plInput.value = pLength;
    pwInput.value = pWidth;
  }
  if (plRange) plRange.value = pLength;
  if (pwRange) pwRange.value = pWidth;
  calculateQuantity();
}

function applyGapPreset(gapMillimeters) {
  if (typeof document === "undefined") return;
  var gapInput = document.getElementById("gap");
  var gapRange = document.getElementById("gapRange");
  if (gapInput) gapInput.value = gapMillimeters;
  if (gapRange) gapRange.value = gapMillimeters;
  calculateQuantity();
}

function applyMarginPreset(topMm, bottomMm, rightMm, leftMm, presetKey) {
  if (typeof document === "undefined") return;
  var mt = document.getElementById("marginTop");
  var mb = document.getElementById("marginBottom");
  var mr = document.getElementById("marginRight");
  var ml = document.getElementById("marginLeft");
  if (mt) mt.value = topMm;
  if (mb) mb.value = bottomMm;
  if (mr) mr.value = rightMm;
  if (ml) ml.value = leftMm;

  var btns = document.querySelectorAll("[data-margin-preset]");
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle("active", btns[i].getAttribute("data-margin-preset") === presetKey);
  }
  calculateQuantity();
}

function toggleDimensionsOverlay() {
  showCutDimensions = !showCutDimensions;
  if (typeof document !== "undefined") {
    var toggleBtn = document.getElementById("toggleDimensionsBtn");
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-pressed", showCutDimensions ? "true" : "false");
      toggleBtn.classList.toggle("active", showCutDimensions);
    }
  }
  calculateQuantity();
}

function setTextIfPresent(id, text) {
  if (typeof document === "undefined") return;
  var el = document.getElementById(id);
  if (el) {
    el.textContent = text;
  }
}

function inspectCellLive(index, col, row, xCm, yCm, wCm, hCm) {
  setTextIfPresent(
    "liveCellInspector",
    "محصول #" + index +
      " (ستون " + col + "، ردیف " + row + ") · مختصات شروع برش از لبه ورق: X=" +
      roundNum(xCm * 10, 1) + "mm , Y=" + roundNum(yCm * 10, 1) +
      "mm · ابعاد: " + wCm + "×" + hCm + " cm"
  );
}

function getMarginValuesFromDom() {
  if (typeof document === "undefined") {
    return { top: 0, bottom: 0, right: 0, left: 0 };
  }
  var mtEl = document.getElementById("marginTop");
  var mbEl = document.getElementById("marginBottom");
  var mrEl = document.getElementById("marginRight");
  var mlEl = document.getElementById("marginLeft");
  return {
    top: mtEl && mtEl.value !== "" ? parseFloat(mtEl.value) : 0,
    bottom: mbEl && mbEl.value !== "" ? parseFloat(mbEl.value) : 0,
    right: mrEl && mrEl.value !== "" ? parseFloat(mrEl.value) : 0,
    left: mlEl && mlEl.value !== "" ? parseFloat(mlEl.value) : 0
  };
}

function calculateQuantity() {
  if (typeof document === "undefined") return;

  var lengthEl = document.getElementById("length");
  var widthEl = document.getElementById("width");
  var paperLengthEl = document.getElementById("paperLength");
  var paperWidthEl = document.getElementById("paperWidth");
  var productCountEl = document.getElementById("productCount");
  var gapEl = document.getElementById("gap");
  var gsmEl = document.getElementById("paperGsm");

  var length = lengthEl ? parseFloat(lengthEl.value) : NaN;
  var width = widthEl ? parseFloat(widthEl.value) : NaN;
  var paperLength = paperLengthEl ? parseFloat(paperLengthEl.value) : NaN;
  var paperWidth = paperWidthEl ? parseFloat(paperWidthEl.value) : NaN;
  var productCount = productCountEl ? parseFloat(productCountEl.value) : NaN;
  var gapMm = gapEl && gapEl.value !== "" ? parseFloat(gapEl.value) : 0;
  var gsm = gsmEl && gsmEl.value !== "" ? parseFloat(gsmEl.value) : 135;
  var margins = getMarginValuesFromDom();

  // Keep range sliders synced with number inputs
  var syncMap = [
    ["lengthRange", length],
    ["widthRange", width],
    ["paperLengthRange", paperLength],
    ["paperWidthRange", paperWidth],
    ["gapRange", gapMm]
  ];
  for (var s = 0; s < syncMap.length; s++) {
    var rEl = document.getElementById(syncMap[s][0]);
    if (rEl && !isNaN(syncMap[s][1])) {
      rEl.value = syncMap[s][1];
    }
  }

  var result = computeSheetLayout({
    length: length,
    width: width,
    paperLength: paperLength,
    paperWidth: paperWidth,
    gapMm: gapMm,
    productCount: productCount,
    gsm: gsm,
    marginTopMm: margins.top,
    marginBottomMm: margins.bottom,
    marginRightMm: margins.right,
    marginLeftMm: margins.left,
    orientation: currentOrientationMode
  });

  var active = result.active;

  var quantityEl = document.getElementById("quantity");
  var paperCountEl = document.getElementById("paperCount");

  if (quantityEl) {
    quantityEl.value = active.valid ? active.quantity : 0;
  }
  if (paperCountEl) {
    paperCountEl.value = active.valid ? active.paperCount : 0;
  }

  // Update KPI strip
  setTextIfPresent("kpiQuantity", active.valid ? String(active.quantity) : "0");
  setTextIfPresent("kpiGridBreakdown", active.valid ? active.countX + " × " + active.countY + " ردیف/ستون" : "0 × 0");
  setTextIfPresent("kpiPaperCount", active.valid ? String(active.paperCount) : "0");
  setTextIfPresent(
    "kpiSurplusInfo",
    active.valid && active.paperCount > 0
      ? "کل تولید: " + (active.paperCount * active.quantity) + " عدد (" + active.surplusProducts + " اضافه)"
      : "بر اساس تیراژ درخواستی"
  );

  setTextIfPresent(
    "kpiArrangedSize",
    active.valid && active.quantity > 0
      ? active.usedLengthCm + " × " + active.usedWidthCm + " cm"
      : "0 × 0 cm"
  );
  setTextIfPresent(
    "kpiArrangedMm",
    active.valid && active.quantity > 0
      ? roundNum(active.usedLengthCm * 10, 1) + " × " + roundNum(active.usedWidthCm * 10, 1) + " میلی‌متر"
      : "بدون چیدمان"
  );

  setTextIfPresent("kpiWastePercent", active.valid ? active.wastePercent + "%" : "0%");
  setTextIfPresent("kpiEfficiencyPercent", active.valid ? "بهره‌وری مفید: " + active.efficiencyPercent + "%" : "بهره‌وری: 0%");

  // Detailed metrics
  setTextIfPresent("detailPaperSize", active.valid ? active.paperLengthCm + " × " + active.paperWidthCm + " سانتی‌متر (" + active.paperAreaCm2 + " cm²)" : "—");
  setTextIfPresent(
    "detailMarginsFourSides",
    active.valid
      ? "بالا: " + active.marginTopMm + "mm · پایین: " + active.marginBottomMm + "mm · راست: " + active.marginRightMm + "mm · چپ: " + active.marginLeftMm + "mm (سطح قابل چاپ: \u200E" + active.effectivePaperLengthCm + "×" + active.effectivePaperWidthCm + " cm)"
      : "—"
  );
  setTextIfPresent("detailArrangedSize", active.valid ? active.usedLengthCm + " × " + active.usedWidthCm + " سانتی‌متر (" + active.arrangedBoundingAreaCm2 + " cm²)" : "—");
  setTextIfPresent("detailUnusedMargins", active.valid ? "طول: " + active.unusedLengthCm + " cm · عرض: " + active.unusedWidthCm + " cm" : "—");
  setTextIfPresent("detailGapMm", active.valid ? active.gapMm + " میلی‌متر (" + active.gapCm + " سانتی‌متر)" : "0 میلی‌متر");
  setTextIfPresent("detailEdgeWasteArea", active.valid ? active.edgeWasteAreaCm2 + " cm²" : "0 cm²");
  setTextIfPresent("detailGapWasteArea", active.valid ? active.gapWasteAreaCm2 + " cm²" : "0 cm²");
  setTextIfPresent("detailTotalWasteArea", active.valid ? active.totalWasteAreaCm2 + " cm² (" + active.wastePercent + "%)" : "0 cm² (0%)");
  setTextIfPresent("detailAllSheetsWaste", active.valid ? active.totalWasteAllSheetsCm2 + " cm²" : "0 cm²");
  setTextIfPresent("detailGuillotineCuts", active.valid ? active.guillotineCuts + " خط برش در هر ورق" : "0 خط برش");
  setTextIfPresent("detailPaperWeightKg", active.valid ? active.totalWeightKg + " کیلوگرم (گرماژ " + active.gsm + "g)" : "0 کیلوگرم");

  // Orientation comparison
  setTextIfPresent("normalModeCount", result.normal.valid ? result.normal.quantity + " عدد در ورق (" + result.normal.wastePercent + "% پرتی)" : "—");
  setTextIfPresent("rotatedModeCount", result.rotated.valid ? result.rotated.quantity + " عدد در ورق (" + result.rotated.wastePercent + "% پرتی)" : "—");

  // Sync paper preset active buttons
  var presetBtns = document.querySelectorAll("[data-paper-preset]");
  for (var p = 0; p < presetBtns.length; p++) {
    var pBtn = presetBtns[p];
    var pCode = pBtn.getAttribute("data-paper-preset");
    var matchesPreset =
      (pCode === "A4" && paperLength === 29.7 && paperWidth === 21) ||
      (pCode === "B4" && paperLength === 35 && paperWidth === 25) ||
      (pCode === "A3" && paperLength === 42 && paperWidth === 29.7) ||
      (pCode === "B2" && paperLength === 70 && paperWidth === 50) ||
      (pCode === "60x90" && paperLength === 90 && paperWidth === 60) ||
      (pCode === "B1" && paperLength === 100 && paperWidth === 70);
    pBtn.classList.toggle("active", matchesPreset);
  }

  // Sync gap preset active buttons
  var gapBtns = document.querySelectorAll("[data-gap-preset]");
  for (var g = 0; g < gapBtns.length; g++) {
    var gBtn = gapBtns[g];
    var gVal = parseFloat(gBtn.getAttribute("data-gap-preset"));
    gBtn.classList.toggle("active", !isNaN(gapMm) && gVal === gapMm);
  }

  // Sync margin preset active buttons
  var mBtns = document.querySelectorAll("[data-margin-preset]");
  for (var mIdx = 0; mIdx < mBtns.length; mIdx++) {
    var mBtn = mBtns[mIdx];
    var mKey = mBtn.getAttribute("data-margin-preset");
    var matchesMargin =
      (mKey === "0" && margins.top === 0 && margins.bottom === 0 && margins.right === 0 && margins.left === 0) ||
      (mKey === "5" && margins.top === 5 && margins.bottom === 5 && margins.right === 5 && margins.left === 5) ||
      (mKey === "10" && margins.top === 10 && margins.bottom === 10 && margins.right === 10 && margins.left === 10) ||
      (mKey === "gripper" && margins.top === 12 && margins.bottom === 5 && margins.right === 5 && margins.left === 5);
    mBtn.classList.toggle("active", matchesMargin);
  }

  // Update visual progress bar
  var effBar = document.getElementById("efficiencyBarFill");
  var wasteBar = document.getElementById("wasteBarFill");
  if (effBar && wasteBar) {
    effBar.style.width = (active.valid ? active.efficiencyPercent : 0) + "%";
    wasteBar.style.width = (active.valid ? active.wastePercent : 0) + "%";
  }

  renderSheetVisualization(result);
  renderLiveSheetComparisonMatrix(length, width, gapMm, productCount, gsm, paperLength, paperWidth, margins);
  saveSettingsToLocalStorage();
}

function renderLiveSheetComparisonMatrix(lengthCm, widthCm, gapMm, productCount, gsm, curPaperL, curPaperW, marginsMm) {
  if (typeof document === "undefined") return;
  var tbody = document.getElementById("liveSheetMatrixBody");
  if (!tbody) return;

  if (isNaN(lengthCm) || lengthCm <= 0 || isNaN(widthCm) || widthCm <= 0) {
    tbody.innerHTML = '<tr><td colspan="6">برای مشاهده مقایسه زنده سایزهای استاندارد، ابعاد محصول را وارد کنید.</td></tr>';
    return;
  }

  var rows = computeStandardSheetsComparison(lengthCm, widthCm, gapMm, productCount, gsm, marginsMm);
  var html = [];

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var isCurrent = r.paperLength === curPaperL && r.paperWidth === curPaperW;
    var rowClass = isCurrent ? "matrix-row-active" : "";
    html.push(
      '<tr class="' + rowClass + '">' +
        '<td><strong>' + r.name + '</strong>' + (r.isBest ? ' <span class="best-choice-label">· کمترین پرتی</span>' : '') + '</td>' +
        '<td class="mono-num" dir="ltr">' + r.paperLength + ' × ' + r.paperWidth + ' cm</td>' +
        '<td class="mono-num">' + r.quantity + ' عدد' + (r.isRotated ? ' (چرخش)' : '') + '</td>' +
        '<td class="mono-num" dir="ltr">' + r.arrangedSize + '</td>' +
        '<td class="mono-num ' + (r.wastePercent <= 20 ? 'low-waste-text' : 'waste-text') + '">' + r.wastePercent + '%</td>' +
        '<td>' +
          '<button type="button" class="preset-btn ' + (isCurrent ? 'active' : '') + '" onclick="applyPaperPreset(' + r.paperLength + ', ' + r.paperWidth + ', \'' + r.code + '\')">' +
            (isCurrent ? 'انتخاب شده' : 'انتخاب ورق') +
          '</button>' +
        '</td>' +
      '</tr>'
    );
  }

  tbody.innerHTML = html.join("");
}

function renderSheetVisualization(result) {
  if (typeof document === "undefined") return;
  var svgContainer = document.getElementById("sheetCanvasContainer");
  var statusBanner = document.getElementById("sheetStatusText");
  if (!svgContainer) return;

  var active = result.active;

  if (!active.valid) {
    if (statusBanner) {
      statusBanner.textContent = "لطفاً مقادیر معتبر و بزرگ‌تر از صفر برای ابعاد کاغذ و محصول وارد کنید.";
    }
    svgContainer.innerHTML =
      '<div class="empty-canvas-state">' +
      '<p class="empty-title">ابعاد کاغذ و محصول را وارد کنید</p>' +
      '<p class="empty-subtitle">پس از وارد کردن طول و عرض، نقشه چیدمان، ابعاد کارهای چیده شده و میزان پرتی کاغذ به صورت زنده ترسیم می‌شود.</p>' +
      '</div>';
    return;
  }

  if (active.quantity === 0) {
    if (statusBanner) {
      statusBanner.textContent =
        "ابعاد محصول (" + active.itemLengthCm + "×" + active.itemWidthCm + " cm) بزرگ‌تر از سطح قابل چاپ کاغذ پس از کسر مارجین (" +
        active.effectivePaperLengthCm + "×" + active.effectivePaperWidthCm + " cm) است.";
    }
    svgContainer.innerHTML =
      '<div class="empty-canvas-state error-state">' +
      '<p class="empty-title">محصول در فضای قابل چاپ کاغذ جا نمی‌شود (ظرفیت: ۰ عدد)</p>' +
      '<p class="empty-subtitle">ابعاد کاغذ را بزرگ‌تر انتخاب کنید، مارجین چهار طرف را کاهش دهید یا گزینه «چرخش ۹۰ درجه» را امتحان نمایید.</p>' +
      '</div>';
    return;
  }

  var hasMargins =
    active.marginTopMm > 0 ||
    active.marginBottomMm > 0 ||
    active.marginRightMm > 0 ||
    active.marginLeftMm > 0;

  if (statusBanner) {
    statusBanner.textContent =
      "چیدمان فعال: " +
      active.countX + " ستون × " + active.countY + " ردیف = " + active.quantity + " محصول در هر ورق" +
      (result.isRotated ? " (چرخش ۹۰ درجه فعال)" : "") +
      " · سایز چیده شده: \u200E" + active.usedLengthCm + "×" + active.usedWidthCm + " cm\u200E" +
      (hasMargins
        ? " · مارجین (چپ/راست/بالا/پایین): \u200E" +
          active.marginLeftMm + "/" + active.marginRightMm + "/" + active.marginTopMm + "/" + active.marginBottomMm + " mm\u200E"
        : " · پرتی حاشیه: \u200E" + active.unusedLengthCm + " cm\u200E طول و \u200E" + active.unusedWidthCm + " cm\u200E عرض");
  }

  setTextIfPresent(
    "liveCellInspector",
    "نشانگر ماوس را روی هر خانه از نقشه ببرید تا مختصات دقیق برش میلی‌متری آن محصول را ببینید (کل خطوط برش گیوتین: " +
      active.guillotineCuts + " خط)."
  );

  // SVG coordinate system
  var viewW = 760;
  var viewH = 440;
  var padTop = 52;
  var padRight = 64;
  var padBottom = 52;
  var padLeft = 64;

  var availW = viewW - padLeft - padRight;
  var availH = viewH - padTop - padBottom;

  var scale = Math.min(availW / active.paperLengthCm, availH / active.paperWidthCm);
  var sheetW = roundNum(active.paperLengthCm * scale, 2);
  var sheetH = roundNum(active.paperWidthCm * scale, 2);

  var originX = roundNum(padLeft + (availW - sheetW) / 2, 2);
  var originY = roundNum(padTop + (availH - sheetH) / 2, 2);

  var mLeftPx = roundNum(active.marginLeftCm * scale, 2);
  var mTopPx = roundNum(active.marginTopCm * scale, 2);
  var effW = roundNum(active.effectivePaperLengthCm * scale, 2);
  var effH = roundNum(active.effectivePaperWidthCm * scale, 2);

  var gridOriginX = roundNum(originX + mLeftPx, 2);
  var gridOriginY = roundNum(originY + mTopPx, 2);

  var usedW = roundNum(active.usedLengthCm * scale, 2);
  var usedH = roundNum(active.usedWidthCm * scale, 2);

  var itemW = active.itemLengthCm * scale;
  var itemH = active.itemWidthCm * scale;
  var gapPx = active.gapCm * scale;

  var isDark = currentThemeMode === "dark";
  var svgPalette = isDark
    ? {
        wasteBg: "#2A1215",
        wasteStroke: "#7F1D1D",
        gapBg: "#2E2310",
        gapStroke: "#D97706",
        sheetStroke: "#94A3B8",
        safeAreaFill: "rgba(15, 23, 42, 0.55)",
        safeAreaStroke: "#94A3B8",
        cellFill: "#0C4A6E",
        cellStroke: "#38BDF8",
        cellText: "#E0F2FE",
        calloutStroke: "#94A3B8",
        calloutBoxFill: "#1E293B",
        calloutBoxStroke: "#475569",
        calloutText: "#F8FAFC",
        accentStroke: "#38BDF8",
        accentText: "#38BDF8",
        wasteCalloutStroke: "#F87171",
        wasteCalloutText: "#FCA5A5"
      }
    : {
        wasteBg: "#FEF2F2",
        wasteStroke: "#FCA5A5",
        gapBg: "#FEF3C7",
        gapStroke: "#F59E0B",
        sheetStroke: "#334155",
        safeAreaFill: "rgba(255, 255, 255, 0.45)",
        safeAreaStroke: "#64748B",
        cellFill: "#E0F2FE",
        cellStroke: "#0369A1",
        cellText: "#0C4A6E",
        calloutStroke: "#334155",
        calloutBoxFill: "#F8FAFC",
        calloutBoxStroke: "#CBD5E1",
        calloutText: "#0F172A",
        accentStroke: "#0284C7",
        accentText: "#0369A1",
        wasteCalloutStroke: "#DC2626",
        wasteCalloutText: "#B91C1C"
      };

  var svgParts = [];
  svgParts.push(
    '<svg id="sheetSvg" viewBox="0 0 ' + viewW + ' ' + viewH + '" role="img" aria-label="نقشه دینامیک چیدمان محصولات در کاغذ، مارجین چهار طرف و میزان پرتی">'
  );

  svgParts.push(
    '<defs>' +
      '<pattern id="wasteHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">' +
        '<rect width="10" height="10" fill="' + svgPalette.wasteBg + '" />' +
        '<line x1="0" y1="0" x2="0" y2="10" stroke="' + svgPalette.wasteStroke + '" stroke-width="2.5" />' +
      '</pattern>' +
      '<pattern id="gapPattern" width="6" height="6" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">' +
        '<rect width="6" height="6" fill="' + svgPalette.gapBg + '" />' +
        '<line x1="0" y1="0" x2="0" y2="6" stroke="' + svgPalette.gapStroke + '" stroke-width="1.2" opacity="0.45" />' +
      '</pattern>' +
    '</defs>'
  );

  // Full Paper Sheet Base (Waste Hatched Background)
  svgParts.push(
    '<rect x="' + originX + '" y="' + originY + '" width="' + sheetW + '" height="' + sheetH + '" fill="url(#wasteHatch)" stroke="' + svgPalette.sheetStroke + '" stroke-width="2" rx="2" />'
  );

  // Safe Printable Area Guide (when 4-sided margins are set)
  if (hasMargins && effW > 0 && effH > 0) {
    svgParts.push(
      '<rect x="' + gridOriginX + '" y="' + gridOriginY + '" width="' + effW + '" height="' + effH + '" fill="' + svgPalette.safeAreaFill + '" stroke="' + svgPalette.safeAreaStroke + '" stroke-width="1.2" stroke-dasharray="4,4" />'
    );
  }

  // Arranged Bounding Box inside printable area
  if (usedW > 0 && usedH > 0) {
    svgParts.push(
      '<rect x="' + gridOriginX + '" y="' + gridOriginY + '" width="' + usedW + '" height="' + usedH + '" fill="url(#gapPattern)" stroke="' + svgPalette.accentStroke + '" stroke-width="1.5" stroke-dasharray="5,3" />'
    );
  }

  var maxRenderCells = 900;
  var totalCells = active.countX * active.countY;
  var showCellLabels = totalCells <= 100 && itemW >= 34 && itemH >= 20;

  if (totalCells <= maxRenderCells) {
    var index = 1;
    for (var r = 0; r < active.countY; r++) {
      for (var c = 0; c < active.countX; c++) {
        var cx = roundNum(gridOriginX + c * (itemW + gapPx), 2);
        var cy = roundNum(gridOriginY + r * (itemH + gapPx), 2);
        var rw = roundNum(Math.max(1, itemW), 2);
        var rh = roundNum(Math.max(1, itemH), 2);
        var realXCm = roundNum(active.marginLeftCm + c * (active.itemLengthCm + active.gapCm), 2);
        var realYCm = roundNum(active.marginTopCm + r * (active.itemWidthCm + active.gapCm), 2);

        svgParts.push(
          '<g class="product-cell" onmouseenter="inspectCellLive(' +
            index + ',' + (c + 1) + ',' + (r + 1) + ',' + realXCm + ',' + realYCm + ',' + active.itemLengthCm + ',' + active.itemWidthCm +
          ')" onclick="inspectCellLive(' +
            index + ',' + (c + 1) + ',' + (r + 1) + ',' + realXCm + ',' + realYCm + ',' + active.itemLengthCm + ',' + active.itemWidthCm +
          ')">' +
            '<rect x="' + cx + '" y="' + cy + '" width="' + rw + '" height="' + rh + '" fill="' + svgPalette.cellFill + '" stroke="' + svgPalette.cellStroke + '" stroke-width="1.2" rx="1.5">' +
              '<title>محصول #' + index + ' (' + active.itemLengthCm + '×' + active.itemWidthCm + ' سانتی‌متر)</title>' +
            '</rect>'
        );

        if (showCellLabels) {
          var labelText = showCutDimensions && itemW >= 52 && itemH >= 28
            ? "\u200E" + active.itemLengthCm + "×" + active.itemWidthCm
            : String(index);
          svgParts.push(
            '<text x="' + roundNum(cx + rw / 2, 1) + '" y="' + roundNum(cy + rh / 2 + 3.5, 1) + '" direction="ltr" text-anchor="middle" fill="' + svgPalette.cellText + '" font-size="10" font-family="JetBrains Mono, monospace" font-weight="600">' +
              labelText +
            '</text>'
          );
        }
        svgParts.push('</g>');
        index++;
      }
    }
  } else {
    svgParts.push(
      '<rect x="' + gridOriginX + '" y="' + gridOriginY + '" width="' + usedW + '" height="' + usedH + '" fill="' + svgPalette.cellFill + '" stroke="' + svgPalette.cellStroke + '" stroke-width="1.5" />' +
      '<text x="' + roundNum(gridOriginX + usedW / 2, 1) + '" y="' + roundNum(gridOriginY + usedH / 2, 1) + '" text-anchor="middle" fill="' + svgPalette.cellText + '" font-size="14" font-weight="700">' +
        active.countX + ' × ' + active.countY + ' (' + active.quantity + ' محصول)' +
      '</text>'
    );
  }

  // Dimension Callouts
  if (showCutDimensions) {
    var topLineY = originY - 26;
    svgParts.push(
      '<line x1="' + originX + '" y1="' + topLineY + '" x2="' + (originX + sheetW) + '" y2="' + topLineY + '" stroke="' + svgPalette.calloutStroke + '" stroke-width="1.2" />' +
      '<line x1="' + originX + '" y1="' + (topLineY - 5) + '" x2="' + originX + '" y2="' + (originY - 4) + '" stroke="' + svgPalette.calloutStroke + '" stroke-width="1" stroke-dasharray="2,2" />' +
      '<line x1="' + (originX + sheetW) + '" y1="' + (topLineY - 5) + '" x2="' + (originX + sheetW) + '" y2="' + (originY - 4) + '" stroke="' + svgPalette.calloutStroke + '" stroke-width="1" stroke-dasharray="2,2" />' +
      '<rect x="' + roundNum(originX + sheetW / 2 - 78, 1) + '" y="' + (topLineY - 11) + '" width="156" height="20" rx="4" fill="' + svgPalette.calloutBoxFill + '" stroke="' + svgPalette.calloutBoxStroke + '" stroke-width="1" />' +
      '<text x="' + roundNum(originX + sheetW / 2, 1) + '" y="' + (topLineY + 3) + '" text-anchor="middle" fill="' + svgPalette.calloutText + '" font-size="11" font-weight="600">' +
        'طول کل کاغذ: \u200E' + active.paperLengthCm + ' cm\u200E' +
      '</text>'
    );

    var botLineY = originY + sheetH + 22;
    if (usedW > 20) {
      svgParts.push(
        '<line x1="' + gridOriginX + '" y1="' + botLineY + '" x2="' + (gridOriginX + usedW) + '" y2="' + botLineY + '" stroke="' + svgPalette.accentStroke + '" stroke-width="1.5" />' +
        '<line x1="' + gridOriginX + '" y1="' + (originY + sheetH + 4) + '" x2="' + gridOriginX + '" y2="' + (botLineY + 5) + '" stroke="' + svgPalette.accentStroke + '" stroke-width="1" />' +
        '<line x1="' + (gridOriginX + usedW) + '" y1="' + (originY + sheetH + 4) + '" x2="' + (gridOriginX + usedW) + '" y2="' + (botLineY + 5) + '" stroke="' + svgPalette.accentStroke + '" stroke-width="1" />' +
        '<text x="' + roundNum(gridOriginX + usedW / 2, 1) + '" y="' + (botLineY + 16) + '" text-anchor="middle" fill="' + svgPalette.accentText + '" font-size="11" font-weight="700">' +
          'طول چیده شده: \u200E' + active.usedLengthCm + ' cm\u200E (' + active.countX + ' عدد)' +
        '</text>'
      );
    }

    var rightWasteStart = gridOriginX + usedW;
    var rightWasteEnd = originX + sheetW;
    var wasteW = rightWasteEnd - rightWasteStart;
    var rightSideUnusedCm = roundNum(active.paperLengthCm - active.marginLeftCm - active.usedLengthCm, 2);
    if (rightSideUnusedCm > 0 && wasteW >= 18) {
      svgParts.push(
        '<line x1="' + rightWasteStart + '" y1="' + botLineY + '" x2="' + rightWasteEnd + '" y2="' + botLineY + '" stroke="' + svgPalette.wasteCalloutStroke + '" stroke-width="1.5" />' +
        '<line x1="' + rightWasteEnd + '" y1="' + (originY + sheetH + 4) + '" x2="' + rightWasteEnd + '" y2="' + (botLineY + 5) + '" stroke="' + svgPalette.wasteCalloutStroke + '" stroke-width="1" />' +
        '<text x="' + roundNum(rightWasteStart + wasteW / 2, 1) + '" y="' + (botLineY + 16) + '" text-anchor="middle" fill="' + svgPalette.wasteCalloutText + '" font-size="10.5" font-weight="700">' +
          (wasteW >= 58 ? 'پرتی: \u200E' + rightSideUnusedCm + ' cm\u200E' : '\u200E' + rightSideUnusedCm + ' cm\u200E') +
        '</text>'
      );
    }

    var leftLineX = originX - 24;
    svgParts.push(
      '<line x1="' + leftLineX + '" y1="' + originY + '" x2="' + leftLineX + '" y2="' + (originY + sheetH) + '" stroke="' + svgPalette.calloutStroke + '" stroke-width="1.2" />' +
      '<line x1="' + (leftLineX - 5) + '" y1="' + originY + '" x2="' + (originX - 4) + '" y2="' + originY + '" stroke="' + svgPalette.calloutStroke + '" stroke-width="1" />' +
      '<line x1="' + (leftLineX - 5) + '" y1="' + (originY + sheetH) + '" x2="' + (originX - 4) + '" y2="' + (originY + sheetH) + '" stroke="' + svgPalette.calloutStroke + '" stroke-width="1" />' +
      '<text x="' + (leftLineX - 10) + '" y="' + roundNum(originY + sheetH / 2, 1) + '" text-anchor="middle" fill="' + svgPalette.calloutText + '" font-size="11" font-weight="600" transform="rotate(-90 ' + (leftLineX - 10) + ' ' + roundNum(originY + sheetH / 2, 1) + ')">' +
        'عرض کاغذ: \u200E' + active.paperWidthCm + ' cm\u200E' +
      '</text>'
    );

    var rightLineX = originX + sheetW + 24;
    if (usedH > 20) {
      svgParts.push(
        '<line x1="' + rightLineX + '" y1="' + gridOriginY + '" x2="' + rightLineX + '" y2="' + (gridOriginY + usedH) + '" stroke="' + svgPalette.accentStroke + '" stroke-width="1.5" />' +
        '<line x1="' + (originX + sheetW + 4) + '" y1="' + gridOriginY + '" x2="' + (rightLineX + 5) + '" y2="' + gridOriginY + '" stroke="' + svgPalette.accentStroke + '" stroke-width="1" />' +
        '<line x1="' + (originX + sheetW + 4) + '" y1="' + (gridOriginY + usedH) + '" x2="' + (rightLineX + 5) + '" y2="' + (gridOriginY + usedH) + '" stroke="' + svgPalette.accentStroke + '" stroke-width="1" />' +
        '<text x="' + (rightLineX + 14) + '" y="' + roundNum(gridOriginY + usedH / 2, 1) + '" text-anchor="middle" fill="' + svgPalette.accentText + '" font-size="11" font-weight="700" transform="rotate(90 ' + (rightLineX + 14) + ' ' + roundNum(gridOriginY + usedH / 2, 1) + ')">' +
          'عرض چیده شده: \u200E' + active.usedWidthCm + ' cm\u200E' +
        '</text>'
      );
    }
  }

  svgParts.push('</svg>');
  svgContainer.innerHTML = svgParts.join("");
}

function buildPdfReportModel(result) {
  var active = result && result.active ? result.active : null;
  if (!active || !active.valid || active.quantity <= 0) {
    return {
      valid: false,
      filename: "sheet-layout-report.pdf",
      title: "گزارش خلاصه چیدمان و شیت‌بندی کاغذ",
      errorMessage: "ابتدا ابعاد معتبر برای کاغذ و محصول وارد کنید تا گزارش PDF تولید شود."
    };
  }

  var orientationLabel = result.isRotated ? "چرخش ۹۰ درجه" : "چیدمان عادی";
  var filename =
    "sheet-layout-" +
    active.paperLengthCm +
    "x" +
    active.paperWidthCm +
    "cm-" +
    active.quantity +
    "pcs.pdf";

  return {
    valid: true,
    filename: filename,
    title: "گزارش محاسبه و چیدمان محصولات در کاغذ",
    orientationLabel: orientationLabel,
    productSizeText: active.itemLengthCm + " × " + active.itemWidthCm + " cm",
    paperSizeText: active.paperLengthCm + " × " + active.paperWidthCm + " cm (" + active.paperAreaCm2 + " cm²)",
    marginsText:
      "بالا: " + active.marginTopMm + "mm · پایین: " + active.marginBottomMm + "mm · راست: " + active.marginRightMm + "mm · چپ: " + active.marginLeftMm + "mm",
    gapText: active.gapMm + " mm (" + active.gapCm + " cm)",
    orderCountText: active.productCount + " عدد",
    quantityPerSheetText: active.quantity + " عدد (" + active.countX + " ستون × " + active.countY + " ردیف)",
    requiredSheetsText: active.paperCount + " برگ کاغذ",
    arrangedSizeText: active.usedLengthCm + " × " + active.usedWidthCm + " cm (" + roundNum(active.usedLengthCm * 10, 1) + " × " + roundNum(active.usedWidthCm * 10, 1) + " mm)",
    unusedMarginsText: "طول: " + active.unusedLengthCm + " cm · عرض: " + active.unusedWidthCm + " cm",
    wasteSummaryText: active.totalWasteAreaCm2 + " cm² (" + active.wastePercent + "% پرتی کل ورق)",
    efficiencyText: active.efficiencyPercent + "% سطح مفید",
    edgeWasteText: active.edgeWasteAreaCm2 + " cm²",
    gapWasteText: active.gapWasteAreaCm2 + " cm²",
    totalOrderWasteText: active.totalWasteAllSheetsCm2 + " cm²",
    guillotineCutsText: active.guillotineCuts + " خط برش",
    totalWeightText: active.totalWeightKg + " kg (" + active.gsm + " gsm)"
  };
}

function createPdfBinaryFromJpeg(jpegBytes, imgWidth, imgHeight) {
  var pageW = 595.28;
  var pageH = 841.89;

  function asciiToBytes(str) {
    var arr = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
      arr[i] = str.charCodeAt(i) & 0xff;
    }
    return arr;
  }

  var chunks = [];
  var offsets = [];
  var currentOffset = 0;

  function pushBytes(bytes) {
    chunks.push(bytes);
    currentOffset += bytes.length;
  }

  function pushStr(str) {
    pushBytes(asciiToBytes(str));
  }

  function startObj(id) {
    offsets[id] = currentOffset;
    pushStr(id + " 0 obj\n");
  }

  function endObj() {
    pushStr("\nendobj\n");
  }

  pushStr("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

  startObj(1);
  pushStr("<< /Type /Catalog /Pages 2 0 R >>");
  endObj();

  startObj(2);
  pushStr("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  endObj();

  startObj(3);
  pushStr(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " +
      pageW +
      " " +
      pageH +
      "] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>"
  );
  endObj();

  startObj(4);
  pushStr(
    "<< /Type /XObject /Subtype /Image /Width " +
      imgWidth +
      " /Height " +
      imgHeight +
      " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " +
      jpegBytes.length +
      " >>\nstream\n"
  );
  pushBytes(jpegBytes);
  pushStr("\nendstream");
  endObj();

  var contentStream = "q\n" + pageW + " 0 0 " + pageH + " 0 0 cm\n/Im0 Do\nQ\n";
  startObj(5);
  pushStr("<< /Length " + contentStream.length + " >>\nstream\n" + contentStream + "endstream");
  endObj();

  var xrefOffset = currentOffset;
  pushStr("xref\n0 6\n0000000000 65535 f \n");
  for (var id = 1; id <= 5; id++) {
    var padded = String(offsets[id]);
    while (padded.length < 10) padded = "0" + padded;
    pushStr(padded + " 00000 n \n");
  }

  pushStr(
    "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" +
      xrefOffset +
      "\n%%EOF\n"
  );

  var totalBytes = new Uint8Array(currentOffset);
  var pos = 0;
  for (var c = 0; c < chunks.length; c++) {
    totalBytes.set(chunks[c], pos);
    pos += chunks[c].length;
  }
  return totalBytes;
}

function dataUrlToUint8Array(dataUrl) {
  var base64 = dataUrl.split(",")[1] || "";
  var binaryStr = atob(base64);
  var bytes = new Uint8Array(binaryStr.length);
  for (var i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

function renderSimplifiedReportCanvas(reportModel, layoutResult) {
  var canvas = document.createElement("canvas");
  var cw = 1240;
  var ch = 1754;
  canvas.width = cw;
  canvas.height = ch;
  var ctx = canvas.getContext("2d");
  var active = layoutResult.active;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, cw, ch);

  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, cw - 96, ch - 96);

  ctx.fillStyle = "#0F172A";
  ctx.fillRect(48, 48, cw - 96, 118);

  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 32px Vazirmatn, sans-serif";
  ctx.fillText(reportModel.title, cw - 88, 104);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "500 18px Vazirmatn, sans-serif";
  ctx.fillText(
    "خلاصه ابعاد چیدمان، مارجین چهار طرف، فاصله برش میلی‌متری و میزان پرتی کاغذ · حالت: " + reportModel.orientationLabel,
    cw - 88,
    142
  );

  var kpis = [
    { label: "تعداد محصول در کاغذ", val: active.quantity + " عدد", sub: active.countX + " × " + active.countY + " ردیف/ستون", color: "#0284C7" },
    { label: "تعداد کاغذ مورد نیاز", val: active.paperCount + " برگ", sub: "تیراژ: " + active.productCount + " عدد", color: "#0F172A" },
    { label: "سایز کارهای چیده شده", val: active.usedLengthCm + "×" + active.usedWidthCm + " cm", sub: roundNum(active.usedLengthCm * 10, 1) + "×" + roundNum(active.usedWidthCm * 10, 1) + " mm", color: "#0369A1" },
    { label: "میزان پرتی کاغذ", val: active.wastePercent + "%", sub: "بهره‌وری: " + active.efficiencyPercent + "%", color: "#DC2626" }
  ];

  var boxY = 198;
  var boxH = 132;
  var gapX = 20;
  var totalBoxW = cw - 176;
  var boxW = (totalBoxW - gapX * 3) / 4;

  for (var k = 0; k < kpis.length; k++) {
    var bx = cw - 88 - (k + 1) * boxW - k * gapX;
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(bx, boxY, boxW, boxH);
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, boxY, boxW, boxH);

    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = "#475569";
    ctx.font = "500 17px Vazirmatn, sans-serif";
    ctx.fillText(kpis[k].label, bx + boxW - 18, boxY + 36);

    ctx.fillStyle = kpis[k].color;
    ctx.font = "700 28px JetBrains Mono, Vazirmatn, sans-serif";
    ctx.fillText("\u200E" + kpis[k].val, bx + boxW - 18, boxY + 80);

    ctx.fillStyle = "#64748B";
    ctx.font = "500 15px Vazirmatn, sans-serif";
    ctx.fillText(kpis[k].sub, bx + boxW - 18, boxY + 112);
  }

  var diagBoxX = 88;
  var diagBoxY = 358;
  var diagBoxW = cw - 176;
  var diagBoxH = 680;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(diagBoxX, diagBoxY, diagBoxW, diagBoxH);
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(diagBoxX, diagBoxY, diagBoxW, diagBoxH);

  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#0F172A";
  ctx.font = "700 22px Vazirmatn, sans-serif";
  ctx.fillText("شماتیک چیدمان محصولات در کاغذ، مارجین چهار طرف و ناحیه پرتی", cw - 116, diagBoxY + 42);

  var padL = 110;
  var padR = 110;
  var padT = 95;
  var padB = 90;
  var availW = diagBoxW - padL - padR;
  var availH = diagBoxH - padT - padB;

  var scale = Math.min(availW / active.paperLengthCm, availH / active.paperWidthCm);
  var sheetW = active.paperLengthCm * scale;
  var sheetH = active.paperWidthCm * scale;
  var ox = diagBoxX + padL + (availW - sheetW) / 2;
  var oy = diagBoxY + padT + (availH - sheetH) / 2;

  var gx = ox + active.marginLeftCm * scale;
  var gy = oy + active.marginTopCm * scale;
  var usedW = active.usedLengthCm * scale;
  var usedH = active.usedWidthCm * scale;
  var itemW = active.itemLengthCm * scale;
  var itemH = active.itemWidthCm * scale;
  var gapPx = active.gapCm * scale;

  ctx.fillStyle = "#FEE2E2";
  ctx.fillRect(ox, oy, sheetW, sheetH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, sheetW, sheetH);
  ctx.clip();
  ctx.strokeStyle = "#FCA5A5";
  ctx.lineWidth = 1.5;
  for (var d = -sheetH; d < sheetW + sheetH; d += 14) {
    ctx.beginPath();
    ctx.moveTo(ox + d, oy);
    ctx.lineTo(ox + d - sheetH, oy + sheetH);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "#1E293B";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(ox, oy, sheetW, sheetH);

  if (usedW > 0 && usedH > 0) {
    ctx.fillStyle = "#FEF3C7";
    ctx.fillRect(gx, gy, usedW, usedH);
    ctx.strokeStyle = "#0284C7";
    ctx.lineWidth = 2;
    ctx.strokeRect(gx, gy, usedW, usedH);
  }

  var totalCells = active.countX * active.countY;
  if (totalCells <= 900) {
    var idx = 1;
    for (var r = 0; r < active.countY; r++) {
      for (var c = 0; c < active.countX; c++) {
        var cx = gx + c * (itemW + gapPx);
        var cy = gy + r * (itemH + gapPx);
        ctx.fillStyle = "#E0F2FE";
        ctx.fillRect(cx, cy, Math.max(1, itemW), Math.max(1, itemH));
        ctx.strokeStyle = "#0369A1";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(cx, cy, Math.max(1, itemW), Math.max(1, itemH));

        if (totalCells <= 100 && itemW >= 42 && itemH >= 24) {
          ctx.direction = "ltr";
          ctx.textAlign = "center";
          ctx.fillStyle = "#0C4A6E";
          ctx.font = "600 13px JetBrains Mono, monospace";
          var cellText = itemW >= 64 && itemH >= 32
            ? active.itemLengthCm + "×" + active.itemWidthCm
            : String(idx);
          ctx.fillText(cellText, cx + itemW / 2, cy + itemH / 2 + 5);
        }
        idx++;
      }
    }
  }

  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.fillStyle = "#0F172A";
  ctx.font = "700 16px Vazirmatn, sans-serif";
  ctx.fillText("طول کل کاغذ: \u200E" + active.paperLengthCm + " cm", ox + sheetW / 2, oy - 18);

  ctx.fillStyle = "#0369A1";
  ctx.fillText(
    "طول چیده شده: \u200E" + active.usedLengthCm + " cm (" + active.countX + " عدد) · پرتی طول: \u200E" + active.unusedLengthCm + " cm",
    ox + sheetW / 2,
    oy + sheetH + 34
  );

  ctx.fillStyle = "#B91C1C";
  ctx.font = "600 15px Vazirmatn, sans-serif";
  ctx.fillText(
    "عرض کاغذ: \u200E" + active.paperWidthCm + " cm · عرض چیده شده: \u200E" + active.usedWidthCm + " cm · پرتی عرض: \u200E" + active.unusedWidthCm + " cm",
    ox + sheetW / 2,
    oy + sheetH + 62
  );

  var tableY = 1072;
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#0F172A";
  ctx.font = "700 22px Vazirmatn, sans-serif";
  ctx.fillText("جدول مشخصات فنی، مارجین و تفکیک پرتی کار", cw - 88, tableY);

  var rows = [
    ["ابعاد تک محصول (طول × عرض)", reportModel.productSizeText],
    ["ابعاد کاغذ پایه (مساحت کل ورق)", reportModel.paperSizeText],
    ["مارجین چهار طرف ورق (میلی‌متر)", reportModel.marginsText],
    ["فاصله برش بین هر محصول (میلی‌متر)", reportModel.gapText],
    ["سایز کل کارهای چیده شده در ورق", reportModel.arrangedSizeText],
    ["تعداد محصولات در هر برگ کاغذ", reportModel.quantityPerSheetText],
    ["تیراژ کل سفارش و تعداد کاغذ مصرفی", reportModel.orderCountText + " ← " + reportModel.requiredSheetsText],
    ["تعداد خطوط برش گیوتین و وزن کاغذ", reportModel.guillotineCutsText + " · " + reportModel.totalWeightText],
    ["مجموع پرتی در هر ورق کاغذ (مساحت و درصد)", reportModel.wasteSummaryText],
    ["مجموع کل پرتی در تمام کاغذهای سفارش", reportModel.totalOrderWasteText]
  ];

  var rowStartY = tableY + 24;
  var rowH = 54;
  var tableX = 88;
  var tableW = cw - 176;

  for (var i = 0; i < rows.length; i++) {
    var ry = rowStartY + i * rowH;
    ctx.fillStyle = i === 8 ? "#FEF2F2" : i % 2 === 0 ? "#F8FAFC" : "#FFFFFF";
    ctx.fillRect(tableX, ry, tableW, rowH);
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.strokeRect(tableX, ry, tableW, rowH);

    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = "#334155";
    ctx.font = "500 18px Vazirmatn, sans-serif";
    ctx.fillText(rows[i][0], tableX + tableW - 24, ry + 34);

    ctx.textAlign = "left";
    ctx.fillStyle = i === 8 ? "#DC2626" : "#0F172A";
    ctx.font = "700 18px JetBrains Mono, Vazirmatn, sans-serif";
    ctx.fillText("\u200E" + rows[i][1], tableX + 24, ry + 34);
  }

  return canvas;
}

function exportPdfReport() {
  if (typeof document === "undefined") return null;

  var lengthEl = document.getElementById("length");
  var widthEl = document.getElementById("width");
  var paperLengthEl = document.getElementById("paperLength");
  var paperWidthEl = document.getElementById("paperWidth");
  var productCountEl = document.getElementById("productCount");
  var gapEl = document.getElementById("gap");
  var gsmEl = document.getElementById("paperGsm");
  var statusEl = document.getElementById("pdfExportStatus");
  var margins = getMarginValuesFromDom();

  var result = computeSheetLayout({
    length: lengthEl ? parseFloat(lengthEl.value) : NaN,
    width: widthEl ? parseFloat(widthEl.value) : NaN,
    paperLength: paperLengthEl ? parseFloat(paperLengthEl.value) : NaN,
    paperWidth: paperWidthEl ? parseFloat(paperWidthEl.value) : NaN,
    gapMm: gapEl && gapEl.value !== "" ? parseFloat(gapEl.value) : 0,
    productCount: productCountEl ? parseFloat(productCountEl.value) : NaN,
    gsm: gsmEl && gsmEl.value !== "" ? parseFloat(gsmEl.value) : 135,
    marginTopMm: margins.top,
    marginBottomMm: margins.bottom,
    marginRightMm: margins.right,
    marginLeftMm: margins.left,
    orientation: currentOrientationMode
  });

  var reportModel = buildPdfReportModel(result);

  if (!reportModel.valid) {
    if (statusEl) {
      statusEl.textContent = reportModel.errorMessage;
      statusEl.className = "pdf-export-status status-error";
      statusEl.removeAttribute("hidden");
    }
    return null;
  }

  var canvas = renderSimplifiedReportCanvas(reportModel, result);
  var jpegDataUrl = canvas.toDataURL("image/jpeg", 0.92);
  var jpegBytes = dataUrlToUint8Array(jpegDataUrl);
  var pdfBytes = createPdfBinaryFromJpeg(jpegBytes, canvas.width, canvas.height);

  var blob = new Blob([pdfBytes], { type: "application/pdf" });
  var downloadUrl = URL.createObjectURL(blob);

  var link = document.createElement("a");
  link.href = downloadUrl;
  link.download = reportModel.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(function () {
    URL.revokeObjectURL(downloadUrl);
  }, 5000);

  if (statusEl) {
    statusEl.textContent =
      "گزارش PDF با موفقیت تولید و دانلود شد: " +
      reportModel.filename +
      " (" +
      result.active.quantity +
      " عدد در ورق · سایز چیده شده " +
      result.active.usedLengthCm +
      "×" +
      result.active.usedWidthCm +
      " cm · پرتی " +
      result.active.wastePercent +
      "%)";
    statusEl.className = "pdf-export-status status-success";
    statusEl.removeAttribute("hidden");
  }

  return {
    filename: reportModel.filename,
    byteLength: pdfBytes.length
  };
}

var SETTINGS_STORAGE_KEY = "imposition_calculator_settings_v1";
var currentViewportMode = "desktop";
var currentThemeMode = "light";

function getStorageInstance(customStorage) {
  if (customStorage) return customStorage;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
  } catch (e) {
    return null;
  }
  return null;
}

function saveSettingsToLocalStorage(customStorage) {
  if (typeof document === "undefined") return null;
  var storage = getStorageInstance(customStorage);
  if (!storage || typeof storage.setItem !== "function") return null;

  var fields = [
    "length",
    "width",
    "paperLength",
    "paperWidth",
    "marginTop",
    "marginBottom",
    "marginRight",
    "marginLeft",
    "gap",
    "productCount",
    "paperGsm"
  ];
  var data = {
    orientation: currentOrientationMode,
    viewportMode: currentViewportMode,
    themeMode: currentThemeMode
  };
  var hasAnyField = false;

  for (var i = 0; i < fields.length; i++) {
    var key = fields[i];
    var el = document.getElementById(key);
    if (el && el.value !== undefined && el.value !== "") {
      data[key] = String(el.value);
      hasAnyField = true;
    }
  }

  if (!hasAnyField) return null;

  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch (e) {
    return null;
  }
}

function loadSettingsFromLocalStorage(customStorage) {
  if (typeof document === "undefined") return null;
  var storage = getStorageInstance(customStorage);
  if (!storage || typeof storage.getItem !== "function") return null;

  var raw = null;
  try {
    raw = storage.getItem(SETTINGS_STORAGE_KEY);
  } catch (e) {
    return null;
  }
  if (!raw) return null;

  var parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  var fields = [
    "length",
    "width",
    "paperLength",
    "paperWidth",
    "marginTop",
    "marginBottom",
    "marginRight",
    "marginLeft",
    "gap",
    "productCount",
    "paperGsm"
  ];

  for (var i = 0; i < fields.length; i++) {
    var key = fields[i];
    if (parsed[key] !== undefined && parsed[key] !== null && parsed[key] !== "") {
      var el = document.getElementById(key);
      if (el) {
        el.value = String(parsed[key]);
      }
    }
  }

  if (
    parsed.orientation === "normal" ||
    parsed.orientation === "rotated" ||
    parsed.orientation === "auto"
  ) {
    currentOrientationMode = parsed.orientation;
    if (typeof document.querySelectorAll === "function") {
      var buttons = document.querySelectorAll("[data-orientation-btn]");
      for (var b = 0; b < buttons.length; b++) {
        var btn = buttons[b];
        var isActive = btn.getAttribute("data-orientation-btn") === parsed.orientation;
        if (btn.classList) btn.classList.toggle("active", isActive);
        if (btn.setAttribute) btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      }
    }
  }

  if (parsed.viewportMode === "mobile" || parsed.viewportMode === "desktop") {
    toggleMobileDesktopMode(parsed.viewportMode);
  }

  if (parsed.themeMode === "dark" || parsed.themeMode === "light") {
    toggleThemeMode(parsed.themeMode);
  }

  return parsed;
}

function clearSavedSettingsFromLocalStorage(customStorage) {
  var storage = getStorageInstance(customStorage);
  if (!storage || typeof storage.removeItem !== "function") return;
  try {
    storage.removeItem(SETTINGS_STORAGE_KEY);
  } catch (e) {
    // Ignore storage removal errors
  }
}

function getThemeMode() {
  return currentThemeMode;
}

function toggleThemeMode(forceTheme) {
  if (forceTheme === "dark" || forceTheme === "light") {
    currentThemeMode = forceTheme;
  } else {
    currentThemeMode = currentThemeMode === "dark" ? "light" : "dark";
  }

  var isDark = currentThemeMode === "dark";

  if (typeof document !== "undefined") {
    if (document.documentElement && document.documentElement.setAttribute) {
      document.documentElement.setAttribute("data-theme", currentThemeMode);
    }
    if (document.body) {
      if (isDark && document.body.classList) {
        document.body.classList.add("dark-theme");
      } else if (document.body.classList) {
        document.body.classList.remove("dark-theme");
      }
      if (document.body.setAttribute) {
        document.body.setAttribute("data-theme", currentThemeMode);
      }
    }

    var themeBtn = document.getElementById("toggleThemeBtn");
    if (themeBtn) {
      themeBtn.textContent = isDark ? "حالت روشن" : "حالت تیره";
      if (themeBtn.setAttribute) {
        themeBtn.setAttribute("aria-pressed", isDark ? "true" : "false");
      }
      if (isDark && themeBtn.classList) {
        themeBtn.classList.add("active-dark-mode");
      } else if (themeBtn.classList) {
        themeBtn.classList.remove("active-dark-mode");
      }
    }
  }

  calculateQuantity();
  saveSettingsToLocalStorage();
  return currentThemeMode;
}

function getViewportMode() {
  return currentViewportMode;
}

function toggleMobileDesktopMode(forceMode) {
  if (forceMode === "mobile" || forceMode === "desktop") {
    currentViewportMode = forceMode;
  } else {
    currentViewportMode = currentViewportMode === "mobile" ? "desktop" : "mobile";
  }

  var isMobile = currentViewportMode === "mobile";

  if (typeof document !== "undefined") {
    if (document.body) {
      if (isMobile) {
        document.body.classList.add("mobile-view-mode");
        document.body.classList.remove("desktop-view-forced");
        document.body.setAttribute("data-view-mode", "mobile");
      } else {
        document.body.classList.remove("mobile-view-mode");
        document.body.classList.add("desktop-view-forced");
        document.body.setAttribute("data-view-mode", "desktop");
      }
    }

    var toggleBtn = document.getElementById("toggleViewportModeBtn");
    if (toggleBtn) {
      toggleBtn.textContent = isMobile ? "بازگشت به نسخه دسکتاپ" : "نمایش نسخه موبایل";
      toggleBtn.setAttribute("aria-pressed", isMobile ? "true" : "false");
      if (isMobile && toggleBtn.classList) {
        toggleBtn.classList.add("active-mobile-mode");
      } else if (toggleBtn.classList) {
        toggleBtn.classList.remove("active-mobile-mode");
      }
    }
  }

  saveSettingsToLocalStorage();
  return currentViewportMode;
}

function resetToSampleValues() {
  if (typeof document === "undefined") return;
  var defaults = {
    length: "10",
    width: "6",
    paperLength: "70",
    paperWidth: "50",
    gap: "2",
    productCount: "1000",
    paperGsm: "135",
    marginTop: "0",
    marginBottom: "0",
    marginRight: "0",
    marginLeft: "0"
  };
  for (var key in defaults) {
    var el = document.getElementById(key);
    if (el) el.value = defaults[key];
  }
  var statusEl = document.getElementById("pdfExportStatus");
  if (statusEl) {
    statusEl.setAttribute("hidden", "true");
    statusEl.textContent = "";
  }
  clearSavedSettingsFromLocalStorage();
  currentOrientationMode = "normal";
  setOrientationMode("normal");
}

// Wire dynamic live listeners when running in browser
if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", function () {
    loadSettingsFromLocalStorage();

    var inputIds = [
      "length",
      "width",
      "paperLength",
      "paperWidth",
      "gap",
      "productCount",
      "paperGsm",
      "marginTop",
      "marginBottom",
      "marginRight",
      "marginLeft"
    ];
    for (var i = 0; i < inputIds.length; i++) {
      var inputEl = document.getElementById(inputIds[i]);
      if (inputEl) {
        inputEl.addEventListener("input", function () {
          calculateQuantity();
        });
        inputEl.addEventListener("change", function () {
          calculateQuantity();
        });
      }
    }

    // Wire live range sliders to their corresponding number inputs
    var sliderPairs = [
      ["lengthRange", "length"],
      ["widthRange", "width"],
      ["paperLengthRange", "paperLength"],
      ["paperWidthRange", "paperWidth"],
      ["gapRange", "gap"]
    ];
    for (var j = 0; j < sliderPairs.length; j++) {
      (function (rangeId, numId) {
        var rEl = document.getElementById(rangeId);
        var nEl = document.getElementById(numId);
        if (rEl && nEl) {
          rEl.addEventListener("input", function () {
            nEl.value = rEl.value;
            calculateQuantity();
          });
        }
      })(sliderPairs[j][0], sliderPairs[j][1]);
    }

    calculateQuantity();
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    initRustWasmEngine: initRustWasmEngine,
    calculateQuantity: calculateQuantity,
    computeSheetLayout: computeSheetLayout,
    computeLayoutForOrientation: computeLayoutForOrientation,
    computeStandardSheetsComparison: computeStandardSheetsComparison,
    buildPdfReportModel: buildPdfReportModel,
    createPdfBinaryFromJpeg: createPdfBinaryFromJpeg,
    exportPdfReport: exportPdfReport,
    toggleMobileDesktopMode: toggleMobileDesktopMode,
    getViewportMode: getViewportMode,
    toggleThemeMode: toggleThemeMode,
    getThemeMode: getThemeMode,
    SETTINGS_STORAGE_KEY: SETTINGS_STORAGE_KEY,
    saveSettingsToLocalStorage: saveSettingsToLocalStorage,
    loadSettingsFromLocalStorage: loadSettingsFromLocalStorage,
    clearSavedSettingsFromLocalStorage: clearSavedSettingsFromLocalStorage
  };
}