"use client";

import { useEffect } from "react";

/**
 * 1 行の入力欄でスマホのエンター（改行ボタン）を押したら、その画面の「保存する」などの
 * メインのボタン（PrimaryButton）を押したことにする。
 * - 下から出る画面（Sheet）の中で押したときは、その中のボタンを押す
 * - 文章を書く欄（textarea）は、これまでどおり改行する
 * - 日本語の変換を決めるためのエンターでは押さない
 */
export function EnterToSave() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.isComposing || e.keyCode === 229) return;
      const el = e.target as HTMLElement | null;
      if (!(el instanceof HTMLInputElement)) return;
      if (["checkbox", "radio", "button", "submit"].includes(el.type)) return;
      // 自分でエンターを受け取るフォーム（ログインなど）はそのまま
      if (el.form) return;
      const dialog = el.closest('[role="dialog"]');
      const scope = dialog ?? document.querySelector("main");
      if (!scope) return;
      const button = [...scope.querySelectorAll<HTMLButtonElement>("button[data-primary]")].find(
        (b) => !b.disabled && (dialog || !b.closest('[role="dialog"]')),
      );
      if (!button) return;
      e.preventDefault();
      el.blur(); // キーボードを閉じる
      button.click();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
