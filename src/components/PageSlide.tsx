"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

// メインの 4 画面の切りかえ以外で、画面を横にスライドさせて出す。
// 奥へ進むときは右から、戻るとき（戻るボタン・保存のあと）は左から入ってくる。

type Slide = "forward" | "back" | "none";

// 次の画面の出し方。リンクを押したとき PageTransition が決める。決まっていなければ「戻る」
let next: Slide | null = null;
export const setSlide = (s: Slide) => {
  next = s;
};

export function PageSlide({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState({ path: pathname, cls: "", n: 0 });

  // 画面が変わったら、描く前に出し方を決める（新しい画面が一瞬そのまま見えないように）
  if (state.path !== pathname) {
    // ここでは読むだけにする（消すのは描き終わったあと。描く処理が 2 回動いても同じ向きになるように）
    const s = next ?? "back";
    const still = s === "none" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setState({ path: pathname, cls: still ? "" : s === "forward" ? "slide-from-right" : "slide-from-left", n: state.n + 1 });
  }

  useEffect(() => {
    next = null;
  }, [state.n]);

  return (
    // 横にはみ出した分は見せない（スクロールもさせない）
    <div key={state.n} className={`overflow-x-clip ${state.cls}`}>
      {children}
    </div>
  );
}
