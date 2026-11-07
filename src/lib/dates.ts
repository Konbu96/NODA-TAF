// 日付は日本時間の "YYYY-MM-DD" 文字列で扱う。

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

export function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

export function addDays(date: string, n: number): string {
  const { y, m, d } = parts(date);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  const pa = parts(a);
  const pb = parts(b);
  return Math.round((Date.UTC(pa.y, pa.m - 1, pa.d) - Date.UTC(pb.y, pb.m - 1, pb.d)) / 86400000);
}

export function weekday(date: string): string {
  const { y, m, d } = parts(date);
  return WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** 10月27日（火） */
export function dayLabel(date: string): string {
  const { m, d } = parts(date);
  return `${m}月${d}日（${weekday(date)}）`;
}

/** 10/27 */
export function shortDate(date: string): string {
  const { m, d } = parts(date);
  return `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
}

/** 11月8日（日）〜9日（月） */
export function rangeLabel(start: string, end: string): string {
  if (!end || start === end) return dayLabel(start);
  const s = parts(start);
  const e = parts(end);
  const tail = s.m === e.m ? `${e.d}日（${weekday(end)}）` : dayLabel(end);
  return `${dayLabel(start)}〜${tail}`;
}

export function monthOf(date: string): number {
  return parts(date).m;
}

export function dayOf(date: string): number {
  return parts(date).d;
}

/** "2026-11" → "2026-10" */
export function prevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** "2026-12" → "2027-01" */
export function nextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function monthLabel(ym: string): string {
  return `${Number(ym.split("-")[1])}月`;
}

/** 今出ている振り返りの月。25 日から次の 25 日の前日まで同じ月。 */
export function reflectionMonth(today: string): string {
  const ym = today.slice(0, 7);
  return dayOf(today) >= 25 ? ym : prevMonth(ym);
}

/** 年度（4 月始まり） */
export function fiscalYear(date: string): number {
  const { y, m } = parts(date);
  return m >= 4 ? y : y - 1;
}

export function nowIso(): string {
  return new Date().toISOString();
}
