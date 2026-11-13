"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ATHLETE_KINDS, Athlete, type AthleteKind } from "./Athletes";
import { setSlide } from "./PageSlide";

// メインの 4 画面（メニュー・大会・部員・マイページ）を切りかえるときの動き：
// 真ん中から色がぽわーんと広がって画面を覆い、棒人間が走っている間に画面を切りかえ、
// 最後に丸が真ん中へしぼんで新しい画面が出る。押すと飛ばせる。
// それ以外の画面の移動は、PageSlide で横にスライドさせる（ここでは向きだけ決める）。

/** メインの 4 画面 */
const MAIN = ["/", "/mypage", "/members", "/meets"];

const POP = 500; // 広がる・しぼむ時間（ミリ秒）。globals.css の pop-in / pop-out と合わせる
const RUN = 500; // 棒人間が走る時間
/** 走る以外（ハードル・幅跳び・やり投げ）は、とぶ・投げるまで見せるので少し長くする */
const runTime = (k: AthleteKind) => (k === "run" ? RUN : 800);

type Stage = "in" | "hold" | "out" | null;

const randomKind = () => ATHLETE_KINDS[Math.floor(Math.random() * ATHLETE_KINDS.length)];

const PREVIEW_EVENT = "eyecatch-preview";
/** アイキャッチ 1 回分の長さ（ミリ秒） */
export const EYECATCH_MS = POP * 2 + RUN; // やり投げは runTime の分だけ長い
/** アイキャッチを試しに流す（画面は切りかえない）。月 0 は飾りなし。種目を決めなければランダム */
export function previewEyecatch(month: number, kind?: AthleteKind) {
  window.dispatchEvent(new CustomEvent(PREVIEW_EVENT, { detail: { month, kind } }));
}

