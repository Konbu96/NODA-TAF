"use client";

import { useSyncExternalStore } from "react";
import { nowIso, todayStr } from "./dates";
import { graduationYearFor, type Grade } from "./grade";
import { isBetter, parseMark, renameEvent, WIND_EVENTS, windValue } from "./marks";
import { authSignOut, emailSignIn, emailSignUp, emptyDb, startSync, USE_FIREBASE, writeDiff } from "./firebase";
import { bestFor, recomputeAllPBs } from "./pb";
import { createSeed } from "./seed";
import { WARM_UP_DETAILS } from "./warmUpSeed";
import type {
  DbState, Fees, Meet, Member, MoodKind, PracticeMenu, PracticeOptions, RecordDoc, Role, StabroDistance, HeatLane } from "./types";

/*
 * データ置き場。画面からは useStore() で全体を読み、下の actions で書き込む（どれも Promise を返す）。
 * - 本番：Firestore に保存する（読み書きの中身は firebase.ts）
 * - お試し版（.env.local に Firebase の設定がないとき）：このブラウザの中（localStorage）にだけ保存する
 */

const DB_KEY = "noda-taf-demo-db-v1";
const SESSION_KEY = "noda-taf-demo-session-v1";

let state: DbState | null = null;
let session: string | null = null;
const listeners = new Set<() => void>();

let fbReady = false;
let readyWaiters: (() => void)[] = [];

function load() {
  if (state) return;
  if (USE_FIREBASE) {
    state = emptyDb();
    startSync({
      onUser: (email) => {
        session = email;
        fbReady = false;
        emit();
      },
      onData: (patch) => {
        state = { ...(state as DbState), ...renameEventsIn(patch) };
        emit();
      },
      onReady: () => {
        fbReady = true;
        emit();
        const w = readyWaiters;
        readyWaiters = [];
        w.forEach((f) => f());
      },
    });
    return;
  }
  try {
    const raw = localStorage.getItem(DB_KEY);
    state = raw ? (JSON.parse(raw) as DbState) : null;
  } catch {
    state = null;
  }
  if (!state) state = createSeed(todayStr());
  try {
    session = localStorage.getItem(SESSION_KEY);
  } catch {
    session = null;
  }
  addWarmUpDetailsOnce();
  fillMemberDefaults();
  state = { ...state, ...renameEventsIn(state) };
}

/** 種目名を変えたときに、保存済みの記録・エントリー・PB の種目名を今の名前に読みかえる */
function renameEventsIn(p: Partial<DbState>): Partial<DbState> {
  const out: Partial<DbState> = { ...p };
  if (p.records)
    out.records = Object.fromEntries(Object.entries(p.records).map(([k, r]) => [k, renameEvent(r.event) === r.event ? r : { ...r, event: renameEvent(r.event) }]));
  if (p.entries)
    out.entries = Object.fromEntries(
      Object.entries(p.entries).map(([id, list]) => [
        id,
        Object.fromEntries(Object.entries(list).map(([e, x]) => [e, x.events.some((v) => renameEvent(v) !== v) ? { ...x, events: x.events.map(renameEvent) } : x])),
      ]),
    );
  if (p.members)
    out.members = Object.fromEntries(
      Object.entries(p.members).map(([e, m]) => [
        e,
        m.personalBests?.some((b) => renameEvent(b.event) !== b.event) || m.events?.some((v) => renameEvent(v) !== v)
          ? { ...m, events: m.events.map(renameEvent), personalBests: m.personalBests.map((b) => ({ ...b, event: renameEvent(b.event) })) }
          : m,
      ]),
    );
  return out;
}

/** 前に保存されたお試しデータの部員に、あとから足した項目（性別・休みの曜日）を空で入れる */
function fillMemberDefaults() {
  const s = state as DbState;
  const members = Object.fromEntries(
    Object.entries(s.members).map(([k, m]) => [k, { ...m, gender: m.gender ?? "", restDay: m.restDay ?? "" }]),
  );
  state = { ...s, members };
}

const WARMUP_FLAG = "noda-taf-demo-warmup-v1";

