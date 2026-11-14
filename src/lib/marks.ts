// 種目の一覧と、記録の書き方（数字だけ打つと「.」「:」が入る）

export type EventKind = "time" | "distance" | "points";

export const EVENT_GROUPS: { name: string; kind: EventKind; events: string[] }[] = [
  { name: "短距離", kind: "time", events: ["100m", "200m", "400m"] },
  { name: "ハードル", kind: "time", events: ["100mH", "110mH", "400mH"] },
  { name: "中長距離", kind: "time", events: ["800m", "1500m", "3000m", "5000m", "3000mSC"] },
  { name: "リレー", kind: "time", events: ["4継", "マイル"] },
  { name: "跳躍", kind: "distance", events: ["走高跳", "棒高跳", "走幅跳", "三段跳"] },
  { name: "投てき", kind: "distance", events: ["砲丸投", "円盤投", "ハンマー投", "やり投"] },
  { name: "混成", kind: "points", events: ["四種競技", "七種競技", "八種競技"] },
];

export const ALL_EVENTS = EVENT_GROUPS.flatMap((g) => g.events);

/** 前の種目名 → 今の種目名（保存済みのデータは読み込むときに読みかえる） */
const OLD_EVENT_NAMES: Record<string, string> = { "4×100mリレー": "4継", "4×400mリレー": "マイル" };
export const renameEvent = (e: string) => OLD_EVENT_NAMES[e] ?? e;

/** 風速を入れる種目 */
export const WIND_EVENTS = ["100m", "200m", "100mH", "110mH", "走幅跳", "三段跳"];

export function kindOf(event: string): EventKind {
  return EVENT_GROUPS.find((g) => g.events.includes(event))?.kind ?? "time";
}

/** 記録は小さいほど良いか */
export function lowerIsBetter(event: string): boolean {
  return kindOf(event) === "time";
}

export function isBetter(event: string, a: number, b: number): boolean {
  return lowerIsBetter(event) ? a < b : a > b;
}

/** 数字だけ残す。全角の数字（０〜９）は半角に直してから使う */
export function onlyDigits(v: string, max = 6): string {
  return v
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[^0-9]/g, "")
    .slice(0, max);
}

/** 打っている途中の表示（1148 → 11.48、43520 → 4:35.20、521 → 5.21） */
export function liveMark(event: string, d: string): string {
  if (!d) return "";
  const k = kindOf(event);
  if (k === "points" || d.length <= 2) return d;
  const cs = d.slice(-2);
  if (k === "distance" || d.length <= 4) return `${Number(d.slice(0, -2))}.${cs}`;
  return `${Number(d.slice(0, -4))}:${d.slice(-4, -2)}.${cs}`;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 数字から保存する形と数値を作る。足りないときは null */
export function parseMark(event: string, d: string): { mark: string; value: number } | null {
  const k = kindOf(event);
  if (!d) return null;
  const n = Number(d);
  if (k === "points") return { mark: `${n}点`, value: n };
  if (d.length < 3) return null;
  if (k === "distance") {
    const value = n / 100;
    return { mark: `${pad2(Math.floor(n / 100))}.${pad2(n % 100)}m`, value };
  }
  const cs = n % 100;
  const rest = Math.floor(n / 100);
  const sec = rest % 100;
  const min = Math.floor(rest / 100);
  if (sec >= 60) return null;
  return { mark: `${pad2(min)}:${pad2(sec)}.${pad2(cs)}`, value: min * 60 + sec + cs / 100 };
}

/** 表示用：1 分未満のタイムは「00:」を付けない（00:12.05 → 12.05）。保存する形は変えない */
export function showMark(mark: string): string {
  return mark.replace(/^00:/, "");
}

/** 保存した形から、入力欄の数字に戻す */
export function markToDigits(mark: string): string {
  if (!mark) return "";
  const d = mark.replace(/[^0-9]/g, "").replace(/^0+(?=\d{3})/, "");
  return d;
}

/** PB の差（例：-0.04 秒、+0.12m） */
export function diffLabel(event: string, before: number, after: number): string {
  const k = kindOf(event);
  const diff = after - before;
  const sign = diff > 0 ? "+" : "−";
  const abs = Math.abs(diff);
  if (k === "points") return `${sign}${Math.round(abs)}点`;
  if (k === "distance") return `${sign}${abs.toFixed(2)}m`;
  return `${sign}${abs.toFixed(2)} 秒`;
}

/** 風速の数字（12 → 1.2） */
export function liveWind(d: string): string {
  if (!d) return "";
  return d.length <= 1 ? d : `${Number(d.slice(0, -1))}.${d.slice(-1)}`;
}

export function windValue(d: string, minus: boolean): number | null {
  if (!d) return null;
  const v = Number(d.length === 1 ? `0.${d}` : liveWind(d));
  return minus ? -v : v;
}

export function windLabel(w: number | null): string {
  if (w == null) return "";
  return `${w >= 0 ? "+" : "−"}${Math.abs(w).toFixed(1)}`;
}

/** スタブロ（425 → 4.25） */
export function liveSeconds(d: string): string {
  if (!d) return "";
  return d.length <= 2 ? d : `${Number(d.slice(0, -2))}.${d.slice(-2)}`;
}

export function secondsValue(d: string): number | null {
  if (d.length < 3) return null;
  return Number(d) / 100;
}

export function secondsToDigits(v: number): string {
  return String(Math.round(v * 100));
}

/** グラフの目盛り用（11.48、4:35.20、5.21、2500） */
export function formatValue(event: string, v: number): string {
  const k = kindOf(event);
  if (k === "points") return `${Math.round(v)}`;
  if (k === "distance") return v.toFixed(2);
  const m = Math.floor(v / 60);
  const s = v - m * 60;
  return m ? `${m}:${s.toFixed(2).padStart(5, "0")}` : s.toFixed(2);
}

/** 組・レーンのかわりにピット（A・B）を選ぶ種目 */
export const PIT_EVENTS = EVENT_GROUPS.find((g) => g.name === "跳躍")!.events;
export const PITS = ["A", "B"];
/** 試技順を入れる種目（フィールド競技：跳躍と投てき） */
export const FIELD_EVENTS = EVENT_GROUPS.filter((g) => g.name === "跳躍" || g.name === "投てき").flatMap((g) => g.events);
/** 組もピットもなく、試技順だけの種目（投てき） */
export const ORDER_ONLY_EVENTS = EVENT_GROUPS.find((g) => g.name === "投てき")!.events;

/** 組・レーンの文字（2組4レーン、Aピット・試技順5、1組・試技順3）。なにもなければ空 */
export function heatLaneLabel(l?: { heat?: number; lane?: number; pit?: string; order?: number; callTime?: string; startTime?: string }): string {
  if (!l) return "";
  const place = l.pit ? `${l.pit}ピット` : `${l.heat ? `${l.heat}組` : ""}${l.lane ? `${l.lane}レーン` : ""}`;
  const order = l.order ? `試技順${l.order}` : "";
  const call = l.callTime ? `招集${timeLabel(l.callTime)}` : "";
  const start = l.startTime ? `競技${timeLabel(l.startTime)}` : "";
  return [place, order, call, start].filter(Boolean).join("・");
}

/** "09:30" → "9:30" */
const timeLabel = (t: string) => t.replace(/^0(\d)/, "$1");