export function PageTransition() {
  const pathname = usePathname();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(null);
  const [key, setKey] = useState(0);
  const [month, setMonth] = useState<number | null>(null); // 試しに見るときの月（ふだんは今の月）
  const [kind, setKindState] = useState<AthleteKind>("run"); // 出す種目（毎回ランダム）
  const kindRef = useRef<AthleteKind>("run"); // タイマーの中から今の種目を見る
  const setKind = (k: AthleteKind) => {
    kindRef.current = k;
    setKindState(k);
  };
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
    later(runTime(kindRef.current), finish);
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
      setMonth(null);
      setKind(randomKind());
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

  // マイページの「アイキャッチを試す」：画面は切りかえずに、その月の動きだけ見せる
  useEffect(() => {
    const onPreview = (e: Event) => {
      clear();
      const d = (e as CustomEvent<{ month: number; kind?: AthleteKind }>).detail;
      setMonth(d.month);
      setKind(d.kind ?? randomKind());
      setKey((k) => k + 1);
      setStage("in");
      later(POP, runThenFinish);
    };
    window.addEventListener(PREVIEW_EVENT, onPreview);
    return () => window.removeEventListener(PREVIEW_EVENT, onPreview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => clear, []);

  if (!stage) return null;
  const anim = stage === "in" ? "pop-in" : stage === "out" ? "pop-out" : "pop-hold";
  const m = month ?? currentMonth();
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
      {/* 月ごとの飾り（丸といっしょに広がる・しぼむ） */}
      <div className={`${anim} absolute top-1/2 left-1/2 h-dvh w-[480px] max-w-[100vw]`}>
        <Season month={m} />
      </div>
      {/* 真ん中で走る棒人間（丸といっしょに大きく・小さくなる） */}
      <div className={`${anim} absolute top-1/2 left-1/2`}>
        <Athlete kind={kind} month={m} />
      </div>
    </div>
  );
}

// ---------- 月ごとの背景の飾り ----------

/** いつも同じになる 0〜1 の数（毎回同じ場所に出す） */
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** 飾りのある月（マイページの「アイキャッチを試す」でも使う） */
export const EYECATCH_MONTHS = [4, 8, 10, 12];

/** 今の月（開発中だけ、アドレスに ?month=4 を付けるとその月で試せる） */
function currentMonth(): number {
  if (process.env.NODE_ENV !== "production") {
    try {
      const m = Number(new URLSearchParams(location.search).get("month"));
      if (m >= 1 && m <= 12) sessionStorage.setItem("eyecatchMonth", String(m));
      const saved = Number(sessionStorage.getItem("eyecatchMonth"));
      if (saved >= 1 && saved <= 12) return saved;
    } catch {}
  }
  return new Date().getMonth() + 1;
}

function Season({ month }: { month: number }) {
  return <div className="pointer-events-none absolute inset-0 overflow-hidden">{SCENES[month]?.()}</div>;
}

/** 右上のほうから、ゆらゆら落ちてくるもの（外側でななめに落とし、内側で左右にゆらす） */
function Flutter({ count, item, className }: { count: number; item: (i: number) => React.ReactNode; className: string }) {
  return range(count).map((i) => (
    <span
      key={i}
      className={`${className} absolute`}
      style={{
        left: `${rnd(i, 1) * 110}%`,
        top: `${rnd(i, 2) * 100 - 10}%`,
        animationDelay: `-${rnd(i, 3) * 3}s`,
        animationDuration: `${2.6 + rnd(i, 4) * 1.2}s`,
      }}
    >
      <span className="sway inline-block" style={{ animationDelay: `-${rnd(i, 8) * 1.4}s` }}>
        {item(i)}
      </span>
    </span>
  ));
}

const Petal = (i: number) => {
  const w = 11 + rnd(i, 5) * 8;
  return (
    <svg width={w} height={w * 0.7} viewBox="0 0 20 14" style={{ transform: `rotate(${rnd(i, 6) * 360}deg)` }}>
      <path d="M1,7 Q8,-2 19,4 L16,7 L19,10 Q8,16 1,7 Z" fill="#FBCFE8" />
    </svg>
  );
};

/** 少しずつ色のちがう紅葉（赤〜だいだい〜こい赤） */
const LEAF_COLORS = ["#DC2626", "#EA580C", "#F97316", "#B91C1C", "#E11D48", "#F59E0B"];
const MapleLeaf = (i: number) => {
  const w = 18 + rnd(i, 5) * 12;
  return (
    <svg width={w} height={w} viewBox="-12 -12 24 24" style={{ transform: `rotate(${rnd(i, 6) * 360}deg)` }}>
      <path
        d="M0,-11 L2.5,-5 L7,-8 L5.5,-2.5 L11,-2 L6.5,1.5 L8,6 L2,4 L0.8,7 L0.8,11 L-0.8,11 L-0.8,7 L-2,4 L-8,6 L-6.5,1.5 L-11,-2 L-5.5,-2.5 L-7,-8 L-2.5,-5 Z"
        fill={LEAF_COLORS[i % LEAF_COLORS.length]}
      />
    </svg>
  );
};

/** 花火の色 */
const FIREWORK_COLORS = ["#F87171", "#FACC15", "#60A5FA", "#F472B6", "#34D399", "#FB923C", "#C084FC"];

/** 花火の場所・大きさ・色を、毎回ランダムに決める。同時に出るのは 3 個まで。棒人間とほかの花火にはなるべくかけない */
function makeFireworks() {
  const list: { x: number; y: number; size: number; color: string; delay: number }[] = [];
  const colors = [...FIREWORK_COLORS].sort(() => Math.random() - 0.5);
  // 画面の大きさ（px）。花火の場所は % で置くので、重なりは px になおして調べる
  const w = Math.min(window.innerWidth, 480);
  const h = window.innerHeight;
  for (let tries = 0; list.length < 3 && tries < 300; tries++) {
    const x = 8 + Math.random() * 84;
    const y = 6 + Math.random() * 88;
    const size = 150 + Math.random() * 140;
    const px = (x / 100) * w;
    const py = (y / 100) * h;
    if (Math.hypot(px - w / 2, py - h / 2) < size * 0.42 + 80) continue; // 棒人間にかかる
    if (list.some((f) => Math.hypot((f.x / 100) * w - px, (f.y / 100) * h - py) < (f.size + size) * 0.38)) continue; // ほかの花火と重なりすぎ
    list.push({ x, y, size, color: colors[list.length], delay: list.length * 0.5 + Math.random() * 0.3 });
  }
  return list;
}

function Fireworks() {
  const [list] = useState(makeFireworks);
  return list.map((f, i) => (
    <svg
      key={i}
      width={f.size}
      height={f.size}
      viewBox="-70 -70 140 140"
      className="firework absolute"
      style={{ left: `${f.x}%`, top: `${f.y}%`, animationDelay: `-${f.delay}s` }}
    >
      {range(16).map((k) => {
        const a = (k / 16) * Math.PI * 2;
        return <line key={k} x1={Math.cos(a) * 18} y1={Math.sin(a) * 18} x2={Math.cos(a) * 60} y2={Math.sin(a) * 60} stroke={f.color} strokeWidth="4" strokeLinecap="round" />;
      })}
      {range(16).map((k) => {
        const a = ((k + 0.5) / 16) * Math.PI * 2;
        return <circle key={`d${k}`} cx={Math.cos(a) * 42} cy={Math.sin(a) * 42} r="2.5" fill="#FFFFFF" />;
      })}
    </svg>
  ));
}

/** 12月：大きさのちがう雪 */
const Snow = (i: number) => {
  const size = 5 + rnd(i, 5) * 10;
  return <span className="block rounded-full bg-white" style={{ width: size, height: size, opacity: 0.65 + rnd(i, 6) * 0.35 }} />;
};

const SCENES: Record<number, () => React.ReactNode> = {
  // 4月：右上から桜の花びらがゆらゆら落ちてくる（棒人間は黄色い学生帽）
  4: () => <Flutter count={24} item={Petal} className="petal-fall" />,
  // 8月：花火がゆっくり開く（場所・大きさは毎回ランダム）
  8: () => <Fireworks />,
  // 10月：色の少しちがう紅葉がぱらぱら落ちる
  10: () => <Flutter count={18} item={MapleLeaf} className="leaf-fall" />,
  // 12月：雪が桜と同じくらいの速さで降る（棒人間はマフラーをなびかせる）
  12: () => <Flutter count={30} item={Snow} className="snow-fall" />,
};
