// services/dateUtils.js
// ── Safe Date Formatting ──────────────────────────────────────────────
// Android Hermes can throw or return garbage when using
// toLocaleDateString("en-US", opts) or toLocaleString with locale options.
// These helpers manually format dates to avoid Intl entirely,
// ensuring identical output on iOS and Android.

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_ABBR = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

/**
 * Format: "Sep 13, 2026"
 */
export function fmtDateShort(dateInput) {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return "-";
    return `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return "-";
  }
}

/**
 * Format: "Sun, Sep 13, 2026"
 */
export function fmtDateWithWeekday(dateInput) {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return "-";
    return `${DAY_ABBR[d.getDay()]}, ${MONTH_ABBR[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return "-";
  }
}

/**
 * Format: "Sunday, September 13"
 */
export function fmtDateLong(dateInput) {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return "-";
    return `${DAY_FULL[d.getDay()]}, ${MONTH_FULL[d.getMonth()]} ${d.getDate()}`;
  } catch {
    return "-";
  }
}

/**
 * Format: "Sep 13"
 */
export function fmtDateMonthDay(dateInput) {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return "-";
    return `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`;
  } catch {
    return "-";
  }
}

/**
 * Format: "9/13/2026" (en-US default toLocaleDateString equivalent)
 */
export function fmtDateSlash(dateInput) {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return "-";
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  } catch {
    return "-";
  }
}

/**
 * Format: "02:30 PM"
 */
export function fmtTime(dateInput) {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return "-";
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
  } catch {
    return "-";
  }
}

/**
 * Format: "Sep 13, 2026, 02:30 PM"
 */
export function fmtDateTime(dateInput) {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return "-";
    return `${fmtDateShort(d)}, ${fmtTime(d)}`;
  } catch {
    return "-";
  }
}

/**
 * Get { day: "13", month: "SEP" } for calendar-style display
 */
export function fmtDayMonth(dateInput) {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return { day: "", month: "" };
    return { day: String(d.getDate()), month: MONTH_ABBR[d.getMonth()].toUpperCase() };
  } catch {
    return { day: "", month: "" };
  }
}

// ── Safe Number Formatting ──────────────────────────────────────────────
// Android Hermes: toLocaleString(undefined, opts) can throw or return
// unformatted values. These helpers format numbers manually.

/**
 * Format number with commas and fixed decimals: "1,234.56"
 */
export function safeFmtNum(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) num = 0;
  const fixed = Math.abs(num).toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const result = decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
  return num < 0 ? `-${result}` : result;
}

/**
 * Format as Philippine peso: "₱1,234.56"
 */
export function safeFmtCurrency(num, decimals = 2) {
  return `₱${safeFmtNum(num, decimals)}`;
}

