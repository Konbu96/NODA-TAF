"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { setSlide } from "./PageSlide";

// メインの 4 画面（メニュー・大会・部員・マイページ）を切りかえるときの動き：
// 真ん中から色がぽわーんと広がって画面を覆い、棒人間が走っている間に画面を切りかえ、
// 最後に丸が真ん中へしぼんで新しい画面が出る。押すと飛ばせる。
// それ以外の画面の移動は、PageSlide で横にスライドさせる（ここでは向きだけ決める）。

/** メインの 4 画面 */
const MAIN = ["/", "/mypage", "/members", "/meets"];

const POP = 600; // 広がる・しぼむ時間（ミリ秒）。globals.css の pop-in / pop-out と合わせる
const RUN = 700; // 棒人間が走る時間

type Stage = "in" | "hold" | "out" | null;

export function PageTransition() {
  const pathname = usePathname();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(null);
  const [key, setKey] = useState(0);
  const first = useRef(true);
  const waiting = useRef(false); // リンクを押して、画面の切りかえを待っている
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
  const finish = () => {
    clear();
    setStage("out");
    later(POP, () => setStage(null));
  };
  const runThenFinish = () => {
    clear();
    setStage("hold");
    later(RUN, finish);
  };

  // リンクを押したら、先に丸を広げ、覆い終わってから画面を切りかえる
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      // メインの 4 画面どうしでなければ、横スライド（戻るボタンなら左から、それ以外は右から）
      if (!(MAIN.includes(location.pathname) && MAIN.includes(url.pathname))) {
        setSlide(a.getAttribute("aria-label") === "戻る" ? "back" : "forward");
        return;
      }
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      setSlide("none");
      e.preventDefault();
      clear();
      setKey((k) => k + 1);
      setStage("in");
      waiting.current = true;
      later(POP, () => {
        router.push(url.pathname + url.search + url.hash);
        // 同じ画面のまま中身だけ変わるとき（アドレスの ? 以降だけ違う）も、走ってから消す
        if (url.pathname === location.pathname) {
          waiting.current = false;
          runThenFinish();
        }
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // 画面（アドレス）が変わったとき
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (waiting.current) {
      // リンクから：もう覆っているので、走ってから消す
      waiting.current = false;
      runThenFinish();
      return;
    }
    // それ以外（スライドで動かす画面の移動）は、ここでは何もしない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => clear, []);

  if (!stage) return null;
  const anim = stage === "in" ? "pop-in" : stage === "out" ? "pop-out" : "pop-hold";
  return (
    // 押すと飛ばせる（切りかえ待ちなら、すぐ切りかえる）
    <div
      key={key}
      aria-hidden
      onClick={() => {
        if (stage === "out") return;
        if (waiting.current) return; // 切りかえの直前なので、そのまま待つ
        finish();
      }}
      className="fixed inset-0 z-[60] mx-auto max-w-[480px] overflow-hidden"
    >
      {/* 真ん中からぽわーんと広がる丸 */}
      <div className={`${anim} absolute top-1/2 left-1/2 h-[150vmax] w-[150vmax] rounded-full bg-accent`} />
      {/* 真ん中で走る棒人間（丸といっしょに大きく・小さくなる） */}
      <div className={`${anim} absolute top-1/2 left-1/2`}>
        <Runner />
      </div>
    </div>
  );
}

/** 走っている棒人間（白）。ひじ・ひざを曲げて下に向けた手足を、左右に交互にふる */
function Runner() {
  const line = { stroke: "#FFFFFF", strokeWidth: 11, strokeLinecap: "round" as const, fill: "none" };
  return (
    <svg width="110" height="128" viewBox="0 0 120 140" className="overflow-visible">
      <g className="run-bob">
        <circle cx="63" cy="24" r="16" fill="#FFFFFF" />
        {/* 体（少し前かがみ） */}
        <line x1="62" y1="36" x2="54" y2="78" {...line} />
        {/* うで（肩から） */}
        <g className="run-arm-a" style={{ transformOrigin: "59px 51px" }}>
          <polyline points="59,51 56,71 66,81" {...line} />
        </g>
        <g className="run-arm-b" style={{ transformOrigin: "59px 51px" }}>
          <polyline points="59,51 56,71 66,81" {...line} />
        </g>
        {/* あし（腰から） */}
        <g className="run-leg-a" style={{ transformOrigin: "54px 78px" }}>
          <line x1="54" y1="78" x2="60" y2="101" {...line} />
          {/* すね：真下に来たときはまっすぐ地面に立て、前に出るときは深く曲げる */}
          <g className="run-knee-a" style={{ transformOrigin: "60px 101px" }}>
            <line x1="60" y1="101" x2="60" y2="124" {...line} />
          </g>
        </g>
        <g className="run-leg-b" style={{ transformOrigin: "54px 78px" }}>
          <line x1="54" y1="78" x2="60" y2="101" {...line} />
          {/* すね：真下に来たときはまっすぐ地面に立て、前に出るときは深く曲げる */}
          <g className="run-knee-b" style={{ transformOrigin: "60px 101px" }}>
            <line x1="60" y1="101" x2="60" y2="124" {...line} />
          </g>
        </g>
      </g>
      {/* 足もとの流れる線（走っている感じ） */}
      <g className="run-ground" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6">
        {/* 20 ずつの間かくで短い線をならべ、20 ずらすと同じ形にもどる */}
        <line x1="0" y1="132" x2="10" y2="132" />
        <line x1="20" y1="132" x2="30" y2="132" />
        <line x1="40" y1="132" x2="50" y2="132" />
        <line x1="60" y1="132" x2="70" y2="132" />
        <line x1="80" y1="132" x2="90" y2="132" />
        <line x1="100" y1="132" x2="110" y2="132" />
        <line x1="120" y1="132" x2="130" y2="132" />
      </g>
    </svg>
  );
}
