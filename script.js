/**
 * Pure calculation engine for sheet imposition, millimeter gaps, arranged size, and paper waste.
 * Dimensions: length, width, paperLength, paperWidth in cm; gapMm in mm.
 */
function computeLayoutForOrientation(lengthCm, widthCm, paperLengthCm, paperWidthCm, gapMm, productCount) {
  var safeGapMm = !isNaN(gapMm) && gapMm > 0 ? gapMm : 0;
  var gapCm = safeGapMm / 10;

  if (
    isNaN(lengthCm) || lengthCm <= 0 ||
    isNaN(widthCm) || widthCm <= 0 ||
    isNaN(paperLengthCm) || paperLengthCm <= 0 ||
    isNaN(paperWidthCm) || paperWidthCm <= 0
  ) {
    return {
      valid: false,
      countX: 0,
      countY: 0,
      quantity: 0,
      paperCount: 0,
      gapMm: safeGapMm,
      gapCm: gapCm,
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
      surplusProducts: 0
    };
  }

  var countX = paperLengthCm >= lengthCm
    ? Math.floor((paperLengthCm + gapCm + 1e-9) / (lengthCm + gapCm))
    : 0;
  var countY = paperWidthCm >= widthCm
    ? Math.floor((paperWidthCm + gapCm + 1e-9) / (widthCm + gapCm))
    : 0;

  var quantity = countX * countY;
  var safeProductCount = !isNaN(productCount) && productCount > 0 ? productCount : 0;
  var paperCount = quantity > 0 && safeProductCount > 0
    ? Math.ceil(safeProductCount / quantity)
    : 0;

  var usedLengthCm = countX > 0 ? roundNum(countX * lengthCm + (countX - 1) * gapCm, 2) : 0;
  var usedWidthCm = countY > 0 ? roundNum(countY * widthCm + (countY - 1) * gapCm, 2) : 0;

  var unusedLengthCm = roundNum(Math.max(0, paperLengthCm - usedLengthCm), 2);
  var unusedWidthCm = roundNum(Math.max(0, paperWidthCm - usedWidthCm), 2);

  var paperAreaCm2 = roundNum(paperLengthCm * paperWidthCm, 2);
  var productAreaCm2 = roundNum(lengthCm * widthCm, 2);
  var usedNetAreaCm2 = roundNum(quantity * productAreaCm2, 2);
  var arrangedBoundingAreaCm2 = roundNum(usedLengthCm * usedWidthCm, 2);

  var gapWasteAreaCm2 = roundNum(Math.max(0, arrangedBoundingAreaCm2 - usedNetAreaCm2), 2);
  var edgeWasteAreaCm2 = roundNum(Math.max(0, paperAreaCm2 - arrangedBoundingAreaCm2), 2);
  var totalWasteAreaCm2 = roundNum(Math.max(0, paperAreaCm2 - usedNetAreaCm2), 2);

  var wastePercent = paperAreaCm2 > 0
    ? roundNum((totalWasteAreaCm2 / paperAreaCm2) * 100, 1)
    : 0;
  var efficiencyPercent = paperAreaCm2 > 0
    ? roundNum((usedNetAreaCm2 / paperAreaCm2) * 100, 1)
    : 0;

  var totalWasteAllSheetsCm2 = roundNum(totalWasteAreaCm2 * (paperCount || 1), 2);
  var surplusProducts = paperCount > 0 ? (paperCount * quantity) - safeProductCount : 0;

  return {
    valid: true,
    itemLengthCm: lengthCm,
    itemWidthCm: widthCm,
    paperLengthCm: paperLengthCm,
    paperWidthCm: paperWidthCm,
    countX: countX,
    countY: countY,
    quantity: quantity,
    paperCount: paperCount,
    productCount: safeProductCount,
    gapMm: safeGapMm,
    gapCm: gapCm,
    usedLengthCm: usedLengthCm,
    usedWidthCm: usedWidthCm,
    unusedLengthCm: unusedLengthCm,
    unusedWidthCm: unusedWidthCm,
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
    surplusProducts: surplusProducts
  };
}

