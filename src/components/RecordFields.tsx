"use client";

import { chipOff, chipOn, RefMark } from "@/components/ui";
import { kindOf, liveMark, liveWind, markToDigits, onlyDigits, parseMark, showMark, WIND_EVENTS, windValue } from "@/lib/marks";
import type { RecordInput } from "@/lib/store";
import type { RecordDoc } from "@/lib/types";

/** 保存してある記録 → 入力欄の中身 */
export function recordInputOf(r: RecordDoc): RecordInput {
  return {
    event: r.event,
    digits: r.isShort ? "" : markToDigits(r.mark),
    short: !!r.isShort,
    windDigits: r.wind != null ? String(Math.round(Math.abs(r.wind) * 10)) : "",
    minus: r.wind != null && r.wind < 0,
  };
}

/** 1 種目分の記録の欄（記録・ショート・風速） */
export function RecordFields({ rec, set, hadRecord, label }: { rec: RecordInput; set: (p: Partial<RecordInput>) => void; hadRecord: boolean; label?: string }) {
  const ev = rec.event;
  const parsed = parseMark(ev, rec.digits);
  const field = kindOf(ev) === "distance";
  const hasWind = WIND_EVENTS.includes(ev) && !rec.short;
  const w = windValue(rec.windDigits, rec.minus);
  const isRef = w != null && w > 2.0;
  return (
    <div className="flex flex-col gap-2.5 border-t border-divider pt-3.5">
      <label className="flex flex-col gap-1.5 text-[13px] font-bold text-sub">
        記録
        <span className="flex items-center gap-2 text-ink">
          <input
            inputMode="numeric"
            placeholder={rec.short ? "ショート" : "数字のみ入力"}
            disabled={rec.short}
            value={rec.short ? "" : liveMark(ev, rec.digits)}
            onChange={(e) => set({ digits: onlyDigits(e.target.value) })}
            aria-label={`${label ?? ev} の記録`}
            className="h-12 w-[150px] rounded-lg border border-line bg-white px-3 text-left text-xl font-bold tracking-[0.04em] placeholder:text-sm placeholder:font-normal placeholder:tracking-normal"
          />
          <span className="text-base font-bold">{field ? "m" : kindOf(ev) === "points" ? "点" : ""}</span>
          {/* フィールド種目：決められた距離に届かず計測されなかったとき */}
          {field && (
            <button
              type="button"
              onClick={() => set({ short: !rec.short, digits: "" })}
              aria-pressed={!!rec.short}
              className={`ml-auto h-12 rounded-lg px-4 text-sm font-bold ${rec.short ? chipOn : chipOff}`}
            >
              ショート
            </button>
          )}
        </span>
      </label>
      {rec.short ? (
        <p className="m-0 text-[11px] text-[#94A3B8]">ショート（記録なし）として保存します。PB には入りません</p>
      ) : (
        parsed && <p className="m-0 text-[11px] text-[#94A3B8]">{showMark(parsed.mark)} として保存します</p>
      )}

      {hasWind && (
        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-[13px] font-bold text-sub">風速</p>
          <div className="flex items-center gap-1.5">
            <div role="radiogroup" aria-label="追い風か向かい風か" className="flex gap-1">
              <button type="button" onClick={() => set({ minus: false })} aria-label="追い風（プラス）" className={`h-12 w-11 rounded-lg text-lg font-bold ${rec.minus ? chipOff : chipOn}`}>
                +
              </button>
              <button type="button" onClick={() => set({ minus: true })} aria-label="向かい風（マイナス）" className={`h-12 w-11 rounded-lg text-lg font-bold ${rec.minus ? chipOn : chipOff}`}>
                −
              </button>
            </div>
            <input
              inputMode="numeric"
              placeholder="数字のみ入力"
              aria-label={`${label ?? ev} の風速`}
              value={liveWind(rec.windDigits)}
              onChange={(e) => set({ windDigits: onlyDigits(e.target.value, 3) })}
              className="h-12 w-[120px] rounded-lg border border-line bg-white px-3 text-left text-lg font-bold placeholder:text-sm placeholder:font-normal"
            />
            <span className="text-[15px]">m</span>
            {isRef && <RefMark />}
          </div>
          {w != null && (
            <p className="m-0 text-[11px] text-[#94A3B8]">
              {w >= 0 ? "+" : "−"}
              {Math.abs(w).toFixed(1)}m として保存します{isRef ? "（追い風参考）" : ""}
            </p>
          )}
        </div>
      )}
      {hadRecord && <p className="m-0 text-[11px] text-muted">記録を消したいときは、欄を空にして保存してください。</p>}
    </div>
  );
}
