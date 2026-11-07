import { isBetter, parseMark, markToDigits } from "./marks";
import type { DbState, Member, PersonalBest } from "./types";

/** 残っている大会記録と手入力の PB から、その種目の一番良い記録を選ぶ */
export function bestFor(state: DbState, member: Member, event: string): PersonalBest | null {
  const manualMark = member.personalBests.find((p) => p.event === event)?.manualMark ?? "";
  let best: PersonalBest | null = null;
  if (manualMark) {
    const parsed = parseMark(event, markToDigits(manualMark));
    if (parsed) {
      best = {
        event,
        mark: parsed.mark,
        value: parsed.value,
        isWindAssisted: false,
        date: "",
        meetName: "",
        recordId: "",
        manualMark,
      };
    }
  }
  const records = Object.values(state.records)
    .filter((r) => r.memberId === member.email && r.event === event)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const r of records) {
    if (!best || isBetter(event, r.value, best.value)) {
      best = {
        event,
        mark: r.mark,
        value: r.value,
        isWindAssisted: r.isWindAssisted,
        date: r.date,
        meetName: r.meetName,
        recordId: r.id,
        manualMark,
      };
    }
  }
  return best;
}

/** その人の PB をまとめて計算し直す */
export function recomputeAllPBs(state: DbState, member: Member): PersonalBest[] {
  const events = new Set<string>([
    ...member.personalBests.filter((p) => p.manualMark).map((p) => p.event),
    ...Object.values(state.records)
      .filter((r) => r.memberId === member.email)
      .map((r) => r.event),
  ]);
  const list: PersonalBest[] = [];
  for (const ev of events) {
    const b = bestFor(state, member, ev);
    if (b) list.push(b);
  }
  return list;
}
