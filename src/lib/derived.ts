import { diffDays, reflectionMonth, prevMonth } from "./dates";
import { canApprove, isAthlete, writesReflection } from "./permissions";
import type { DbState, Member, Meet } from "./types";

// いくつかの画面で使う計算

export function approvedMembers(db: DbState): Member[] {
  return Object.values(db.members).filter((m) => m.status === "approved");
}

export function athletes(db: DbState): Member[] {
  return approvedMembers(db).filter(isAthlete);
}

export function pendingMembers(db: DbState): Member[] {
  return Object.values(db.members).filter((m) => m.status === "pending");
}

export function latestGoal(db: DbState, email: string): string {
  const mine = Object.values(db.goals).filter((g) => g.memberId === email).sort((a, b) => b.month.localeCompare(a.month));
  return mine[0]?.goal ?? "";
}

export function isMeetOver(meet: Meet, today: string): boolean {
  return diffDays(today, meet.endDate || meet.startDate) > 0;
}

/** 終わった大会で、エントリーしたのに記録を入れていない種目 */
export function missingRecords(db: DbState, meet: Meet, email: string, today: string): string[] {
  if (!isMeetOver(meet, today)) return [];
  const events = db.entries[meet.id]?.[email]?.events ?? [];
  return events.filter(
    (ev) => !Object.values(db.records).some((r) => r.memberId === email && r.meetId === meet.id && r.event === ev),
  );
}

export function meetsWaitingInput(db: DbState, email: string, today: string): Meet[] {
  return Object.values(db.meets).filter((m) => missingRecords(db, m, email, today).length > 0);
}

export function reflectionStatus(db: DbState, me: Member, today: string) {
  const month = reflectionMonth(today);
  const submitted = !!db.reflections[`${month}_${me.email}`];
  const lastMonth = prevMonth(month);
  return { month, lastMonth, submitted, needed: writesReflection(me) && !submitted };
}

/** 角の印：管理（承認待ち）・大会（入力待ち）・マイページ（振り返り） */
export function badges(db: DbState, me: Member, today: string) {
  const pending = canApprove(me) ? pendingMembers(db).length : 0;
  const meets = isAthlete(me) ? meetsWaitingInput(db, me.email, today).length : 0;
  const reflection = reflectionStatus(db, me, today).needed ? 1 : 0;
  return { pending, meets, reflection };
}
