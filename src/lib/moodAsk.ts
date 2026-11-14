// 「今日の気分は？」を、アプリを開くたびに出す（いまだけ）。
// ふだんは 1 日 1 回、その日の気分がまだのときだけ出す。
// TODO: 元に戻すときは MOOD_EVERY_LAUNCH を false にする
export const MOOD_EVERY_LAUNCH = true;

const KEY = "moodAskedThisLaunch";

/** このアプリを開いてから、まだ気分を聞いていないか（アプリを閉じると消える sessionStorage で覚える） */
export function moodAskPending(): boolean {
  if (!MOOD_EVERY_LAUNCH || typeof window === "undefined") return false;
  try {
    return !sessionStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function markMoodAsked() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // 保存できなくても、気分の画面がもう一度出るだけ
  }
}