/** 前に保存されたお試しデータに、アップの中身（アクティベーション・動き作り）を一度だけ足す */
function addWarmUpDetailsOnce() {
  try {
    if (localStorage.getItem(WARMUP_FLAG)) return;
  } catch {
    return;
  }
  const s = state as DbState;
  const rename = (w: string) => (w === "アクティベーションドリル" ? "アクティベーション" : w);
  const details = { ...(s.warmUpDetails ?? {}) };
  const warmUps = s.options.warmUps.map(rename);
  for (const [name, text] of Object.entries(WARM_UP_DETAILS)) {
    if (!details[name]) details[name] = text;
    if (!warmUps.includes(name)) warmUps.push(name);
  }
  const menus = Object.fromEntries(Object.entries(s.menus).map(([k, m]) => [k, { ...m, warmUp: m.warmUp.map(rename) }]));
  state = { ...s, menus, options: { ...s.options, warmUps }, warmUpDetails: details };
  persist();
  try {
    localStorage.setItem(WARMUP_FLAG, "1");
  } catch {
    // 保存できなくても動く
  }
}

function persist() {
  if (USE_FIREBASE) return;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(state));
    if (session) localStorage.setItem(SESSION_KEY, session);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // 保存できなくても、開いている間は動く
  }
}

let snapshot: { db: DbState; email: string | null } | null = null;

function emit() {
  snapshot = null;
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  load();
  if (USE_FIREBASE && !fbReady) return null;
  if (!snapshot) snapshot = { db: state as DbState, email: session };
  return snapshot;
}

let lastWrite: Promise<void> = Promise.resolve();

function update(fn: (draft: DbState) => DbState) {
  load();
  const prev = state as DbState;
  state = fn(prev);
  emit();
  if (USE_FIREBASE) {
    lastWrite = writeDiff(prev, state).then((ok) => {
      if (!ok) alert("保存できませんでした。通信の状態を確かめて、もう一度試してください。");
    });
  }
}

/** 今のデータ（画面の外から読むとき用） */
export function getDb(): DbState {
  load();
  return state as DbState;
}

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

/** 直前の書き込みが終わるまで待つ */
const done = () => lastWrite;

// ---------- ログイン ----------

/**
 * 本番：メールアドレスとパスワードでログイン（create のときはアカウントを作る）し、読み込みが終わるまで待つ。
 * ログインした人のメールアドレスを返す。うまくいかないときは Firebase のエラーを投げる
 */
export async function signInWithEmail(mode: "login" | "create", email: string, password: string): Promise<string> {
  load();
  const me = mode === "create" ? await emailSignUp(email, password) : await emailSignIn(email, password);
  if (!(fbReady && session === me)) {
    await new Promise<void>((resolve) => readyWaiters.push(resolve));
  }
  return me;
}

/** お試し版：選んだアカウントでログインする */
export function login(email: string) {
  load();
  session = email.toLowerCase();
  emit();
  return done();
}

export function logout() {
  load();
  if (USE_FIREBASE) return authSignOut();
  session = null;
  emit();
  return done();
}

/** お試しデータを最初の状態に戻す */
export function resetDemo() {
  if (USE_FIREBASE) return;
  state = createSeed(todayStr());
  session = null;
  emit();
}

// ---------- 部員 ----------

export function apply(email: string, name: string, grade: Grade) {
  const now = nowIso();
  update((s) => ({
    ...s,
    members: {
      ...s.members,
      [email]: {
        email, name, status: "pending", role: "member", isAdmin: false,
        graduationYear: graduationYearFor(grade, todayStr()), bibNumber: "", gender: "", restDay: "", events: [],
        personalBests: [], stabroBests: {}, createdAt: now, updatedAt: now,
      },
    },
  }));
  return done();
}

export type NewMember = Pick<Member, "name" | "role" | "bibNumber" | "gender" | "restDay" | "events"> & { grade: Grade | null };

/** 顧問・開発者が部員を名簿に直接登録する（承認済みになる）。本人はあとで同じメールアドレスでアカウントを作れば入れる */
export function addMember(email: string, m: NewMember) {
  const now = nowIso();
  update((s) => ({
    ...s,
    members: {
      ...s.members,
      [email]: {
        email, name: m.name, status: "approved", role: m.role, isAdmin: false,
        graduationYear: m.role === "adviser" || !m.grade ? null : graduationYearFor(m.grade, todayStr()),
        bibNumber: m.bibNumber, gender: m.gender, restDay: m.restDay, events: m.events,
        personalBests: [], stabroBests: {}, createdAt: now, updatedAt: now,
      },
    },
  }));
  return done();
}

export function updateMember(email: string, patch: Partial<Member>) {
  update((s) => ({
    ...s,
    members: { ...s.members, [email]: { ...s.members[email], ...patch, updatedAt: nowIso() } },
  }));
  return done();
}

