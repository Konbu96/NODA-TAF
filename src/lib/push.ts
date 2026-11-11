"use client";

import { deletePushSubscription, idToken, savePushSubscription, USE_FIREBASE } from "./firebase";

// 通知（Web Push）のスマホ側。
// 受け取る：このスマホの「送り先」を作って Firestore（pushSubscriptions）に保存する。
// 送る：サーバー（/api/notify）に頼む。サーバーが全員の送り先に送る。

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** ホーム画面から開いているか（アプリとして使っているか） */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export type PushState = "unsupported" | "needInstall" | "denied" | "off" | "on";

const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!PUBLIC_KEY && USE_FIREBASE;

const isIos = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

/** 今の通知の状態 */
export async function pushState(): Promise<PushState> {
  // iPhone はホーム画面に追加して開いたときだけ通知を受け取れる
  if (isIos() && !isStandalone()) return "needInstall";
  if (!supported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

/** 送り先のアドレスから、保存に使う id を作る（同じスマホならいつも同じ id） */
async function subId(endpoint: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** 通知をオンにする（ボタンを押したときに呼ぶ。許可を聞く画面が出る） */
export async function enablePush(email: string): Promise<PushState> {
  if (!supported()) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "off";
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
  await savePushSubscription(await subId(sub.endpoint), email, sub.toJSON());
  return "on";
}

/** 通知をオフにする */
export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await deletePushSubscription(await subId(sub.endpoint)).catch(() => {});
    await sub.unsubscribe();
  }
  return "off";
}

/** マイページの「テスト通知を送る」：送り先を保存し直してから、自分にだけ送る。結果を文にして返す */
export async function sendTest(email: string, delay = false): Promise<string> {
  try {
    if ((await enablePush(email)) !== "on") return "通知が許可されていません";
  } catch (e) {
    return `送り先を保存できませんでした（${(e as Error).message}）`;
  }
  const token = await idToken();
  if (!token) return "ログインし直してください";
  const req = fetch("/api/notify", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind: "test", delay }),
  });
  if (delay) return "10秒後に届きます。今すぐアプリを閉じてください";
  const res = await req;
  const r = (await res.json().catch(() => ({}))) as { error?: string; all?: number; targets?: number; sent?: number; errors?: string[] };
  if (r.error) return `送れませんでした（${r.error}）`;
  if (!r.targets) return `このスマホの送り先が見つかりません（全部で ${r.all ?? 0} 件）`;
  if (r.errors?.length) return `送れませんでした（${r.errors.join(" / ")}）`;
  return `送りました（${r.sent} 件）。数秒で届きます`;
}

/** 練習メニューを登録・変更したことを、みんなに知らせる（失敗しても保存には関係ない） */
export async function notifyMenu(date: string, isNew: boolean) {
  if (!USE_FIREBASE) return;
  try {
    const token = await idToken();
    if (!token) return;
    await fetch("/api/notify", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind: "menu", date, isNew }),
    });
  } catch {
    // 通知が送れなくても、メニューは保存できている
  }
}
