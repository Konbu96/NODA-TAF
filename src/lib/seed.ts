import { addDays, nowIso, prevMonth, reflectionMonth } from "./dates";
import { graduationYearFor, type Grade } from "./grade";
import { parseMark } from "./marks";
import { recomputeAllPBs } from "./pb";
import type { DbState, Member, MoodKind, RecordDoc, Role, StabroSession } from "./types";

// お試し用のデータ。今日の日付をもとに作るので、いつ開いても動きを試せる。

export const DEMO_ME = "you@example.com";

type P = { name: string; grade: Grade | null; role?: Role; events?: string[]; bib?: string; admin?: boolean; email?: string; status?: Member["status"] };

const PEOPLE: P[] = [
  { name: "野田 先生", grade: null, role: "adviser", email: "adviser@example.com" },
  { name: "あなた（開発者）", grade: "高1", events: ["100m", "200m"], bib: "201", admin: true, email: DEMO_ME },
  { name: "山田 太郎", grade: "高2", role: "captain", events: ["100m", "200m"], bib: "123", email: "captain@example.com" },
  { name: "高橋 花子", grade: "高2", role: "viceCaptain", events: ["走幅跳"], bib: "145", email: "vice@example.com" },
  { name: "佐藤 美咲", grade: "高2", role: "manager", email: "manager@example.com" },
  { name: "鈴木 一郎", grade: "高2", events: ["400m"], bib: "152" },
  { name: "田中 健", grade: "高2", events: ["100m", "100mH"], bib: "156" },
  { name: "伊藤 翔", grade: "高2", events: ["1500m"], bib: "158" },
  { name: "渡辺 結衣", grade: "高1", role: "manager" },
  { name: "中村 蓮", grade: "高1", events: ["100m"], bib: "202" },
  { name: "小林 陽菜", grade: "高1", events: ["200m", "400m"], bib: "203" },
  { name: "加藤 大翔", grade: "高1", events: ["走幅跳", "三段跳"], bib: "204" },
  { name: "吉田 さくら", grade: "高1", events: ["100mH"], bib: "205" },
  { name: "山本 悠真", grade: "高1", events: ["800m", "1500m"], bib: "206" },
  { name: "松本 葵", grade: "高1", events: ["砲丸投"], bib: "207" },
  { name: "井上 湊", grade: "高1", events: ["100m", "200m"], bib: "208" },
  { name: "木村 凛", grade: "高1", events: ["走高跳"], bib: "209" },
  { name: "林 颯太", grade: "高1", events: ["400m"], bib: "210" },
  { name: "清水 芽依", grade: "中3", events: ["100m"], bib: "301" },
  { name: "山口 樹", grade: "中3", events: ["走幅跳"], bib: "302" },
  { name: "森 心春", grade: "中3", events: ["800m"], bib: "303" },
  { name: "池田 律", grade: "中3", events: ["200m"], bib: "304" },
  { name: "橋本 紬", grade: "中2", events: ["100m"], bib: "311" },
  { name: "阿部 蒼", grade: "中1", events: ["100m"], bib: "321" },
  { name: "石川 結菜", grade: "中1", events: ["走幅跳"], bib: "322" },
  { name: "山崎 陸", grade: "中1", events: ["1500m"], bib: "323" },
  { name: "中島 杏", grade: "中1", events: ["100m"], bib: "324" },
  { name: "前田 海斗", grade: "中1", events: ["200m"], bib: "325" },
  { name: "藤田 晴", grade: "高1", status: "pending", email: "apply1@example.com" },
  { name: "岡田 実", grade: "中1", status: "pending", email: "apply2@example.com" },
];

const MOODS: MoodKind[] = ["great", "good", "normal", "sleepy", "tired", "legPain", "sick"];

