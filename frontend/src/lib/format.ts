// frontend/src/lib/format.ts

// 金額表示（例: 1,234 円）
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0
  }).format(value);
};

// 日付表示（例: 2025/12/19）
export const formatDate = (value: string | Date): string => {
  const d = typeof value === 'string' ? new Date(value) : value;

  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// もしデフォルト import で使っている箇所があっても壊れないようにしておく
const format = { formatCurrency, formatDate };
export default format;
