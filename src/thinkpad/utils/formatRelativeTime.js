/** Relative-time via built-in Intl — largest unit that yields ≥ 1. */
export function formatRelativeTime(raw) {
  if (!raw) return "";
  const ts = new Date(raw).getTime();
  if (!Number.isFinite(ts)) return "";
  const diffSec = Math.round((ts - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const ladder = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
    [2629800, "week"],
    [31557600, "month"],
    [Infinity, "year"],
  ];
  const abs = Math.abs(diffSec);
  let unit = "year";
  let value = diffSec;
  let prevDivisor = 1;
  for (const [threshold, name] of ladder) {
    if (abs < threshold) {
      unit = name;
      value = Math.round(diffSec / prevDivisor);
      break;
    }
    prevDivisor = threshold;
  }
  if (unit === "year") value = Math.round(diffSec / 31557600);
  return rtf.format(value, unit);
}