export function approveMember(email: string, name: string, grade: Grade | null, role: Role) {
  return updateMember(email, {
    name, role, status: "approved",
    graduationYear: grade ? graduationYearFor(grade, todayStr()) : null,
  });
}

/** 名簿から外す。その人の記録・振り返りなどもまとめて消す */
export function removeMember(email: string) {
  const keep = <T extends { memberId: string }>(o: Record<string, T>) =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v.memberId !== email));
  update((s) => {
    const members = { ...s.members };
    delete members[email];
    const dropKey = <T,>(o: Record<string, Record<string, T>>) =>
      Object.fromEntries(Object.entries(o).map(([k, v]) => {
        const c = { ...v };
        delete c[email];
        return [k, c];
      }));
    return {
      ...s, members,
      records: keep(s.records), reflections: keep(s.reflections), goals: keep(s.goals),
      moods: keep(s.moods), stabro: keep(s.stabro),
      entries: dropKey(s.entries), attendance: dropKey(s.attendance),
    };
  });
  return done();
}

export function saveProfile(
  email: string,
  { bibNumber, gender, restDay }: Pick<Member, "bibNumber" | "gender" | "restDay">,
  events: string[],
  manualDigits: Record<string, string>,
) {
  update((s) => {
    const m = s.members[email];
    // 手入力の PB は、専門種目でなくても（リレーなど）入れたものを残す。空にした種目は消す
    const all = [...new Set([...events, ...Object.keys(manualDigits), ...m.personalBests.map((p) => p.event)])];
    const pbs = all.map((ev) => {
      const old = m.personalBests.find((p) => p.event === ev);
      const manualMark = parseMark(ev, manualDigits[ev] ?? "")?.mark ?? "";
      return old
        ? { ...old, manualMark }
        : { event: ev, mark: "", value: 0, isWindAssisted: false, date: "", meetName: "", recordId: "", manualMark };
    });
    const next: Member = { ...m, bibNumber, gender, restDay, events, personalBests: pbs, updatedAt: nowIso() };
    next.personalBests = recomputeAllPBs(s, next);
    return { ...s, members: { ...s.members, [email]: next } };
  });
  return done();
}

// ---------- 練習メニュー ----------

export function saveMenu(menu: Omit<PracticeMenu, "isStadium" | "hasStabro" | "updatedAt" | "updatedBy">, by: string) {
  update((s) => ({
    ...s,
    menus: {
      ...s.menus,
      [menu.date]: {
        ...menu,
        isStadium: menu.place === "競技場",
        hasStabro: menu.items.some((i) => i.type === "スタブロ"),
        updatedBy: by,
        updatedAt: nowIso(),
      },
    },
  }));
  return done();
}

export function deleteMenu(date: string) {
  update((s) => {
    const menus = { ...s.menus };
    delete menus[date];
    return { ...s, menus };
  });
  return done();
}

export function setAttendance(date: string, email: string, going: boolean | null, by: string) {
  update((s) => {
    const day = { ...(s.attendance[date] ?? {}) };
    if (going == null) delete day[email];
    else day[email] = { going, updatedBy: by, updatedAt: nowIso() };
    return { ...s, attendance: { ...s.attendance, [date]: day } };
  });
  return done();
}

export function setWinter(isOn: boolean, by: string) {
  update((s) => ({ ...s, winter: { isOn, updatedBy: by, updatedAt: nowIso() } }));
  return done();
}

export function saveOptions(options: PracticeOptions) {
  update((s) => ({ ...s, options }));
  return done();
}

/** アップを新しく足す（選択肢にも入る） */
export function addWarmUp(name: string, text: string) {
  update((s) => ({
    ...s,
    options: s.options.warmUps.includes(name) ? s.options : { ...s.options, warmUps: [...s.options.warmUps, name] },
    warmUpDetails: text.trim() ? { ...s.warmUpDetails, [name]: text.trim() } : s.warmUpDetails,
  }));
  return done();
}

/** アップの中身を保存する。空にすると消す */
export function saveWarmUpDetail(name: string, text: string) {
  update((s) => {
    const warmUpDetails = { ...s.warmUpDetails };
    if (text.trim()) warmUpDetails[name] = text.trim();
    else delete warmUpDetails[name];
    return { ...s, warmUpDetails };
  });
  return done();
}

export function saveFees(fees: Fees) {
  update((s) => ({ ...s, fees }));
  return done();
}

// ---------- 大会・記録 ----------

