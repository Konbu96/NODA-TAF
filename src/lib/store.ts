"use client";

import { useSyncExternalStore } from "react";
import { nowIso, todayStr } from "./dates";
import { graduationYearFor, type Grade } from "./grade";
import { isBetter, parseMark, WIND_EVENTS, windValue } from "./marks";
import { bestFor, recomputeAllPBs } from "./pb";
import { createSeed } from "./seed";
import type {
  DbState, Fees, Meet, Member, MoodKind, PracticeMenu, PracticeOptions, RecordDoc, Role, StabroDistance,
} from "./types";

/*
 * お試し版のデータ置き場。データはこのブラウザの中（localStorage）にだけ保存する。
 * Firebase に移すときは、この中の読み書きを Firestore に置き換える。
 * 画面からは useDb() で全体を読み、下の actions で書き込む（どれも Promise を返す）。
 */

const DB_KEY = "noda-taf-demo-db-v1";
const SESSION_KEY = "noda-taf-demo-session-v1";

let state: DbState | null = null;
let session: string | null = null;
const listeners = new Set<() => void>();

function load() {
  if (state) return;
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
}

function persist() {
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
  if (!snapshot) snapshot = { db: state as DbState, email: session };
  return snapshot;
}

function update(fn: (draft: DbState) => DbState) {
  load();
  state = fn(state as DbState);
  emit();
}

/** 今のデータ（画面の外から読むとき用） */
export function getDb(): DbState {
  load();
  return state as DbState;
}

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

const done = () => Promise.resolve();

// ---------- ログイン ----------

export function login(email: string) {
  load();
  session = email.toLowerCase();
  emit();
  return done();
}

export function logout() {
  load();
  session = null;
  emit();
  return done();
}

/** お試しデータを最初の状態に戻す */
export function resetDemo() {
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
        graduationYear: graduationYearFor(grade, todayStr()), bibNumber: "", events: [],
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

export function saveProfile(email: string, bibNumber: string, events: string[], manualDigits: Record<string, string>) {
  update((s) => {
    const m = s.members[email];
    const pbs = events.map((ev) => {
      const old = m.personalBests.find((p) => p.event === ev);
      const parsed = parseMark(ev, manualDigits[ev] ?? "");
      return {
        event: ev, mark: parsed?.mark ?? "", value: parsed?.value ?? 0, isWindAssisted: false,
        date: "", meetName: "", recordId: "", manualMark: parsed?.mark ?? "",
        ...(old && !parsed ? { manualMark: "" } : {}),
      };
    });
    // 専門から外した種目でも、大会記録の PB は残す
    const kept = m.personalBests.filter((p) => !events.includes(p.event)).map((p) => ({ ...p, manualMark: "" }));
    const next: Member = { ...m, bibNumber, events, personalBests: [...pbs, ...kept], updatedAt: nowIso() };
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

export function saveFees(fees: Fees) {
  update((s) => ({ ...s, fees }));
  return done();
}

// ---------- 大会・記録 ----------

export type RecordInput = { event: string; digits: string; windDigits: string; minus: boolean };
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
  return Promise.resolve(updates);
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
  return Promise.resolve(id);
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

export function saveEntry(meetId: string, email: string, events: string[], by: string) {
  update((s) => {
    const list = { ...(s.entries[meetId] ?? {}) };
    if (events.length) list[email] = { events, updatedBy: by, updatedAt: nowIso() };
    else delete list[email];
    return { ...s, entries: { ...s.entries, [meetId]: list } };
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
