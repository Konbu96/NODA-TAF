// データの形。docs/07_data-model.md に合わせている。

export type Role = "adviser" | "captain" | "viceCaptain" | "manager" | "member";
export type MemberStatus = "pending" | "approved" | "rejected";

export type PersonalBest = {
  event: string;
  mark: string;
  value: number;
  isWindAssisted: boolean;
  date: string;
  meetName: string;
  recordId: string;
  manualMark: string;
};

export type Member = {
  email: string;
  name: string;
  status: MemberStatus;
  role: Role;
  isAdmin: boolean;
  graduationYear: number | null;
  bibNumber: string;
  /** 「男」「女」。まだ選んでいなければ空 */
  gender: string;
  /** 休みの曜日（例：「月曜日」）。まだ選んでいなければ空 */
  restDay: string;
  events: string[];
  personalBests: PersonalBest[];
  stabroBests: Partial<Record<StabroDistance, number>>;
  createdAt: string;
  updatedAt: string;
};

export type MenuItem = {
  type: string;
  distance: string;
  reps: number;
  sets: number;
  memo: string;
};

export type PracticeMenu = {
  date: string;
  place: string;
  warmUp: string[];
  items: MenuItem[];
  note: string;
  isStadium: boolean;
  hasStabro: boolean;
  updatedBy: string;
  updatedAt: string;
};

export type Attendance = { going: boolean; updatedBy: string; updatedAt: string };

export type PracticeOptions = {
  places: string[];
  warmUps: string[];
  types: string[];
  distances: string[];
};

export type Fees = { juniorHigh: number; highSchool: number; winterExtra: number };
export type Winter = { isOn: boolean; updatedBy: string; updatedAt: string };

export type RecordDoc = {
  id: string;
  memberId: string;
  date: string;
  meetId: string;
  meetName: string;
  event: string;
  mark: string;
  value: number;
  wind: number | null;
  isWindAssisted: boolean;
  isPB: boolean;
  updatedBy: string;
  updatedAt: string;
};

export type Meet = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  venue: string;
  guidelineUrl: string;
  updatedBy: string;
  updatedAt: string;
};

export type Entry = { events: string[]; updatedBy: string; updatedAt: string };

export type Reflection = {
  memberId: string;
  month: string;
  lastGoal: string;
  achievement: number | null;
  review: string;
  submittedAt: string;
};

export type Goal = { memberId: string; month: string; goal: string; submittedAt: string };

export type MoodKind = "great" | "good" | "normal" | "sleepy" | "tired" | "legPain" | "sick";
export type Mood = { memberId: string; date: string; mood: MoodKind; createdAt: string };

export type StabroDistance = "30m" | "60m" | "80m";
export type StabroSession = {
  id: string;
  memberId: string;
  date: string;
  runs: Partial<Record<StabroDistance, number[]>>;
  bests: Partial<Record<StabroDistance, number>>;
  enteredBy: string;
  updatedAt: string;
};

export type DbState = {
  members: Record<string, Member>;
  menus: Record<string, PracticeMenu>;
  attendance: Record<string, Record<string, Attendance>>;
  options: PracticeOptions;
  /** アップの選択肢ごとの中身（例：「アクティベーション」→ 種目の一覧）。書いていないものは無い */
  warmUpDetails: Record<string, string>;
  fees: Fees;
  winter: Winter;
  sheetsUrl: string;
  records: Record<string, RecordDoc>;
  meets: Record<string, Meet>;
  entries: Record<string, Record<string, Entry>>;
  reflections: Record<string, Reflection>;
  goals: Record<string, Goal>;
  moods: Record<string, Mood>;
  stabro: Record<string, StabroSession>;
};