function roundNum(val, decimals) {
  var factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

function computeSheetLayout(params) {
  var length = parseFloat(params.length);
  var width = parseFloat(params.width);
  var paperLength = parseFloat(params.paperLength);
  var paperWidth = parseFloat(params.paperWidth);
  var gapMm = params.gapMm !== undefined && params.gapMm !== "" ? parseFloat(params.gapMm) : 0;
  var productCount = params.productCount !== undefined && params.productCount !== "" ? parseFloat(params.productCount) : 0;
  var orientation = params.orientation || "normal"; // 'normal' | 'rotated' | 'auto'

  var normalLayout = computeLayoutForOrientation(length, width, paperLength, paperWidth, gapMm, productCount);
  var rotatedLayout = computeLayoutForOrientation(width, length, paperLength, paperWidth, gapMm, productCount);

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
      if (isSelected) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    }
  }
  calculateQuantity();
}

function applyPaperPreset(pLength, pWidth, label) {
  if (typeof document === "undefined") return;
  var plInput = document.getElementById("paperLength");
  var pwInput = document.getElementById("paperWidth");
  if (plInput && pwInput) {
    plInput.value = pLength;
    pwInput.value = pWidth;
  }
  var presetBtns = document.querySelectorAll("[data-paper-preset]");
  for (var i = 0; i < presetBtns.length; i++) {
    var btn = presetBtns[i];
    if (btn.getAttribute("data-paper-preset") === label) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  }
  calculateQuantity();
}

