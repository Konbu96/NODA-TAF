"use client";

import { getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut,
  type Auth,
} from "firebase/auth";
import {
  collection, collectionGroup, doc, initializeFirestore, onSnapshot, query, where, writeBatch,
  type DocumentData, type Firestore, type QuerySnapshot, type Unsubscribe,
} from "firebase/firestore";
import { nowIso } from "./dates";
import { DEFAULT_FEES, DEFAULT_OPTIONS } from "./seed";
import type { DbState } from "./types";
import { WARM_UP_DETAILS } from "./warmUpSeed";

/*
 * Firestore とのやりとり。
 * 画面は今までどおり DbState（データ全体）を読み書きする。
 * - 読む：Firestore の変化を見張って、DbState に入れる
 * - 書く：書きかえる前と後の DbState を比べて、変わったドキュメントだけ Firestore に保存する
 * 置き場所（コレクションの名前）は docs/07_data-model.md に合わせている。
 */

/** .env.local に Firebase の設定があれば本番（Firebase）、なければお試し版で動く */
export const USE_FIREBASE = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_DEMO !== "1";

let auth: Auth | null = null;
let fs: Firestore | null = null;

function init() {
  if (auth && fs) return { auth, fs };
  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
  auth = getAuth(app);
  fs = initializeFirestore(app, { ignoreUndefinedProperties: true });
  return { auth, fs };
}

export function emptyDb(): DbState {
  return {
    members: {}, menus: {}, attendance: {},
    options: DEFAULT_OPTIONS, warmUpDetails: { ...WARM_UP_DETAILS },
    fees: DEFAULT_FEES, winter: { isOn: false, updatedBy: "", updatedAt: "" }, sheetsUrl: "",
    records: {}, meets: {}, entries: {}, reflections: {}, goals: {}, moods: {}, stabro: {},
  };
}

// ---------- ログイン ----------

/** ログイン・アカウント作成でうまくいかなかったときの、画面に出す文 */
export function authErrorText(e: unknown): string {
  const code = (e as { code?: string }).code ?? "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found")
    return "メールアドレスかパスワードが違います。";
  if (code === "auth/invalid-email") return "メールアドレスの書き方が正しくありません。";
  if (code === "auth/email-already-in-use") return "このメールアドレスのアカウントはもうあります。「ログイン」から入ってください。";
  if (code === "auth/weak-password") return "パスワードは 6 文字以上にしてください。";
  if (code === "auth/too-many-requests") return "何度も失敗したので、少し時間をおいてから試してください。";
  if (code === "auth/network-request-failed") return "通信できませんでした。電波の状態を確かめてください。";
  return "うまくいきませんでした。もう一度試してください。";
}

/** メールアドレスとパスワードでログインする。ログインした人のメールアドレス（小文字）を返す */
export async function emailSignIn(email: string, password: string): Promise<string> {
  const res = await signInWithEmailAndPassword(init().auth, email.trim(), password);
  return (res.user.email ?? email).toLowerCase();
}

/** 新しくアカウントを作って、そのままログインする */
export async function emailSignUp(email: string, password: string): Promise<string> {
  const res = await createUserWithEmailAndPassword(init().auth, email.trim(), password);
  return (res.user.email ?? email).toLowerCase();
}

/** パスワードを決め直すメールを送る */
export function sendReset(email: string) {
  return sendPasswordResetEmail(init().auth, email.trim());
}

export function authSignOut() {
  return signOut(init().auth);
}

// ---------- 読む ----------

type Listener = {
  /** ログイン中の人が変わったとき（ログアウトは null） */
  onUser: (email: string | null) => void;
  /** データの一部が変わったとき */
  onData: (patch: Partial<DbState>) => void;
  /** 最初の読み込みが終わったとき（ログインしていない・まだ部員でない人も含む） */
  onReady: () => void;
};

const byId = (snap: QuerySnapshot<DocumentData>) =>
  Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));

