import type { MenuItem } from "./types";

/** 「150m 5本 2セット」の部分（間は半角スペース。「×」は使わない） */
export function itemSummary(it: MenuItem): string {
  const parts: string[] = [];
  if (it.distance) parts.push(it.distance);
  if (it.reps) parts.push(`${it.reps}本`);
  if (it.sets) parts.push(`${it.sets}セット`);
  return parts.join(" ");
}

/** メニュー画面の 1 行（例：1. テンポ走 150m 5本 2セット（レスト 3分）） */
export function itemLine(it: MenuItem, no: number): string {
  const main = [it.type, itemSummary(it)].filter(Boolean).join(" ");
  return `${no}. ${main}${it.memo ? `（${it.memo}）` : ""}`;
}

/** 距離・本数の設定がいらない練習 */
export function needsDetail(type: string): boolean {
  return type !== "専門" && !type.startsWith("補強");
}