export function createSeed(today: string): DbState {
  const now = nowIso();
  const members: Record<string, Member> = {};
  PEOPLE.forEach((p, i) => {
    const email = p.email ?? `member${String(i).padStart(2, "0")}@example.com`;
    members[email] = {
      email,
      name: p.name,
      status: p.status ?? "approved",
      role: p.role ?? "member",
      isAdmin: !!p.admin,
      graduationYear: p.grade ? graduationYearFor(p.grade, today) : null,
      bibNumber: p.bib ?? "",
      events: p.events ?? [],
      personalBests: [],
      stabroBests: {},
      createdAt: addDays(today, -200) + "T00:00:00.000Z",
      updatedAt: now,
    };
  });
  // 手入力の PB（使い始める前のベスト）
  members[DEMO_ME].personalBests = [
    { event: "100m", mark: "00:12.20", value: 12.2, isWindAssisted: false, date: "", meetName: "", recordId: "", manualMark: "00:12.20" },
    { event: "200m", mark: "00:25.40", value: 25.4, isWindAssisted: false, date: "", meetName: "", recordId: "", manualMark: "00:25.40" },
  ];

  const athletes = Object.values(members).filter((m) => m.status === "approved" && m.role !== "adviser");
  const runners = athletes.filter((m) => m.role !== "manager");

  const state: DbState = {
    members,
    menus: {},
    attendance: {},
    options: {
      places: ["学校", "競技場"],
      warmUps: ["倒立・体幹", "10種", "動き作り", "アクティベーションドリル", "ハードルドリル", "マークドリル"],
      types: ["専門", "テンポ走", "スタブロ", "並走バトン", "台ドロップ", "補強 5分間腹筋", "補強 腿上げ＋補強 10分間", "補強 2分間腹筋"],
      distances: ["100m", "120m", "150m", "200m", "250m", "300m"],
    },
    fees: { juniorHigh: 60, highSchool: 120, winterExtra: 50 },
    winter: { isOn: false, updatedBy: "", updatedAt: now },
    sheetsUrl: "",
    records: {},
    meets: {},
    entries: {},
    reflections: {},
    goals: {},
    moods: {},
    stabro: {},
  };

  // 練習メニュー
  const base = { updatedBy: "captain@example.com", updatedAt: now };
  state.menus[addDays(today, -1)] = {
    date: addDays(today, -1), place: "学校", warmUp: ["倒立・体幹", "動き作り"],
    items: [
      { type: "並走バトン", distance: "100m", reps: 4, sets: 0, memo: "" },
      { type: "専門", distance: "", reps: 0, sets: 0, memo: "" },
      { type: "補強 5分間腹筋", distance: "", reps: 0, sets: 0, memo: "" },
    ],
    note: "", isStadium: false, hasStabro: false, ...base,
  };
  state.menus[today] = {
    date: today, place: "競技場", warmUp: ["10種", "動き作り", "マークドリル"],
    items: [
      { type: "テンポ走", distance: "150m", reps: 5, sets: 2, memo: "レスト 3分" },
      { type: "専門", distance: "", reps: 0, sets: 0, memo: "" },
      { type: "スタブロ", distance: "", reps: 0, sets: 0, memo: "30m 2本、60m 2本、80m 1本" },
    ],
    note: "スパイク持参", isStadium: true, hasStabro: true, ...base,
  };
  state.menus[addDays(today, 1)] = {
    date: addDays(today, 1), place: "学校", warmUp: ["倒立・体幹", "10種"],
    items: [
      { type: "台ドロップ", distance: "", reps: 0, sets: 3, memo: "" },
      { type: "専門", distance: "", reps: 0, sets: 0, memo: "" },
      { type: "補強 腿上げ＋補強 10分間", distance: "", reps: 0, sets: 0, memo: "" },
    ],
    note: "", isStadium: false, hasStabro: false, ...base,
  };

  // 競技場の日の参加（あなたは未回答）
  const att: DbState["attendance"][string] = {};
  runners.forEach((m, i) => {
    if (m.email === DEMO_ME) return;
    if (i % 7 === 3) return; // 未回答
    att[m.email] = { going: i % 5 !== 2, updatedBy: m.email, updatedAt: now };
  });
  state.attendance[today] = att;

  // 大会
  const meet = (id: string, name: string, start: string, end: string, venue: string) => {
    state.meets[id] = { id, name, startDate: start, endDate: end, venue, guidelineUrl: "https://example.com/", updatedBy: "captain@example.com", updatedAt: now };
  };
  meet("m1", "秋季記録会", addDays(today, 9), addDays(today, 10), "維新みらいふスタジアム");
  meet("m2", "県新人大会", addDays(today, 23), addDays(today, 23), "下関陸上競技場");
  meet("m3", "市民記録会", addDays(today, -2), addDays(today, -2), "下関陸上競技場");
  meet("m4", "県選手権", addDays(today, -30), addDays(today, -29), "維新みらいふスタジアム");
  meet("m5", "地区大会", addDays(today, -58), addDays(today, -58), "防府市陸上競技場");
  meet("m6", "夏季記録会", addDays(today, -96), addDays(today, -96), "下関陸上競技場");

  const entry = (meetId: string, list: [string, string[]][]) => {
    state.entries[meetId] = {};
    for (const [email, events] of list) state.entries[meetId][email] = { events, updatedBy: email, updatedAt: now };
  };
  const runnerEntries = (meetId: string, n: number) =>
    runners.filter((m) => m.events.length).slice(0, n).map((m) => [m.email, m.events.slice(0, 1)] as [string, string[]]);
  entry("m1", [[DEMO_ME, ["100m", "200m"]], ...runnerEntries("m1", 14).filter(([e]) => e !== DEMO_ME)]);
  entry("m2", runnerEntries("m2", 8).filter(([e]) => e !== DEMO_ME));
  entry("m3", [[DEMO_ME, ["100m"]], ...runnerEntries("m3", 10).filter(([e]) => e !== DEMO_ME)]);
  entry("m4", [[DEMO_ME, ["100m", "200m"]], ...runnerEntries("m4", 12).filter(([e]) => e !== DEMO_ME)]);
  entry("m5", [[DEMO_ME, ["100m"]], ...runnerEntries("m5", 9).filter(([e]) => e !== DEMO_ME)]);
  entry("m6", [[DEMO_ME, ["100m", "200m"]], ...runnerEntries("m6", 9).filter(([e]) => e !== DEMO_ME)]);

  // 大会記録（あなたの市民記録会はまだ入力していない）
  let rid = 0;
  const rec = (email: string, meetId: string, event: string, digits: string, wind: number | null) => {
    const m = state.meets[meetId];
    const parsed = parseMark(event, digits);
    if (!parsed) return;
    const id = `r${++rid}`;
    const r: RecordDoc = {
      id, memberId: email, date: m.startDate, meetId, meetName: m.name, event,
      mark: parsed.mark, value: parsed.value, wind, isWindAssisted: wind != null && wind > 2.0,
      isPB: false, updatedBy: email, updatedAt: now,
    };
    state.records[id] = r;
  };
  rec(DEMO_ME, "m6", "100m", "1218", 0.8);
  rec(DEMO_ME, "m6", "200m", "2536", 0.4);
  rec(DEMO_ME, "m5", "100m", "1209", 1.1);
  rec(DEMO_ME, "m4", "100m", "1205", 1.6);
  rec(DEMO_ME, "m4", "200m", "2521", -0.3);
  const tens = ["1152", "1168", "1190", "1203", "1176", "1215", "1230", "1187", "1240", "1199"];
  for (const meetId of ["m6", "m5", "m4", "m3"]) {
    Object.entries(state.entries[meetId]).forEach(([email, e], i) => {
      if (email === DEMO_ME) return;
      const ev = e.events[0];
      const k = ev.includes("跳") ? "distance" : "time";
      const shift = meetId === "m3" ? -8 : meetId === "m4" ? 0 : meetId === "m5" ? 6 : 12;
      let digits: string;
      if (k === "distance") digits = String(520 + ((i * 13) % 60) - shift);
      else if (ev === "400m") digits = String(5480 + ((i * 37) % 300) + shift * 3);
      else if (ev === "200m") digits = String(2390 + ((i * 29) % 200) + shift * 2);
      else if (ev === "800m") digits = String(21530 + ((i * 41) % 900) + shift * 10);
      else if (ev === "1500m") digits = String(43520 + ((i * 53) % 1500) + shift * 20);
      else digits = String(Number(tens[i % tens.length]) + shift);
      const wind = ["100m", "200m", "100mH", "走幅跳"].includes(ev) ? (i % 4 === 1 && meetId === "m4" ? 2.4 : 1.2) : null;
      rec(email, meetId, ev, digits, wind);
    });
  }
  // PB を計算し、PB を出した記録に印をつける（古い順に見ていく）
  for (const m of Object.values(members)) {
    const mine = Object.values(state.records).filter((r) => r.memberId === m.email).sort((a, b) => a.date.localeCompare(b.date));
    const bestSoFar: Record<string, number> = {};
    for (const p of m.personalBests) if (p.manualMark) bestSoFar[p.event] = p.value;
    for (const r of mine) {
      const cur = bestSoFar[r.event];
      const lower = !(r.event.includes("跳") || r.event.includes("投") || r.event.includes("競技"));
      if (cur == null || (lower ? r.value < cur : r.value > cur)) {
        r.isPB = true;
        bestSoFar[r.event] = r.value;
      }
    }
    m.personalBests = recomputeAllPBs(state, m);
  }

  // 振り返り
  const rm = reflectionMonth(today);
  const pm = prevMonth(rm);
  const goalTexts = ["100m で 12 秒台を出す", "スタートの反応を速くする", "走幅跳で 5m50 を跳ぶ", "800m で 2分20秒を切る", "毎日の補強をさぼらない", "200m の後半で落ちないようにする", "助走のリズムを安定させる", "腕振りを大きくする"];
  const submit = (email: string, month: string, goal: string, achievement: number, day: string) => {
    const key = `${month}_${email}`;
    state.reflections[key] = { memberId: email, month, lastGoal: "スタートで出遅れない", achievement, review: "スタートは良くなったが、後半で失速した。冬は持久力をつけたい。", submittedAt: `${day}T12:00:00.000Z` };
    state.goals[key] = { memberId: email, month, goal, submittedAt: `${day}T12:00:00.000Z` };
  };
  const pm2 = prevMonth(pm);
  const pm3 = prevMonth(pm2);
  submit(DEMO_ME, pm3, "スタートで出遅れない", 3, `${pm3}-26`);
  submit(DEMO_ME, pm2, "100m で 12 秒 1 を出す", 2, `${pm2}-27`);
  submit(DEMO_ME, pm, "100m で 12 秒台を出す", 4, `${pm}-25`);
  athletes.forEach((m, i) => {
    if (m.email === DEMO_ME) return;
    submit(m.email, pm, goalTexts[i % goalTexts.length], (i % 5) + 1, `${pm}-26`);
    if (i % 4 !== 1) submit(m.email, rm, goalTexts[(i + 3) % goalTexts.length], ((i + 2) % 5) + 1, `${rm}-26`);
  });

  // 今日の気分（あなたはまだ選んでいない）
  athletes.forEach((m, i) => {
    if (m.email === DEMO_ME || i % 3 === 2) return;
    state.moods[`${today}_${m.email}`] = { memberId: m.email, date: today, mood: MOODS[i % MOODS.length], createdAt: now };
  });

  // スタブロ
  let sid = 0;
  const stabro = (email: string, date: string, runs: StabroSession["runs"]) => {
    const bests: StabroSession["bests"] = {};
    for (const [d, list] of Object.entries(runs)) if (list && list.length) bests[d as "30m"] = Math.min(...list);
    const id = `s${++sid}`;
    state.stabro[id] = { id, memberId: email, date, runs, bests, enteredBy: "manager@example.com", updatedAt: now };
  };
  const days = [-63, -56, -49, -42, -35, -28, -21, -14, -7];
  days.forEach((d, i) => {
    const w = (days.length - i) * 0.03;
    stabro(DEMO_ME, addDays(today, d), {
      "30m": [4.4 + w, 4.35 + w - (i === 6 ? 0.12 : 0)],
      "60m": [7.6 + w, 7.55 + w],
      "80m": [9.95 + w],
    });
  });
  runners.slice(1, 8).forEach((m, i) => {
    stabro(m.email, addDays(today, -7), { "30m": [4.1 + i * 0.04, 4.12 + i * 0.03], "60m": [7.2 + i * 0.05, 7.25 + i * 0.04], "80m": [9.45 + i * 0.06] });
  });
  for (const m of Object.values(members)) {
    const sessions = Object.values(state.stabro).filter((s) => s.memberId === m.email);
    for (const s of sessions) {
      for (const [d, v] of Object.entries(s.bests)) {
        const k = d as "30m";
        if (v != null && (m.stabroBests[k] == null || v < (m.stabroBests[k] as number))) m.stabroBests[k] = v;
      }
    }
  }

  return state;
}