function applyGapPreset(gapMillimeters) {
  if (typeof document === "undefined") return;
  var gapInput = document.getElementById("gap");
  if (gapInput) {
    gapInput.value = gapMillimeters;
  }
  var gapBtns = document.querySelectorAll("[data-gap-preset]");
  for (var i = 0; i < gapBtns.length; i++) {
    var btn = gapBtns[i];
    if (parseFloat(btn.getAttribute("data-gap-preset")) === gapMillimeters) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
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

function calculateQuantity() {
  if (typeof document === "undefined") return;

  var lengthEl = document.getElementById("length");
  var widthEl = document.getElementById("width");
  var paperLengthEl = document.getElementById("paperLength");
  var paperWidthEl = document.getElementById("paperWidth");
  var productCountEl = document.getElementById("productCount");
  var gapEl = document.getElementById("gap");

  var length = lengthEl ? parseFloat(lengthEl.value) : NaN;
  var width = widthEl ? parseFloat(widthEl.value) : NaN;
  var paperLength = paperLengthEl ? parseFloat(paperLengthEl.value) : NaN;
  var paperWidth = paperWidthEl ? parseFloat(paperWidthEl.value) : NaN;
  var productCount = productCountEl ? parseFloat(productCountEl.value) : NaN;
  var gapMm = gapEl && gapEl.value !== "" ? parseFloat(gapEl.value) : 0;

  var result = computeSheetLayout({
    length: length,
    width: width,
    paperLength: paperLength,
    paperWidth: paperWidth,
    gapMm: gapMm,
    productCount: productCount,
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

  // Update KPI and detailed metrics if present in DOM
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

  // Waste breakdown details
  setTextIfPresent("detailPaperSize", active.valid ? active.paperLengthCm + " × " + active.paperWidthCm + " سانتی‌متر (" + active.paperAreaCm2 + " cm²)" : "—");
  setTextIfPresent("detailArrangedSize", active.valid ? active.usedLengthCm + " × " + active.usedWidthCm + " سانتی‌متر (" + active.arrangedBoundingAreaCm2 + " cm²)" : "—");
  setTextIfPresent("detailUnusedMargins", active.valid ? "طول: " + active.unusedLengthCm + " cm · عرض: " + active.unusedWidthCm + " cm" : "—");
  setTextIfPresent("detailGapMm", active.valid ? active.gapMm + " میلی‌متر (" + active.gapCm + " سانتی‌متر)" : "0 میلی‌متر");
  setTextIfPresent("detailEdgeWasteArea", active.valid ? active.edgeWasteAreaCm2 + " cm²" : "0 cm²");
  setTextIfPresent("detailGapWasteArea", active.valid ? active.gapWasteAreaCm2 + " cm²" : "0 cm²");
  setTextIfPresent("detailTotalWasteArea", active.valid ? active.totalWasteAreaCm2 + " cm² (" + active.wastePercent + "%)" : "0 cm² (0%)");
  setTextIfPresent("detailAllSheetsWaste", active.valid ? active.totalWasteAllSheetsCm2 + " cm²" : "0 cm²");

  // Orientation comparison banner
  setTextIfPresent("normalModeCount", result.normal.valid ? result.normal.quantity + " عدد در ورق (" + result.normal.wastePercent + "% پرتی)" : "—");
  setTextIfPresent("rotatedModeCount", result.rotated.valid ? result.rotated.quantity + " عدد در ورق (" + result.rotated.wastePercent + "% پرتی)" : "—");

  // Sync paper preset active buttons with current input values
  var presetBtns = document.querySelectorAll("[data-paper-preset]");
  for (var p = 0; p < presetBtns.length; p++) {
    var pBtn = presetBtns[p];
    var pCode = pBtn.getAttribute("data-paper-preset");
    var matchesPreset =
      (pCode === "A4" && paperLength === 29.7 && paperWidth === 21) ||
      (pCode === "A3" && paperLength === 42 && paperWidth === 29.7) ||
      (pCode === "B2" && paperLength === 70 && paperWidth === 50) ||
      (pCode === "B1" && paperLength === 100 && paperWidth === 70);
    pBtn.classList.toggle("active", matchesPreset);
  }

  // Sync gap preset active buttons with current gap value
  var gapBtns = document.querySelectorAll("[data-gap-preset]");
  for (var g = 0; g < gapBtns.length; g++) {
    var gBtn = gapBtns[g];
    var gVal = parseFloat(gBtn.getAttribute("data-gap-preset"));
    gBtn.classList.toggle("active", !isNaN(gapMm) && gVal === gapMm);
  }

  // Update visual progress bar
  var effBar = document.getElementById("efficiencyBarFill");
  var wasteBar = document.getElementById("wasteBarFill");
  if (effBar && wasteBar) {
    effBar.style.width = (active.valid ? active.efficiencyPercent : 0) + "%";
    wasteBar.style.width = (active.valid ? active.wastePercent : 0) + "%";
  }

  renderSheetVisualization(result);
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
      statusBanner.textContent = "ابعاد محصول (" + active.itemLengthCm + "×" + active.itemWidthCm + " cm) بزرگ‌تر از ابعاد کاغذ (" + active.paperLengthCm + "×" + active.paperWidthCm + " cm) است.";
    }
    svgContainer.innerHTML =
      '<div class="empty-canvas-state error-state">' +
      '<p class="empty-title">محصول در این سایز کاغذ جا نمی‌شود (ظرفیت: ۰ عدد)</p>' +
      '<p class="empty-subtitle">ابعاد کاغذ را بزرگ‌تر انتخاب کنید یا گزینه «چرخش ۹۰ درجه» را امتحان نمایید.</p>' +
      '</div>';
    return;
  }

  if (statusBanner) {
    statusBanner.textContent =
      "چیدمان فعال: " +
      active.countX + " ستون × " + active.countY + " ردیف = " + active.quantity + " محصول در هر ورق" +
      (result.isRotated ? " (چرخش ۹۰ درجه فعال)" : "") +
      " · سایز چیده شده: \u200E" + active.usedLengthCm + "×" + active.usedWidthCm + " cm\u200E" +
      " · پرتی حاشیه: \u200E" + active.unusedLengthCm + " cm\u200E طول و \u200E" + active.unusedWidthCm + " cm\u200E عرض";
  }

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

  var usedW = roundNum(active.usedLengthCm * scale, 2);
  var usedH = roundNum(active.usedWidthCm * scale, 2);

  var itemW = active.itemLengthCm * scale;
  var itemH = active.itemWidthCm * scale;
  var gapPx = active.gapCm * scale;

  var svgParts = [];
  svgParts.push(
    '<svg id="sheetSvg" viewBox="0 0 ' + viewW + ' ' + viewH + '" role="img" aria-label="نقشه دینامیک چیدمان محصولات در کاغذ و میزان پرتی">'
  );

  // Hatch pattern for waste / offcut area
  svgParts.push(
    '<defs>' +
      '<pattern id="wasteHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">' +
        '<rect width="10" height="10" fill="#FEF2F2" />' +
        '<line x1="0" y1="0" x2="0" y2="10" stroke="#FCA5A5" stroke-width="2.5" />' +
      '</pattern>' +
      '<pattern id="gapPattern" width="6" height="6" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">' +
        '<rect width="6" height="6" fill="#FEF3C7" />' +
        '<line x1="0" y1="0" x2="0" y2="6" stroke="#F59E0B" stroke-width="1.2" opacity="0.45" />' +
      '</pattern>' +
    '</defs>'
  );

  // Full Paper Sheet Base (Waste Hatched Background)
  svgParts.push(
    '<rect x="' + originX + '" y="' + originY + '" width="' + sheetW + '" height="' + sheetH + '" fill="url(#wasteHatch)" stroke="#334155" stroke-width="2" rx="2" />'
  );

  // Arranged Bounding Box (Gutter / Gap zone underneath products)
  if (usedW > 0 && usedH > 0) {
    svgParts.push(
      '<rect x="' + originX + '" y="' + originY + '" width="' + usedW + '" height="' + usedH + '" fill="url(#gapPattern)" stroke="#0284C7" stroke-width="1.5" stroke-dasharray="5,3" />'
    );
  }

  // Render individual product cells
  var maxRenderCells = 900;
  var totalCells = active.countX * active.countY;
  var showCellLabels = totalCells <= 100 && itemW >= 34 && itemH >= 20;

  if (totalCells <= maxRenderCells) {
    var index = 1;
    for (var r = 0; r < active.countY; r++) {
      for (var c = 0; c < active.countX; c++) {
        var cx = roundNum(originX + c * (itemW + gapPx), 2);
        var cy = roundNum(originY + r * (itemH + gapPx), 2);
        var rw = roundNum(Math.max(1, itemW), 2);
        var rh = roundNum(Math.max(1, itemH), 2);

        svgParts.push(
          '<g class="product-cell">' +
            '<rect x="' + cx + '" y="' + cy + '" width="' + rw + '" height="' + rh + '" fill="#E0F2FE" stroke="#0369A1" stroke-width="1.2" rx="1.5">' +
              '<title>محصول #' + index + ' (' + active.itemLengthCm + '×' + active.itemWidthCm + ' سانتی‌متر)</title>' +
            '</rect>'
        );

        if (showCellLabels) {
          var labelText = showCutDimensions && itemW >= 52 && itemH >= 28
            ? "\u200E" + active.itemLengthCm + "×" + active.itemWidthCm
            : String(index);
          svgParts.push(
            '<text x="' + roundNum(cx + rw / 2, 1) + '" y="' + roundNum(cy + rh / 2 + 3.5, 1) + '" direction="ltr" text-anchor="middle" fill="#0C4A6E" font-size="10" font-family="JetBrains Mono, monospace" font-weight="600">' +
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
      '<rect x="' + originX + '" y="' + originY + '" width="' + usedW + '" height="' + usedH + '" fill="#E0F2FE" stroke="#0369A1" stroke-width="1.5" />' +
      '<text x="' + roundNum(originX + usedW / 2, 1) + '" y="' + roundNum(originY + usedH / 2, 1) + '" text-anchor="middle" fill="#0C4A6E" font-size="14" font-weight="700">' +
        active.countX + ' × ' + active.countY + ' (' + active.quantity + ' محصول)' +
      '</text>'
    );
  }

  // Dimension Callouts
  if (showCutDimensions) {
    // 1. Top callout: Full Paper Length (cm)
    var topLineY = originY - 26;
    svgParts.push(
      '<line x1="' + originX + '" y1="' + topLineY + '" x2="' + (originX + sheetW) + '" y2="' + topLineY + '" stroke="#334155" stroke-width="1.2" />' +
      '<line x1="' + originX + '" y1="' + (topLineY - 5) + '" x2="' + originX + '" y2="' + (originY - 4) + '" stroke="#334155" stroke-width="1" stroke-dasharray="2,2" />' +
      '<line x1="' + (originX + sheetW) + '" y1="' + (topLineY - 5) + '" x2="' + (originX + sheetW) + '" y2="' + (originY - 4) + '" stroke="#334155" stroke-width="1" stroke-dasharray="2,2" />' +
      '<rect x="' + roundNum(originX + sheetW / 2 - 78, 1) + '" y="' + (topLineY - 11) + '" width="156" height="20" rx="4" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1" />' +
      '<text x="' + roundNum(originX + sheetW / 2, 1) + '" y="' + (topLineY + 3) + '" text-anchor="middle" fill="#0F172A" font-size="11" font-weight="600">' +
        'طول کل کاغذ: \u200E' + active.paperLengthCm + ' cm\u200E' +
      '</text>'
    );

    // 2. Bottom callout: Arranged Products Length + Right Unused Margin Waste
    var botLineY = originY + sheetH + 22;
    if (usedW > 20) {
      svgParts.push(
        '<line x1="' + originX + '" y1="' + botLineY + '" x2="' + (originX + usedW) + '" y2="' + botLineY + '" stroke="#0284C7" stroke-width="1.5" />' +
        '<line x1="' + originX + '" y1="' + (originY + sheetH + 4) + '" x2="' + originX + '" y2="' + (botLineY + 5) + '" stroke="#0284C7" stroke-width="1" />' +
        '<line x1="' + (originX + usedW) + '" y1="' + (originY + sheetH + 4) + '" x2="' + (originX + usedW) + '" y2="' + (botLineY + 5) + '" stroke="#0284C7" stroke-width="1" />' +
        '<text x="' + roundNum(originX + usedW / 2, 1) + '" y="' + (botLineY + 16) + '" text-anchor="middle" fill="#0369A1" font-size="11" font-weight="700">' +
          'طول چیده شده: \u200E' + active.usedLengthCm + ' cm\u200E (' + active.countX + ' عدد)' +
        '</text>'
      );
    }

    var wasteW = sheetW - usedW;
    if (active.unusedLengthCm > 0 && wasteW >= 18) {
      svgParts.push(
        '<line x1="' + (originX + usedW) + '" y1="' + botLineY + '" x2="' + (originX + sheetW) + '" y2="' + botLineY + '" stroke="#DC2626" stroke-width="1.5" />' +
        '<line x1="' + (originX + sheetW) + '" y1="' + (originY + sheetH + 4) + '" x2="' + (originX + sheetW) + '" y2="' + (botLineY + 5) + '" stroke="#DC2626" stroke-width="1" />' +
        '<text x="' + roundNum(originX + usedW + wasteW / 2, 1) + '" y="' + (botLineY + 16) + '" text-anchor="middle" fill="#B91C1C" font-size="10.5" font-weight="700">' +
          (wasteW >= 58 ? 'پرتی: \u200E' + active.unusedLengthCm + ' cm\u200E' : '\u200E' + active.unusedLengthCm + ' cm\u200E') +
        '</text>'
      );
    }

    // 3. Left callout: Full Paper Width (cm)
    var leftLineX = originX - 24;
    svgParts.push(
      '<line x1="' + leftLineX + '" y1="' + originY + '" x2="' + leftLineX + '" y2="' + (originY + sheetH) + '" stroke="#334155" stroke-width="1.2" />' +
      '<line x1="' + (leftLineX - 5) + '" y1="' + originY + '" x2="' + (originX - 4) + '" y2="' + originY + '" stroke="#334155" stroke-width="1" />' +
      '<line x1="' + (leftLineX - 5) + '" y1="' + (originY + sheetH) + '" x2="' + (originX - 4) + '" y2="' + (originY + sheetH) + '" stroke="#334155" stroke-width="1" />' +
      '<text x="' + (leftLineX - 10) + '" y="' + roundNum(originY + sheetH / 2, 1) + '" text-anchor="middle" fill="#0F172A" font-size="11" font-weight="600" transform="rotate(-90 ' + (leftLineX - 10) + ' ' + roundNum(originY + sheetH / 2, 1) + ')">' +
        'عرض کاغذ: \u200E' + active.paperWidthCm + ' cm\u200E' +
      '</text>'
    );

    // 4. Right callout: Arranged Width (cm)
    var rightLineX = originX + sheetW + 24;
    if (usedH > 20) {
      svgParts.push(
        '<line x1="' + rightLineX + '" y1="' + originY + '" x2="' + rightLineX + '" y2="' + (originY + usedH) + '" stroke="#0284C7" stroke-width="1.5" />' +
        '<line x1="' + (originX + sheetW + 4) + '" y1="' + originY + '" x2="' + (rightLineX + 5) + '" y2="' + originY + '" stroke="#0284C7" stroke-width="1" />' +
        '<line x1="' + (originX + sheetW + 4) + '" y1="' + (originY + usedH) + '" x2="' + (rightLineX + 5) + '" y2="' + (originY + usedH) + '" stroke="#0284C7" stroke-width="1" />' +
        '<text x="' + (rightLineX + 14) + '" y="' + roundNum(originY + usedH / 2, 1) + '" text-anchor="middle" fill="#0369A1" font-size="11" font-weight="700" transform="rotate(90 ' + (rightLineX + 14) + ' ' + roundNum(originY + usedH / 2, 1) + ')">' +
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
    totalOrderWasteText: active.totalWasteAllSheetsCm2 + " cm²"
  };
}

/**
 * Wraps a JPEG byte array into a valid single-page A4 PDF 1.4 binary document.
 */
function createPdfBinaryFromJpeg(jpegBytes, imgWidth, imgHeight) {
  var pageW = 595.28; // A4 width in pt
  var pageH = 841.89; // A4 height in pt

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

  // Header
  pushStr("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

  // 1: Catalog
  startObj(1);
  pushStr("<< /Type /Catalog /Pages 2 0 R >>");
  endObj();

  // 2: Pages
  startObj(2);
  pushStr("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  endObj();

  // 3: Page
  startObj(3);
  pushStr(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " +
      pageW +
      " " +
      pageH +
      "] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>"
  );
  endObj();

  // 4: Image XObject (JPEG)
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

  // 5: Page Content Stream
  var contentStream = "q\n" + pageW + " 0 0 " + pageH + " 0 0 cm\n/Im0 Do\nQ\n";
  startObj(5);
  pushStr("<< /Length " + contentStream.length + " >>\nstream\n" + contentStream + "endstream");
  endObj();

  // Cross-reference table
  var xrefOffset = currentOffset;
  pushStr("xref\n0 6\n0000000000 65535 f \n");
  for (var id = 1; id <= 5; id++) {
    var padded = String(offsets[id]);
    while (padded.length < 10) padded = "0" + padded;
    pushStr(padded + " 00000 n \n");
  }

  // Trailer
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

  // White A4 background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, cw, ch);

  // Outer subtle border
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, cw - 96, ch - 96);

  // Header Banner
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
    "خلاصه ابعاد چیدمان، فاصله برش میلی‌متری و میزان پرتی کاغذ · حالت: " + reportModel.orientationLabel,
    cw - 88,
    142
  );

  // 4 KPI Summary Boxes
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
    // RTL order: index 0 on the right
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

  // Section: Visual Sheet Layout Diagram
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
  ctx.fillText("شماتیک چیدمان محصولات در کاغذ و ناحیه پرتی", cw - 116, diagBoxY + 42);

  // Draw Sheet and Products inside diagram box
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

  var usedW = active.usedLengthCm * scale;
  var usedH = active.usedWidthCm * scale;
  var itemW = active.itemLengthCm * scale;
  var itemH = active.itemWidthCm * scale;
  var gapPx = active.gapCm * scale;

  // Base paper sheet (waste background)
  ctx.fillStyle = "#FEE2E2";
  ctx.fillRect(ox, oy, sheetW, sheetH);

  // Diagonal hatch lines on waste area
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

  // Arranged bounding box (gap amber zone)
  if (usedW > 0 && usedH > 0) {
    ctx.fillStyle = "#FEF3C7";
    ctx.fillRect(ox, oy, usedW, usedH);
    ctx.strokeStyle = "#0284C7";
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, usedW, usedH);
  }

  // Draw product cells
  var totalCells = active.countX * active.countY;
  if (totalCells <= 900) {
    var idx = 1;
    for (var r = 0; r < active.countY; r++) {
      for (var c = 0; c < active.countX; c++) {
        var cx = ox + c * (itemW + gapPx);
        var cy = oy + r * (itemH + gapPx);
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

  // Dimension Callouts around Sheet
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

  // Section: Simplified Specifications & Waste Breakdown Table
  var tableY = 1072;
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#0F172A";
  ctx.font = "700 22px Vazirmatn, sans-serif";
  ctx.fillText("جدول مشخصات فنی و تفکیک پرتی کار", cw - 88, tableY);

  var rows = [
    ["ابعاد تک محصول (طول × عرض)", reportModel.productSizeText],
    ["ابعاد کاغذ پایه (مساحت کل ورق)", reportModel.paperSizeText],
    ["فاصله برش بین هر محصول (میلی‌متر)", reportModel.gapText],
    ["سایز کل کارهای چیده شده در ورق", reportModel.arrangedSizeText],
    ["تعداد محصولات در هر برگ کاغذ", reportModel.quantityPerSheetText],
    ["تیراژ کل سفارش و تعداد کاغذ مصرفی", reportModel.orderCountText + " ← " + reportModel.requiredSheetsText],
    ["حاشیه اضافه مانده در طول و عرض کاغذ", reportModel.unusedMarginsText],
    ["مساحت پرتی کناره‌ها + فاصله بین محصولات", "کناره: " + reportModel.edgeWasteText + " · فاصله برش: " + reportModel.gapWasteText],
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
  var statusEl = document.getElementById("pdfExportStatus");

  var result = computeSheetLayout({
    length: lengthEl ? parseFloat(lengthEl.value) : NaN,
    width: widthEl ? parseFloat(widthEl.value) : NaN,
    paperLength: paperLengthEl ? parseFloat(paperLengthEl.value) : NaN,
    paperWidth: paperWidthEl ? parseFloat(paperWidthEl.value) : NaN,
    gapMm: gapEl && gapEl.value !== "" ? parseFloat(gapEl.value) : 0,
    productCount: productCountEl ? parseFloat(productCountEl.value) : NaN,
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

function resetToSampleValues() {
  if (typeof document === "undefined") return;
  var defaults = {
    length: "10",
    width: "6",
    paperLength: "70",
    paperWidth: "50",
    gap: "2",
    productCount: "1000"
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
  currentOrientationMode = "normal";
  setOrientationMode("normal");
}

// Wire dynamic live listeners when running in browser
if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", function () {
    var inputIds = ["length", "width", "paperLength", "paperWidth", "gap", "productCount"];
    for (var i = 0; i < inputIds.length; i++) {
      var inputEl = document.getElementById(inputIds[i]);
      if (inputEl) {
        inputEl.addEventListener("input", function () {
          calculateQuantity();
        });
      }
    }
    calculateQuantity();
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    calculateQuantity: calculateQuantity,
    computeSheetLayout: computeSheetLayout,
    computeLayoutForOrientation: computeLayoutForOrientation,
    buildPdfReportModel: buildPdfReportModel,
    createPdfBinaryFromJpeg: createPdfBinaryFromJpeg,
    exportPdfReport: exportPdfReport
  };
}