export type RecordInput = { event: string; digits: string; windDigits: string; minus: boolean; short?: boolean };
export type PbUpdate = { event: string; mark: string; isWindAssisted: boolean; diff: number | null; before: number | null };

/** 記録を保存し、PB が更新された種目を返す */
export function saveRecords(meet: Meet, email: string, inputs: RecordInput[], by: string): Promise<PbUpdate[]> {
  const updates: PbUpdate[] = [];
  update((s) => {
    const records = { ...s.records };
    let member = s.members[email];
    for (const inp of inputs) {
      const existing = Object.values(records).find(
        (r) => r.memberId === email && r.meetId === meet.id && r.event === inp.event,
      );
      // ショート：記録なし。PB には使わない
      if (inp.short) {
        const id = existing?.id ?? `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        records[id] = {
          id, memberId: email, date: meet.startDate, meetId: meet.id, meetName: meet.name, event: inp.event,
          mark: "ショート", value: 0, wind: null, isWindAssisted: false, isPB: false, isShort: true,
          updatedBy: by, updatedAt: nowIso(),
        };
        continue;
      }
      const parsed = parseMark(inp.event, inp.digits);
      if (!parsed) {
        if (existing && !inp.digits) delete records[existing.id];
        continue;
      }
      const wind = WIND_EVENTS.includes(inp.event) ? windValue(inp.windDigits, inp.minus) : null;
      const beforePb = bestFor({ ...s, records: Object.fromEntries(Object.entries(records).filter(([id]) => id !== existing?.id)) }, member, inp.event);
      const id = existing?.id ?? `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const isPB = !beforePb || isBetter(inp.event, parsed.value, beforePb.value);
      const rec: RecordDoc = {
        id, memberId: email, date: meet.startDate, meetId: meet.id, meetName: meet.name, event: inp.event,
        mark: parsed.mark, value: parsed.value, wind, isWindAssisted: wind != null && wind > 2.0,
        isPB, updatedBy: by, updatedAt: nowIso(),
      };
      const changed = !existing || existing.value !== rec.value;
      records[id] = rec;
      if (isPB && changed) {
        updates.push({
          event: inp.event, mark: parsed.mark, isWindAssisted: rec.isWindAssisted,
          diff: beforePb ? parsed.value - beforePb.value : null, before: beforePb?.value ?? null,
        });
      }
    }
    const next = { ...s, records };
    member = { ...member, personalBests: recomputeAllPBs(next, member) };
    return { ...next, members: { ...s.members, [email]: member } };
  });
  return lastWrite.then(() => updates);
}

export function deleteRecord(id: string) {
  update((s) => {
    const r = s.records[id];
    const records = { ...s.records };
    delete records[id];
    const next = { ...s, records };
    const m = s.members[r.memberId];
    if (!m) return next;
    return { ...next, members: { ...s.members, [m.email]: { ...m, personalBests: recomputeAllPBs(next, m) } } };
  });
  return done();
}

export function saveMeet(meet: Omit<Meet, "updatedAt" | "updatedBy">, by: string): Promise<string> {
  const id = meet.id || `m${Date.now().toString(36)}`;
  update((s) => ({
    ...s,
    meets: { ...s.meets, [id]: { ...meet, id, updatedBy: by, updatedAt: nowIso() } },
    records: Object.fromEntries(Object.entries(s.records).map(([k, r]) =>
      [k, r.meetId === id ? { ...r, meetName: meet.name, date: meet.startDate } : r])),
  }));
  return lastWrite.then(() => id);
}

export function deleteMeet(id: string) {
  update((s) => {
    const meets = { ...s.meets };
    delete meets[id];
    const entries = { ...s.entries };
    delete entries[id];
    return { ...s, meets, entries };
  });
  return done();
}

/** 出る種目の分だけ、入っている組・レーン・ピットを残す（Firestore は undefined を保存できないので、空のものは入れない） */
function keepLanes(events: string[], lanes: Record<string, HeatLane>) {
  const kept: Record<string, HeatLane> = {};
  for (const ev of events) {
    const l = lanes[ev];
    const v: HeatLane = {};
    if (l?.pit) v.pit = l.pit;
    else {
      if (l?.heat) v.heat = l.heat;
      if (l?.lane) v.lane = l.lane;
    }
    if (l?.order) v.order = l.order;
    if (l?.callTime) v.callTime = l.callTime;
    if (l?.startTime) v.startTime = l.startTime;
    if (Object.keys(v).length) kept[ev] = v;
  }
  return kept;
}

export function saveEntry(meetId: string, email: string, events: string[], by: string, lanes: Record<string, HeatLane> = {}) {
  const kept = keepLanes(events, lanes);
  update((s) => {
    const list = { ...(s.entries[meetId] ?? {}) };
    if (events.length) list[email] = { events, ...(Object.keys(kept).length ? { lanes: kept } : {}), updatedBy: by, updatedAt: nowIso() };
    else delete list[email];
    return { ...s, entries: { ...s.entries, [meetId]: list } };
  });
  return done();
}

/** 組・レーンだけを入れ直す（組み分けが出たあとに入力する） */
export function saveLanes(meetId: string, email: string, lanes: Record<string, HeatLane>, by: string) {
  update((s) => {
    const list = { ...(s.entries[meetId] ?? {}) };
    const e = list[email];
    if (!e) return s;
    const kept = keepLanes(e.events, lanes);
    const rest = { ...e };
    delete rest.lanes;
    list[email] = { ...rest, ...(Object.keys(kept).length ? { lanes: kept } : {}), updatedBy: by, updatedAt: nowIso() };
    return { ...s, entries: { ...s.entries, [meetId]: list } };
  });
  return done();
}

// ---------- 仮データ（開発者用・あとで消す） ----------
// 画面の見た目を確かめるための仮の記録。id を "tmp_" で始めて、あとでまとめて消せるようにする。
// TODO: 本物の記録がそろったら、この仮データの機能ごと消す

export const TEMP_PREFIX = "tmp_";
const TEMP_STABRO_PEOPLE = ["開発ボット", "岡本一"];
const TEMP_STABRO_DATES = ["2026-10-17", "2026-10-24", "2026-10-31", "2026-11-07"];
const TEMP_RECORD_PERSON = "岡本一";
const TEMP_RECORD_MEET = "山口県高等学校新人陸上競技大会";
/** 同じ大会で 2 本（予選・決勝のような形）。2 本目は大会の最後の日にする */
const TEMP_RECORDS: { event: string; digits: string[] }[] = [
  { event: "400m", digits: ["10318", "10209"] },
  { event: "400mH", digits: ["10665", "10832"] },
];

/** 部員の PB とスタブロのベストを、今の記録から計算し直す */
function recomputeMemberBests(s: DbState, email: string): DbState {
  const m = s.members[email];
  if (!m) return s;
  const sb: Partial<Record<StabroDistance, number>> = {};
  for (const x of Object.values(s.stabro).filter((x) => x.memberId === email))
    for (const [d, v] of Object.entries(x.bests)) {
      const k = d as StabroDistance;
      if (v != null && (sb[k] == null || v < (sb[k] as number))) sb[k] = v;
    }
  return { ...s, members: { ...s.members, [email]: { ...m, stabroBests: sb, personalBests: recomputeAllPBs(s, m) } } };
}

/** 仮データを入れる。見つからなかった人・大会の名前を返す */
export function addTempData(by: string): Promise<string[]> {
  const missing: string[] = [];
  update((s0) => {
    let s = s0;
    const byName = (name: string) => Object.values(s.members).find((m) => m.name.replace(/\s/g, "") === name);
    const stabro = { ...s.stabro };
    const records = { ...s.records };
    const touched = new Set<string>();
    // スタブロ：30m・60m・80m を 4 回ずつ（4.30〜4.99 秒）
    for (const name of TEMP_STABRO_PEOPLE) {
      const m = byName(name);
      if (!m) {
        missing.push(name);
        continue;
      }
      touched.add(m.email);
      TEMP_STABRO_DATES.forEach((date) => {
        const id = `${TEMP_PREFIX}s_${m.email}_${date}`;
        const runs: Partial<Record<StabroDistance, number[]>> = {};
        const bests: Partial<Record<StabroDistance, number>> = {};
        for (const d of ["30m", "60m", "80m"] as StabroDistance[]) {
          const v = Math.round((4.3 + Math.random() * 0.69) * 100) / 100;
          runs[d] = [v];
          bests[d] = v;
        }
        stabro[id] = { id, memberId: m.email, date, runs, bests, enteredBy: by, updatedAt: nowIso() };
      });
    }
    // 大会の記録
    const person = byName(TEMP_RECORD_PERSON);
    const meet = Object.values(s.meets).find((x) => x.name.replace(/\s/g, "") === TEMP_RECORD_MEET);
    if (!person) missing.push(TEMP_RECORD_PERSON);
    if (!meet) missing.push(TEMP_RECORD_MEET);
    if (person && meet) {
      touched.add(person.email);
      for (const { event, digits } of TEMP_RECORDS) {
        digits.forEach((d, i) => {
          const parsed = parseMark(event, d);
          if (!parsed) return;
          const id = `${TEMP_PREFIX}r_${person.email}_${meet.id}_${event}_${i}`;
          records[id] = {
            id, memberId: person.email, date: i === 0 ? meet.startDate : meet.endDate, meetId: meet.id, meetName: meet.name, event,
            mark: parsed.mark, value: parsed.value, wind: null, isWindAssisted: false, isPB: false, updatedBy: by, updatedAt: nowIso(),
          };
        });
      }
      // PB の印：日付順に見て、それまでよりよければ PB
      for (const { event } of TEMP_RECORDS) {
        const list = Object.values(records).filter((r) => r.memberId === person.email && r.event === event && !r.isShort).sort((a, b) => a.date.localeCompare(b.date));
        let best: number | null = null;
        for (const r of list) {
          const pb = best == null || isBetter(event, r.value, best);
          if (r.id.startsWith(TEMP_PREFIX)) records[r.id] = { ...r, isPB: pb };
          if (pb) best = r.value;
        }
      }
    }
    s = { ...s, stabro, records };
    for (const email of touched) s = recomputeMemberBests(s, email);
    return s;
  });
  return lastWrite.then(() => missing);
}

/** 仮データ（id が tmp_ で始まるもの）を全部消して、PB を計算し直す */
export function clearTempData() {
  update((s0) => {
    const touched = new Set<string>();
    const stabro = Object.fromEntries(Object.entries(s0.stabro).filter(([id, x]) => (id.startsWith(TEMP_PREFIX) ? (touched.add(x.memberId), false) : true)));
    const records = Object.fromEntries(Object.entries(s0.records).filter(([id, r]) => (id.startsWith(TEMP_PREFIX) ? (touched.add(r.memberId), false) : true)));
    let s = { ...s0, stabro, records };
    for (const email of touched) s = recomputeMemberBests(s, email);
    return s;
  });
  return done();
}

// ---------- 振り返り・気分・スタブロ ----------

export function submitReflection(email: string, month: string, lastGoal: string, achievement: number | null, review: string, goal: string) {
  const at = nowIso();
  const key = `${month}_${email}`;
  update((s) => ({
    ...s,
    reflections: { ...s.reflections, [key]: { memberId: email, month, lastGoal, achievement, review, submittedAt: at } },
    goals: { ...s.goals, [key]: { memberId: email, month, goal, submittedAt: at } },
  }));
  return done();
}

export function setMood(email: string, mood: MoodKind) {
  const date = todayStr();
  update((s) => {
    const key = `${date}_${email}`;
    if (s.moods[key]) return s; // その日のうちは変えられない
    return { ...s, moods: { ...s.moods, [key]: { memberId: email, date, mood, createdAt: nowIso() } } };
  });
  return done();
}

export type StabroInput = Record<string, Partial<Record<StabroDistance, (number | null)[]>>>;

export function saveStabro(date: string, input: StabroInput, by: string) {
  update((s) => {
    const stabro = { ...s.stabro };
    const members = { ...s.members };
    for (const [email, byDist] of Object.entries(input)) {
      const runs: Partial<Record<StabroDistance, number[]>> = {};
      const bests: Partial<Record<StabroDistance, number>> = {};
      for (const [d, list] of Object.entries(byDist)) {
        const vals = (list ?? []).filter((v): v is number => v != null);
        if (vals.length) {
          runs[d as StabroDistance] = vals;
          bests[d as StabroDistance] = Math.min(...vals);
        }
      }
      const existing = Object.values(stabro).find((x) => x.memberId === email && x.date === date);
      if (!Object.keys(runs).length) {
        if (existing) delete stabro[existing.id];
      } else {
        const id = existing?.id ?? `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        stabro[id] = { id, memberId: email, date, runs, bests, enteredBy: by, updatedAt: nowIso() };
      }
      // 距離ごとのベストを計算し直す
      const mine = Object.values(stabro).filter((x) => x.memberId === email);
      const sb: Partial<Record<StabroDistance, number>> = {};
      for (const x of mine) for (const [d, v] of Object.entries(x.bests)) {
        const k = d as StabroDistance;
        if (v != null && (sb[k] == null || v < (sb[k] as number))) sb[k] = v;
      }
      if (members[email]) members[email] = { ...members[email], stabroBests: sb };
    }
    return { ...s, stabro, members };
  });
  return done();
}