/** 親のドキュメントごとに分ける（practiceMenus/{日付}/attendance/{メール} → { 日付: { メール: … } }） */
const byParent = (snap: QuerySnapshot<DocumentData>) => {
  const out: Record<string, Record<string, DocumentData>> = {};
  for (const d of snap.docs) {
    const parent = d.ref.parent.parent?.id;
    if (!parent) continue;
    (out[parent] ??= {})[d.id] = d.data();
  }
  return out;
};

/** ログイン状態とデータを見張り始める。止めるときは返り値を呼ぶ */
export function startSync(l: Listener): () => void {
  const { auth, fs } = init();
  let ownUnsub: Unsubscribe | null = null;
  let fullUnsubs: Unsubscribe[] = [];

  const stopFull = () => {
    fullUnsubs.forEach((u) => u());
    fullUnsubs = [];
  };
  const stopAll = () => {
    ownUnsub?.();
    ownUnsub = null;
    stopFull();
  };

  /** 承認済みの人：全部のデータを見張る。全部そろったら done を呼ぶ */
  const startFull = (email: string, done: () => void) => {
    const sources: [string, (cb: (s: QuerySnapshot<DocumentData>) => void) => Unsubscribe][] = [];
    const add = (name: string, q: Parameters<typeof onSnapshot>[0], toPatch: (s: QuerySnapshot<DocumentData>) => Partial<DbState>) => {
      sources.push([name, (cb) => onSnapshot(q as never, (s: QuerySnapshot<DocumentData>) => {
        l.onData(toPatch(s));
        cb(s);
      }, (err) => console.error(`${name} を読めませんでした`, err))]);
    };
    add("members", collection(fs, "members"), (s) => ({ members: byId(s) as DbState["members"] }));
    add("practiceMenus", collection(fs, "practiceMenus"), (s) => ({ menus: byId(s) as DbState["menus"] }));
    add("attendance", collectionGroup(fs, "attendance"), (s) => ({ attendance: byParent(s) as DbState["attendance"] }));
    add("practiceOptions", collection(fs, "practiceOptions"), (s) => {
      const main = s.docs.find((d) => d.id === "main")?.data();
      if (!main) return {};
      const { warmUpDetails, ...options } = main;
      return { options: options as DbState["options"], warmUpDetails: (warmUpDetails ?? {}) as DbState["warmUpDetails"] };
    });
    add("settings", collection(fs, "settings"), (s) => {
      const get = (id: string) => s.docs.find((d) => d.id === id)?.data();
      const patch: Partial<DbState> = {};
      const fees = get("fees");
      const winter = get("winter");
      const sheets = get("sheets");
      if (fees) patch.fees = fees as DbState["fees"];
      if (winter) patch.winter = winter as DbState["winter"];
      if (sheets) patch.sheetsUrl = (sheets.spreadsheetUrl as string) ?? "";
      return patch;
    });
    add("records", collection(fs, "records"), (s) => ({ records: byId(s) as DbState["records"] }));
    add("meets", collection(fs, "meets"), (s) => ({ meets: byId(s) as DbState["meets"] }));
    add("entries", collectionGroup(fs, "entries"), (s) => ({ entries: byParent(s) as DbState["entries"] }));
    add("reflections", query(collection(fs, "reflections"), where("memberId", "==", email)), (s) => ({ reflections: byId(s) as DbState["reflections"] }));
    add("goals", collection(fs, "goals"), (s) => ({ goals: byId(s) as DbState["goals"] }));
    add("moods", collection(fs, "moods"), (s) => ({ moods: byId(s) as DbState["moods"] }));
    add("stabroSessions", collection(fs, "stabroSessions"), (s) => ({ stabro: byId(s) as DbState["stabro"] }));

    let waiting = sources.length;
    const seen = new Set<string>();
    fullUnsubs = sources.map(([name, start]) =>
      start(() => {
        if (seen.has(name)) return;
        seen.add(name);
        if (--waiting === 0) done();
      }),
    );
  };

  const authUnsub = onAuthStateChanged(auth, (user) => {
    stopAll();
    l.onData(emptyDb());
    const email = user?.email?.toLowerCase() ?? null;
    l.onUser(email);
    if (!email) {
      l.onReady();
      return;
    }
    // まず自分の部員データだけ見る。承認済みなら全部のデータを見張る
    let full = false;
    let readyCalled = false;
    const ready = () => {
      if (readyCalled) return;
      readyCalled = true;
      l.onReady();
    };
    ownUnsub = onSnapshot(
      doc(fs, "members", email),
      (d) => {
        const data = d.data();
        const approved = data?.status === "approved";
        if (approved && !full) {
          full = true;
          startFull(email, ready);
        } else if (!approved) {
          if (full) {
            full = false;
            stopFull();
            l.onData(emptyDb());
          }
          l.onData({ members: data ? { [email]: data as DbState["members"][string] } : {} });
          ready();
        }
      },
      (err) => {
        console.error("自分の部員データを読めませんでした", err);
        ready();
      },
    );
  });

  return () => {
    authUnsub();
    stopAll();
  };
}

