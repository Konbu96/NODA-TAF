import { fiscalYear } from "./dates";
import type { Fees, Member, Role } from "./types";

// 学年は保存せず、高校を卒業する年度から計算する。
export const GRADES = ["中1", "中2", "中3", "高1", "高2", "高3"] as const;
export type Grade = (typeof GRADES)[number];

export function gradeOf(graduationYear: number | null, today: string): Grade | null {
  if (graduationYear == null) return null;
  const left = graduationYear - fiscalYear(today);
  const idx = 5 - left;
  return idx >= 0 && idx <= 5 ? GRADES[idx] : null;
}

export function graduationYearFor(grade: Grade, today: string): number {
  return fiscalYear(today) + (5 - GRADES.indexOf(grade));
}

export function isJunior(grade: Grade | null): boolean {
  return grade != null && grade.startsWith("中");
}

/** 競技場代を払う人か（マネージャー・顧問は払わない） */
export function isPayer(m: Member): boolean {
  return m.role !== "manager" && m.role !== "adviser";
}

export function feeFor(m: Member, fees: Fees, winterOn: boolean, today: string): number {
  const g = gradeOf(m.graduationYear, today);
  const base = isJunior(g) ? fees.juniorHigh : fees.highSchool;
  return base + (winterOn ? fees.winterExtra : 0);
}

export const ROLE_LABEL: Record<Member["role"], string> = {
  adviser: "顧問",
  captain: "キャプテン",
  viceCaptain: "副キャプテン",
  manager: "マネージャー",
  member: "部員",
};

// 同じ学年の中で並べる役職の順
const ROLE_ORDER: Role[] = ["adviser", "captain", "viceCaptain", "manager", "member"];

// 女子を先に、性別が未入力の人は最後
const GENDER_ORDER = ["女", "男", ""];

/** 学年が上の順（高3 → 中1）→ 役職順（キャプテン → 副キャプテン → マネージャー → 部員）→ 女子・男子 → 名前順 */
export function sortMembers(list: Member[], today: string): Member[] {
  const rank = (m: Member) => {
    const g = gradeOf(m.graduationYear, today);
    return g ? GRADES.indexOf(g) : -1;
  };
  const roleRank = (m: Member) => ROLE_ORDER.indexOf(m.role);
  const genderRank = (m: Member) => GENDER_ORDER.indexOf(m.gender ?? "");
  return [...list].sort(
    (a, b) => rank(b) - rank(a) || roleRank(a) - roleRank(b) || genderRank(a) - genderRank(b) || a.name.localeCompare(b.name, "ja"),
  );
}
