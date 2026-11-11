"use client";

import { useCallback, useEffect, useState } from "react";
import { enablePush, pushState } from "@/lib/push";
import { useApp } from "@/lib/useApp";

// 通知がまだ許可されていなければ、アプリを開くたびに「通知を許可しますか？」を出す。
// - スマホ：許可するまで先に進めない（閉じられない）
// - パソコン：「あとで」で閉じられる
// - 前に「許可しない」にした人には、設定から許可する方法を出す
// - 通知に対応していない古いスマホなどでは出さない
// マイページのスイッチで自分でオフにした人（許可はしてある）には出さない。

type Ask = "default" | "denied";

export function NotifyAsk() {
  const { me } = useApp();
  const [ask, setAsk] = useState<Ask | null>(null);
  const [busy, setBusy] = useState(false);
  const email = me?.status === "approved" ? me.email : null;
  const mobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/.test(navigator.userAgent);

  const check = useCallback(async () => {
    if (!email) return;
    const s = await pushState();
    if (s === "denied") setAsk("denied");
    else if (s === "off" && Notification.permission === "default") setAsk("default");
    else if (s === "off" && Notification.permission === "granted" && ask) {
      // 設定から許可してきたとき：そのまま通知をオンにして閉じる
      await enablePush(email).catch(() => {});
      setAsk(null);
    } else setAsk(null);
  }, [email, ask]);

  useEffect(() => {
    check();
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  // 設定アプリから戻ってきたら、もう一度確かめる
  useEffect(() => {
    if (!ask) return;
    const onShow = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [ask, check]);

  if (!ask || !email) return null;
  const close = () => setAsk(null);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6" onClick={mobile ? undefined : close}>
      <div role="alertdialog" aria-label="通知を許可しますか？" className="flex w-full max-w-[360px] flex-col gap-3 rounded-2xl bg-white px-5 py-5" onClick={(e) => e.stopPropagation()}>
        <p className="m-0 text-center text-[17px] font-bold">{mobile ? "通知を許可してください" : "通知を許可しますか？"}</p>
        {ask === "default" ? (
          <>
            <p className="m-0 text-center text-sm leading-relaxed text-sub">
              練習メニューが登録・変更されたときにお知らせします。
              {mobile && <><br />許可するとアプリを使えます。</>}
            </p>
            <div className={`grid gap-2 ${mobile ? "grid-cols-1" : "grid-cols-2"}`}>
              {!mobile && (
                <button onClick={close} className="h-11 rounded-[10px] border border-line bg-white text-sm text-[#334155]">
                  あとで
                </button>
              )}
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await enablePush(email).catch(() => {});
                  setBusy(false);
                  if (Notification.permission === "granted") close();
                  else check();
                }}
                className="h-11 rounded-[10px] bg-accent text-sm font-bold text-white"
              >
                許可する
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="m-0 text-sm leading-relaxed text-sub">
              通知が止められています。
              {mobile
                ? "スマホの「設定」→「通知」→「野田陸上部」から、通知を許可してください。許可したら、このアプリに戻ってください。"
                : "アドレスバーの左のマークを押して、通知を「許可」にしてください。"}
            </p>
            {mobile ? (
              <button onClick={() => check()} className="h-11 rounded-[10px] bg-accent text-sm font-bold text-white">
                許可したので確かめる
              </button>
            ) : (
              <button onClick={close} className="h-11 rounded-[10px] border border-line bg-white text-sm text-[#334155]">
                閉じる
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