// ---------- 書く ----------

/** キーの順番に関係なく同じ中身なら同じ文字列になる */
function stable(v: unknown): string {
  if (v === undefined) return "null";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(",")}}`;
}

const same = (a: unknown, b: unknown) => a === b || stable(a) === stable(b);

type Op = { path: string; data: DocumentData | null };

/** 書きかえる前と後を比べて、保存・削除するドキュメントを並べる */
export function diffOps(prev: DbState, next: DbState): Op[] {
  const ops: Op[] = [];
  const flat = (a: Record<string, unknown>, b: Record<string, unknown>, coll: string) => {
    if (a === b) return;
    for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(id in b)) ops.push({ path: `${coll}/${id}`, data: null });
      else if (!(id in a) || !same(a[id], b[id])) ops.push({ path: `${coll}/${id}`, data: b[id] as DocumentData });
    }
  };
  const nested = (a: Record<string, Record<string, unknown>>, b: Record<string, Record<string, unknown>>, coll: string, sub: string) => {
    if (a === b) return;
    for (const parent of new Set([...Object.keys(a), ...Object.keys(b)])) {
      flat(a[parent] ?? {}, b[parent] ?? {}, `${coll}/${parent}/${sub}`);
    }
  };
  const single = (a: unknown, b: unknown, path: string, data: DocumentData) => {
    if (!same(a, b)) ops.push({ path, data });
  };

  flat(prev.members, next.members, "members");
  flat(prev.menus, next.menus, "practiceMenus");
  nested(prev.attendance, next.attendance, "practiceMenus", "attendance");
  single(
    { ...prev.options, warmUpDetails: prev.warmUpDetails },
    { ...next.options, warmUpDetails: next.warmUpDetails },
    "practiceOptions/main",
    { ...next.options, warmUpDetails: next.warmUpDetails },
  );
  single(prev.fees, next.fees, "settings/fees", next.fees);
  single(prev.winter, next.winter, "settings/winter", next.winter);
  single(prev.sheetsUrl, next.sheetsUrl, "settings/sheets", { spreadsheetUrl: next.sheetsUrl, updatedAt: nowIso() });
  flat(prev.records, next.records, "records");
  flat(prev.meets, next.meets, "meets");
  nested(prev.entries, next.entries, "meets", "entries");
  flat(prev.reflections, next.reflections, "reflections");
  flat(prev.goals, next.goals, "goals");
  flat(prev.moods, next.moods, "moods");
  flat(prev.stabro, next.stabro, "stabroSessions");
  return ops;
}

/** 変わったところを Firestore に保存する。保存できなかったら false */
export async function writeDiff(prev: DbState, next: DbState): Promise<boolean> {
  const ops = diffOps(prev, next);
  if (!ops.length) return true;
  const { fs } = init();
  try {
    // 一度に保存できるのは 500 件まで
    for (let i = 0; i < ops.length; i += 450) {
      const batch = writeBatch(fs);
      for (const op of ops.slice(i, i + 450)) {
        const ref = doc(fs, op.path);
        if (op.data) batch.set(ref, op.data);
        else batch.delete(ref);
      }
      await batch.commit();
    }
    return true;
  } catch (e) {
    console.error("保存できませんでした", ops.map((o) => o.path), e);
    return false;
  }
}
