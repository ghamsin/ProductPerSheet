#![no_std]

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}

/// Computes the effective printable span (cm) after subtracting two opposite side margins (mm).
#[no_mangle]
pub extern "C" fn calc_effective_paper_span_cm(
    paper_cm: f64,
    margin_a_mm: f64,
    margin_b_mm: f64,
) -> f64 {
    if paper_cm <= 0.0 {
        return 0.0;
    }
    let ma_cm = if margin_a_mm > 0.0 { margin_a_mm / 10.0 } else { 0.0 };
    let mb_cm = if margin_b_mm > 0.0 { margin_b_mm / 10.0 } else { 0.0 };
    let eff = paper_cm - ma_cm - mb_cm;
    if eff > 0.0 { eff } else { 0.0 }
}

/// Computes how many items fit along a single paper axis given paper dimension (cm),
/// item dimension (cm), and inter-item cut gap (mm).
#[no_mangle]
pub extern "C" fn calc_items_along_axis(paper_cm: f64, item_cm: f64, gap_mm: f64) -> i32 {
    if paper_cm <= 0.0 || item_cm <= 0.0 || paper_cm < item_cm {
        return 0;
    }
    let safe_gap_cm = if gap_mm > 0.0 { gap_mm / 10.0 } else { 0.0 };
    let ratio = (paper_cm + safe_gap_cm + 1e-9) / (item_cm + safe_gap_cm);
    ratio as i32
}

/// Computes the total occupied span (cm) for `count` arranged items with `gap_mm` spacing.
#[no_mangle]
pub extern "C" fn calc_used_span_cm(count: i32, item_cm: f64, gap_mm: f64) -> f64 {
    if count <= 0 || item_cm <= 0.0 {
        return 0.0;
    }
    let safe_gap_cm = if gap_mm > 0.0 { gap_mm / 10.0 } else { 0.0 };
    (count as f64) * item_cm + ((count - 1) as f64) * safe_gap_cm
}

/// Computes the net waste percentage (0..100) on a single sheet.
#[no_mangle]
pub extern "C" fn calc_waste_percent(
    paper_l_cm: f64,
    paper_w_cm: f64,
    item_l_cm: f64,
    item_w_cm: f64,
    quantity: i32,
) -> f64 {
    let paper_area = paper_l_cm * paper_w_cm;
    if paper_area <= 0.0 || quantity <= 0 {
        return 0.0;
    }
    let used_area = (quantity as f64) * item_l_cm * item_w_cm;
    let waste_area = if paper_area > used_area {
        paper_area - used_area
    } else {
        0.0
    };
    (waste_area / paper_area) * 100.0
}

/// Computes the number of guillotine blade cuts required per sheet.
#[no_mangle]
pub extern "C" fn calc_guillotine_cuts(
    cols: i32,
    rows: i32,
    gap_mm: f64,
    unused_l_cm: f64,
    unused_w_cm: f64,
) -> i32 {
    if cols <= 0 || rows <= 0 {
        return 0;
    }
    let internal_x = if gap_mm > 0.0 { (cols - 1) * 2 } else { cols - 1 };
    let internal_y = if gap_mm > 0.0 { (rows - 1) * 2 } else { rows - 1 };
    let trim_x = if unused_l_cm > 0.001 { 1 } else { 0 };
    let trim_y = if unused_w_cm > 0.001 { 1 } else { 0 };
    internal_x + internal_y + trim_x + trim_y
}

/// Computes total paper weight in kilograms given sheet dimensions (cm), paper grammage (GSM g/m²), and sheet count.
#[no_mangle]
pub extern "C" fn calc_total_paper_weight_kg(
    paper_l_cm: f64,
    paper_w_cm: f64,
    gsm: f64,
    sheets: i32,
) -> f64 {
    if paper_l_cm <= 0.0 || paper_w_cm <= 0.0 || gsm <= 0.0 || sheets <= 0 {
        return 0.0;
    }
    let area_m2 = (paper_l_cm * paper_w_cm) / 10000.0;
    (area_m2 * gsm * (sheets as f64)) / 1000.0
}
