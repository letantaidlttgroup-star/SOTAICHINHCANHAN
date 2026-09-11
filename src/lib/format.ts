const nf = new Intl.NumberFormat('vi-VN');
export const money = (n: number) => nf.format(Math.round(n));
export const vnd = (n: number) => money(n) + ' ₫';
export const billions = (n: number) =>
  (n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 });

export const currentMonthRange = () => {
  const d = new Date();
  return {
    start: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
    end: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
  };
};

export const daysFromNow = (ms: number) => Math.round((ms - Date.now()) / 86_400_000);

export const compactVnd = (n: number): string => {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e9) return sign + (a / 1e9).toFixed(1).replace('.0', '') + ' tỷ';
  if (a >= 1e6) return sign + (a / 1e6).toFixed(1).replace('.0', '') + ' tr';
  if (a >= 1e3) return sign + Math.round(a / 1e3) + 'k';
  return sign + a;
};
