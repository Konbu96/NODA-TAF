import { createRemoteJWKSet, jwtVerify } from "jose";
import type { PushSubscription } from "web-push";

// 通知を送るサーバーの処理（Vercel で動く）。
// アプリから「メニューを登録した」などと頼まれたら、頼んだ人が本当に担当者かを確かめて、
// 保存されている全員の送り先（pushSubscriptions）に通知を送る。
//
// Vercel の Environment Variables に入れておくもの（GitHub には上げない）：
//   FIREBASE_SERVICE_ACCOUNT … Firebase のサービスアカウントの鍵（JSON の中身をそのまま）
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY … 通知の鍵（.env.local と同じもの）

export const runtime = "nodejs";
export const maxDuration = 30;

// 読み込みに失敗したときに理由を返せるよう、使うときに読み込む
async function admin() {
  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? "{}")) });
  return { db: getFirestore(app) };
}

// ログインの確認（firebase-admin/auth は Vercel で読み込めないので、Google の公開鍵で直接確かめる）
const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

async function verifyEmail(token: string, projectId: string): Promise<string> {
  const { payload } = await jwtVerify(token, GOOGLE_KEYS, { issuer: `https://securetoken.google.com/${projectId}`, audience: projectId });
  if (!payload.sub || typeof payload.email !== "string") throw new Error("bad token");
  return payload.email.toLowerCase();
}

/** 動いているかの確認用（鍵の中身は返さない） */
export async function GET() {
  const out: Record<string, string> = { node: process.version };
  for (const [name, load] of [
    ["firebase-admin", () => import("firebase-admin/app")],
    ["web-push", () => import("web-push")],
  ] as const) {
    try {
      await load();
      out[name] = "ok";
    } catch (e) {
      out[name] = (e as Error).message.slice(0, 200);
    }
  }
  return Response.json(out);
}

/** メニューを登録できる役職（src/lib/permissions.ts の canEditMenu と同じ） */
const MENU_ROLES = ["adviser", "captain", "viceCaptain", "manager"];
const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

/** 2026-11-14 → 11/14（土） */
function dayText(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}/${d}（${WEEK[w]}）`;
}

export async function POST(req: Request) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT || !process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return Response.json({ error: "通知の設定がまだです" }, { status: 503 });
  }
  // 鍵の中身は返さず、どこがおかしいかだけ返す
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch {
    return Response.json({ error: "FIREBASE_SERVICE_ACCOUNT が JSON として読めません（ファイルの中身を { から } まで全部貼ってください）" }, { status: 500 });
  }
  const missing = ["project_id", "client_email", "private_key"].filter((k) => typeof parsed?.[k] !== "string");
  if (missing.length) return Response.json({ error: `FIREBASE_SERVICE_ACCOUNT に ${missing.join("・")} がありません`, keys: Object.keys(parsed ?? {}) }, { status: 500 });
  let db;
  try {
    ({ db } = await admin());
  } catch (e) {
    return Response.json({ error: `Firebase の準備に失敗しました：${(e as Error).message.slice(0, 120)}` }, { status: 500 });
  }

  // 頼んだ人を確かめる
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  let email = "";
  try {
    email = await verifyEmail(token, parsed.project_id as string);
  } catch {
    return Response.json({ error: "ログインし直してください" }, { status: 401 });
  }
  const me = (await db.doc(`members/${email}`).get()).data();
  if (!me || me.status !== "approved") return Response.json({ error: "部員ではありません" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { kind?: string; date?: string; isNew?: boolean; delay?: boolean };
  let message: { title: string; body: string; url: string; tag: string };
  if (body.kind === "menu" && typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    if (!(me.isAdmin === true || MENU_ROLES.includes(me.role))) return Response.json({ error: "担当者ではありません" }, { status: 403 });
    message = {
      title: "練習メニュー",
      body: `${dayText(body.date)}の練習メニューが${body.isNew ? "登録" : "変更"}されました`,
      url: "/",
      tag: `menu-${body.date}`,
    };
  } else if (body.kind === "test") {
    // マイページの「テスト通知を送る」：自分のスマホにだけ送る
    message = { title: "テスト通知", body: "通知は届いています 👍", url: "/mypage", tag: "test" };
  } else {
    return Response.json({ error: "知らせる内容がわかりません" }, { status: 400 });
  }

  // 「10秒後に送る」：アプリを閉じてから届くかを試せるように待つ
  if (body.kind === "test" && body.delay) await new Promise((r) => setTimeout(r, 10_000));

  const webpush = await import("web-push");
  webpush.setVapidDetails("https://noda-taf.vercel.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const subs = await db.collection("pushSubscriptions").get();
  const test = body.kind === "test";
  // テストは自分にだけ、ふだんは自分以外に送る
  const targets = subs.docs.filter((d) => (d.data().email === email) === test);
  let sent = 0;
  const errors: string[] = [];
  await Promise.all(
    targets.map(async (d) => {
      const s = d.data() as { email: string; subscription: PushSubscription };
      try {
        await webpush.sendNotification(s.subscription, JSON.stringify(message), { TTL: 60 * 60 * 24, urgency: "high" });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        errors.push(`${code ?? ""} ${(e as { body?: string }).body ?? (e as Error).message}`.slice(0, 120));
        // もう使われていない送り先は消す
        if (code === 404 || code === 410) await d.ref.delete().catch(() => {});
      }
    }),
  );
  return Response.json({ all: subs.size, targets: targets.length, sent, errors });
}
