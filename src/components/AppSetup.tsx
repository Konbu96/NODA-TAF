"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { isStandalone } from "@/lib/push";

// アプリとして使うための準備。
// - サービスワーカーを登録する（電波がなくても開ける・通知を受け取る）
// - スマホのブラウザで開いたら、ホーム画面に追加するまで案内の画面を出す（全員アプリとして使う）

type BeforeInstall = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

type Kind = "ios" | "android" | "line" | "inapp" | null;

function detect(): Kind {
  const ua = navigator.userAgent;
  const mobile = /iPhone|iPad|iPod|Android/.test(ua);
  if (!mobile || isStandalone()) return null;
  if (/ Line\//.test(ua)) return "line";
  if (/Instagram|FBAN|FBAV|Twitter/.test(ua)) return "inapp";
  return /iPhone|iPad|iPod/.test(ua) ? "ios" : "android";
}

export function AppSetup() {
  const [kind, setKind] = useState<Kind>(null);
  const [prompt, setPrompt] = useState<BeforeInstall | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const k = detect();
    // LINE の中のブラウザでは追加できないので、ふだんのブラウザで開き直す
    if (k === "line" && !location.search.includes("openExternalBrowser=1")) {
      const url = new URL(location.href);
      url.searchParams.set("openExternalBrowser", "1");
      location.replace(url.toString());
    }
    setKind(k);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstall);
    };
    const onInstalled = () => setKind(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!kind) return null;
  return (
    <div className="fixed inset-0 z-[70] mx-auto flex max-w-[480px] flex-col items-center gap-5 overflow-y-auto bg-page px-6 py-10 text-center">
      <Image src="/icon-192.png" alt="" width={72} height={72} className="rounded-2xl" />
      <div>
        <p className="m-0 text-xl font-bold">ホーム画面に追加して使ってください</p>
        <p className="mt-2 mb-0 text-sm leading-relaxed text-sub">このアプリは、ホーム画面に追加して使います。通知を受け取るためにも必要です。</p>
      </div>

      {kind === "android" && (
        <div className="flex w-full flex-col gap-3 rounded-xl bg-white px-5 py-5 text-left">
          {prompt ? (
            <button
              onClick={async () => {
                await prompt.prompt();
                await prompt.userChoice;
                setPrompt(null);
              }}
              className="h-[52px] w-full rounded-xl bg-accent text-base font-bold text-white"
            >
              ホーム画面に追加する
            </button>
          ) : (
            <Steps
              items={["右上の「︙」を押す", "「ホーム画面に追加」または「アプリをインストール」を押す", "「追加」「インストール」を押す"]}
            />
          )}
        </div>
      )}

      {kind === "ios" && (
        <div className="flex w-full flex-col gap-3 rounded-xl bg-white px-5 py-5 text-left">
          <Steps
            items={[
              <>
                画面の下（または上）の共有ボタン <ShareMark /> を押す
              </>,
              "下にずらして「ホーム画面に追加」を押す",
              "右上の「追加」を押す",
            ]}
          />
          <p className="m-0 text-xs text-muted">Safari で開いてください。ほかのブラウザでは追加できないことがあります。</p>
        </div>
      )}

      {(kind === "line" || kind === "inapp") && (
        <div className="flex w-full flex-col gap-3 rounded-xl bg-white px-5 py-5 text-left">
          <p className="m-0 text-[15px] leading-relaxed">
            LINE などのアプリの中では追加できません。右上（または右下）の「︙」や共有ボタンから、
            <b>Safari（iPhone）・Chrome（Android）で開く</b>を選んでください。
          </p>
        </div>
      )}

      <p className="m-0 text-xs leading-relaxed text-muted">
        追加したら、ホーム画面の「野田陸上部」から開いてください。
        <br />
        はじめて開いたときは、もう一度ログインしてください。
      </p>
    </div>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">{i + 1}</span>
          <span className="pt-0.5">{t}</span>
        </li>
      ))}
    </ol>
  );
}

/** iPhone の共有ボタンの形（四角から上に矢印） */
function ShareMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline align-text-bottom">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11v9h12v-9" />
    </svg>
  );
}
