import type { Member } from "./types";

// 役職ごとにできること。Firebase に移したときは、同じ決まりをセキュリティルールにも書く。

const isAdviser = (m: Member) => m.role === "adviser" || m.isAdmin;

/** 練習メニュー・選択肢・大会情報・エントリーの修正・参加の修正 */
export const canEditMenu = (m: Member) =>
  isAdviser(m) || ["captain", "viceCaptain", "manager"].includes(m.role);

/** 部員名簿：部員の登録・入部の承認・部員の削除 */
export const canApprove = (m: Member) => isAdviser(m) || ["captain", "manager"].includes(m.role);

/** 名簿から外せる相手（自分は外せない。顧問・開発者を外せるのは顧問・開発者だけ） */
export const canRemove = (me: Member, target: Member) =>
  canApprove(me) && me.email !== target.email && (isAdviser(me) || !isAdviser(target));

/** 役職を変える */
export const canChangeRole = (m: Member) => isAdviser(m);

/** 競技場代の料金 */
export const canEditFees = (m: Member) => isAdviser(m);

/** ゼッケン・専門種目・PB、大会記録 */
export const canEditProfileOf = (me: Member, targetEmail: string) =>
  me.email === targetEmail || isAdviser(me) || ["captain", "manager"].includes(me.role);

export const canEditRecordsOf = canEditProfileOf;

export const hasAdminMenu = (m: Member) => canEditMenu(m) || canEditFees(m);

/** 自分の記録や気分を持つ人（顧問は持たない） */
export const isAthlete = (m: Member) => m.role !== "adviser";

/** ゼッケン・専門種目・PB を持つ人（顧問とマネージャーは持たない） */
export const hasEvents = (m: Member) => isAthlete(m) && m.role !== "manager";

/** 月末の振り返りを書く人（顧問とマネージャーは書かない） */
export const writesReflection = (m: Member) => isAthlete(m) && m.role !== "manager";
