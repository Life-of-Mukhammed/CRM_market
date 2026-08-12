import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('uz-Cyrl').format(Math.round(amount)) + " сўм";
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('uz-Cyrl', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('uz-Cyrl', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10)}`;
  }
  return phone;
}

export function calcProfit(salePrice: number, costPrice: number) {
  const profit = salePrice - costPrice;
  const percent = costPrice > 0 ? (profit / costPrice) * 100 : 0;
  return { profit, percent: Math.round(percent * 10) / 10 };
}

export function getPaymentLabel(type: string): string {
  const labels: Record<string, string> = {
    NAQD: 'Нақд пул',
    KARTA: 'Банк карта',
    ARALASH: 'Аралаш',
  };
  return labels[type] || type;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    DIREKTOR: 'Директор',
    KASSIR: 'Кассир',
  };
  return labels[role] || role;
}

export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    DIREKTOR: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    KASSIR: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}

export function getCategoryIcon(product: { category?: { icon?: string } | string }): string {
  const cat = product.category;
  if (cat && typeof cat === 'object' && cat.icon) return cat.icon;
  return '📦';
}

export function getCategoryName(category?: { name?: string } | string): string {
  if (!category) return '—';
  if (typeof category === 'string') return category;
  return category.name || '—';
}
