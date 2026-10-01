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
 * Safely parse a date input (Date, ISO string, timestamp, or formatted string like "Sep 13, 2026")
 * into a valid Date object without relying on engine-specific string parsing (fixing Android Hermes).
 */
export function parseDateSafe(input) {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input !== "string") return null;

  const str = input.trim();
  if (!str || str === "-") return null;

  // Pure numeric timestamp string (milliseconds or seconds)
  if (/^\d{10,13}$/.test(str)) {
    const num = parseInt(str, 10);
    const d = new Date(str.length === 10 ? num * 1000 : num);
    if (!isNaN(d.getTime())) return d;
  }

  // 1. Try standard Date constructor (handles ISO-8601 strings like 2026-09-13T... or 2026-09-13)
  const direct = new Date(str);
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  // 2. Parse "MMM DD, YYYY" or "MMMM DD, YYYY" (e.g. "Sep 13, 2026" or "October 15, 2026")
  const mmmMatch = str.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (mmmMatch) {
    const mStr = mmmMatch[1].toLowerCase();
    const day = parseInt(mmmMatch[2], 10);
    const year = parseInt(mmmMatch[3], 10);
    const mIndex = MONTH_ABBR.findIndex(m => m.toLowerCase() === mStr.slice(0, 3));
    if (mIndex !== -1 && day >= 1 && day <= 31 && year > 1900) {
      return new Date(year, mIndex, day);
    }
  }

  // 3. Parse "MM/DD/YYYY" or "M/D/YYYY"
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10) - 1;
    const day = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year > 1900) {
      return new Date(year, month, day);
    }
  }

  // 4. Parse "YYYY-MM-DD"
  const dashMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dashMatch) {
    const year = parseInt(dashMatch[1], 10);
    const month = parseInt(dashMatch[2], 10) - 1;
    const day = parseInt(dashMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year > 1900) {
      return new Date(year, month, day);
    }
  }

  return null;
}

/**
 * Format: "Sep 13, 2026"
 */
export function fmtDateShort(dateInput) {
  try {
    const d = parseDateSafe(dateInput);
    if (!d) return "-";
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
    const d = parseDateSafe(dateInput);
    if (!d) return "-";
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
    const d = parseDateSafe(dateInput);
    if (!d) return "-";
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
    const d = parseDateSafe(dateInput);
    if (!d) return "-";
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
    const d = parseDateSafe(dateInput);
    if (!d) return "-";
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
    const d = parseDateSafe(dateInput);
    if (!d) return "-";
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
    const d = parseDateSafe(dateInput);
    if (!d) return "-";
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
    const d = parseDateSafe(dateInput);
    if (!d) return { day: "", month: "" };
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

