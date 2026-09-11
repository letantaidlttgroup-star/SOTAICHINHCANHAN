// sinking.ts — Personal Wealth (Web/PWA)
// Quỹ tích lũy dần: để dành trước cho khoản chi lớn theo chu kỳ, tránh "sốc"
// ngân sách vào đúng tháng phải đóng (bảo hiểm, thuế, phí thường niên...).
//
// LƯU Ý net worth: tiền tích lũy là tiền THẬT đã nằm trong ví → KHÔNG cộng
// thêm vào net worth. Quỹ chỉ "đánh dấu" (earmark) phần tiền dành cho mục tiêu.

import {
  db,
  type SinkingFund,
  type SinkingContribution,
  sinkingSaved,
  sinkingProgress,
  suggestedContribution,
  newId,
} from './db';

const DAY = 86_400_000;

async function contributionsByFund(): Promise<Map<string, SinkingContribution[]>> {
  const rows = await db.sinkingContributions.toArray();
  const map = new Map<string, SinkingContribution[]>();
  for (const c of rows) {
    const arr = map.get(c.fundId) ?? [];
    arr.push(c);
    map.set(c.fundId, arr);
  }
  return map;
}

export interface SinkingView {
  fund: SinkingFund;
  saved: number;
  target: number;
  progress: number;    // 0..1 theo số tiền
  suggested: number;   // nên để dành mỗi tháng từ giờ tới hạn
  onTrack: boolean;    // đã dành kịp so với tiến độ thời gian chưa
  expectedByNow: number;
}

/** Kỳ vọng đã dành tới thời điểm này (tuyến tính theo thời gian từ lúc tạo tới hạn). */
function expectedSaved(fund: SinkingFund, now: number): number {
  const span = fund.dueDate - fund.createdAt;
  if (span <= 0) return fund.targetAmount;
  const ratio = Math.min(1, Math.max(0, (now - fund.createdAt) / span));
  return fund.targetAmount * ratio;
}

export async function sinkingViews(
  includeInactive = false,
  now: number = Date.now(),
): Promise<SinkingView[]> {
  const [funds, byFund] = await Promise.all([db.sinkingFunds.toArray(), contributionsByFund()]);

  return funds
    .filter((f) => (includeInactive ? true : f.isActive))
    .map((f) => {
      const saved = sinkingSaved(byFund.get(f.id) ?? []);
      const expectedByNow = expectedSaved(f, now);
      return {
        fund: f,
        saved,
        target: f.targetAmount,
        progress: sinkingProgress(f, saved),
        suggested: suggestedContribution(f, saved, now),
        onTrack: saved >= expectedByNow * 0.98, // cho phép lệch nhẹ 2%
        expectedByNow,
      };
    })
    .sort((a, b) => a.fund.dueDate - b.fund.dueDate);
}

/** Ghi nhận một lần để dành cho quỹ. */
export async function recordContribution(input: {
  fundId: string;
  amount: number;
  date?: number;
}): Promise<void> {
  const contribution: SinkingContribution = {
    id: newId(),
    fundId: input.fundId,
    date: input.date ?? Date.now(),
    amount: input.amount,
  };
  await db.sinkingContributions.add(contribution);
}

export interface SinkingReminder {
  view: SinkingView;
  behindBy: number; // số tiền còn thiếu so với kỳ vọng (0 nếu đúng tiến độ)
}

/**
 * Nhắc để dành: các quỹ đang bật nhắc mà (a) trễ tiến độ, hoặc
 * (b) sắp tới ngày nhắc trong tháng. Dùng cho card "Sắp tới hạn" & web push.
 */
export async function sinkingReminders(now: number = Date.now()): Promise<SinkingReminder[]> {
  const views = await sinkingViews(false, now);
  const today = new Date(now).getDate();

  return views
    .filter((v) => v.fund.reminderEnabled)
    .filter((v) => {
      const behind = !v.onTrack;
      const dueDayNear =
        v.fund.reminderDayOfMonth != null &&
        Math.abs(today - v.fund.reminderDayOfMonth) <= 1;
      return behind || dueDayNear;
    })
    .map((v) => ({ view: v, behindBy: Math.max(0, v.expectedByNow - v.saved) }))
    .sort((a, b) => b.behindBy - a.behindBy);
}
