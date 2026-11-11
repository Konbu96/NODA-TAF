import type { MoodKind } from "@/lib/types";

// 今日の気分の顔（アプリで描いたイラスト）

export const MOODS: { kind: MoodKind; label: string }[] = [
  { kind: "great", label: "絶好調" },
  { kind: "good", label: "いい感じ" },
  { kind: "normal", label: "ふつう" },
  { kind: "sleepy", label: "ねむい" },
  { kind: "tired", label: "へとへと" },
  { kind: "legPain", label: "足が痛い" },
  { kind: "sick", label: "体調悪め" },
];

const ink = "#0F172A";

export function MoodFace({ kind, size = 22 }: { kind: MoodKind; size?: number }) {
  const label = MOODS.find((m) => m.kind === kind)?.label ?? "";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={`今日の気分：${label}`} className="shrink-0">
      {kind === "great" && (
        <>
          <circle cx="12" cy="12" r="10" fill="#FDE68A" stroke={ink} strokeWidth="1.5" />
          <polyline points="7,10 8.5,8.3 10,10" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="14,10 15.5,8.3 17,10" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7.5 13.2h9a4.5 4.5 0 0 1-9 0Z" fill={ink} />
        </>
      )}
      {kind === "good" && (
        <>
          <circle cx="12" cy="12" r="10" fill="#BBF7D0" stroke={ink} strokeWidth="1.5" />
          <circle cx="9" cy="10" r="1.2" fill={ink} />
          <circle cx="15" cy="10" r="1.2" fill={ink} />
          <path d="M8.2 14a4.3 4.3 0 0 0 7.6 0" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {kind === "normal" && (
        <>
          <circle cx="12" cy="12" r="10" fill="#E2E8F0" stroke={ink} strokeWidth="1.5" />
          <circle cx="9" cy="10" r="1.2" fill={ink} />
          <circle cx="15" cy="10" r="1.2" fill={ink} />
          <path d="M8.5 15.2h7" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {kind === "sleepy" && (
        <>
          <circle cx="12" cy="12" r="10" fill="#DBEAFE" stroke={ink} strokeWidth="1.5" />
          <path d="M7.3 10.5h3.2M13.5 10.5h3.2" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="15.5" r="1.4" fill="none" stroke={ink} strokeWidth="1.3" />
          <path d="M17 3.5h3l-3 3h3" fill="none" stroke="#1E3A8A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === "tired" && (
        <>
          <circle cx="12" cy="12" r="10" fill="#FED7AA" stroke={ink} strokeWidth="1.5" />
          <path d="M7.5 8.5l2.5 2.5M10 8.5l-2.5 2.5M14 8.5l2.5 2.5M16.5 8.5L14 11" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 16q1-1.2 2 0t2 0 2 0 2 0" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M19.5 6.5c0 1-.7 1.8-1.5 1.8s-1.5-.8-1.5-1.8L18 4Z" fill="#60A5FA" />
        </>
      )}
      {kind === "legPain" && (
        <>
          <circle cx="12" cy="12" r="10" fill="#FECACA" stroke={ink} strokeWidth="1.5" />
          <path d="M6.8 8.2l3 1M17.2 8.2l-3 1" fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="9" cy="11" r="1.1" fill={ink} />
          <circle cx="15" cy="11" r="1.1" fill={ink} />
          <path d="M9 16.2q3-2.2 6 0" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
          <g transform="rotate(-30 17 14.5)">
            <rect x="14.5" y="13.3" width="5" height="2.4" rx="1.2" fill="#FDE68A" stroke={ink} strokeWidth="0.9" />
            <circle cx="16.4" cy="14.5" r="0.35" fill={ink} />
            <circle cx="17.6" cy="14.5" r="0.35" fill={ink} />
          </g>
        </>
      )}
      {kind === "sick" && (
        <>
          <circle cx="12" cy="12" r="10" fill="#D9F99D" stroke={ink} strokeWidth="1.5" />
          <path d="M7.3 9.8q1.6 1.2 3.2 0M13.5 9.8q1.6 1.2 3.2 0" fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M6.5 13.5L2.5 12M17.5 13.5l4-1.5" fill="none" stroke={ink} strokeWidth="1" strokeLinecap="round" />
          <rect x="6.5" y="12.2" width="11" height="6" rx="2.2" fill="#FFFFFF" stroke={ink} strokeWidth="1.2" />
          <path d="M8.5 14.6h7M8.5 16.2h7" fill="none" stroke="#CBD5E1" strokeWidth="0.9" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/** 今日まだアプリを開いていない（気分を選んでいない）人の顔。灰色でうすく、目を閉じた形 */
export function NoMoodFace({ size = 22 }: { size?: number }) {
  const gray = "#94A3B8";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="今日はまだ開いていません" className="shrink-0">
      <circle cx="12" cy="12" r="10" fill="#F1F5F9" stroke={gray} strokeWidth="1.5" strokeDasharray="3 2" />
      <path d="M7.5 10.5h3M13.5 10.5h3" fill="none" stroke={gray} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.5 15.2h5" fill="none" stroke={gray} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
