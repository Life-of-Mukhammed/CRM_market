'use client';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { formatMoney } from '@/lib/utils';
import { PaymentType, CartItem } from '@/types';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  total: number;
  discount: number;
  items: CartItem[];
  onSubmit: (data: { paymentType: PaymentType; note?: string }) => Promise<string>;
}

export function PaymentModal({ open, onClose, total, discount, items, onSubmit }: PaymentModalProps) {
  const finalAmount = total - discount;
  const [payType, setPayType] = useState<PaymentType>('NAQD');
  const [loading, setLoading] = useState(false);
  const [mixedNaqd, setMixedNaqd] = useState(0);
  const [mixedKarta, setMixedKarta] = useState(0);

  const handlePay = async () => {
    if (payType === 'ARALASH' && (mixedNaqd + mixedKarta) < finalAmount) {
      toast.error('Тўлов суммаси етарли эмас');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ paymentType: payType });
    } finally {
      setLoading(false);
    }
  };

  const payTypes: { type: PaymentType; label: string; icon: string }[] = [
    { type: 'NAQD', label: 'Нақд пул', icon: '💵' },
    { type: 'KARTA', label: 'Банк карта', icon: '💳' },
    { type: 'ARALASH', label: 'Аралаш', icon: '🔀' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Тўлов" size="md">
      <div className="space-y-4">
        {/* Amount summary */}
        <div className="bg-gray-50 dark:bg-dark-700 rounded-2xl p-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>Жами ({items.length} маҳсулот)</span>
            <span>{formatMoney(total)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600 mb-1">
              <span>Чегирма</span>
              <span>-{formatMoney(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-xl text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-dark-600 mt-2">
            <span>Тўлов суммаси</span>
            <span className="text-primary-700 dark:text-primary-400">{formatMoney(finalAmount)}</span>
          </div>
        </div>

        {/* Payment type selection */}
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Тўлов тури</p>
          <div className="grid grid-cols-3 gap-2">
            {payTypes.map((pt) => (
              <button
                key={pt.type}
                onClick={() => setPayType(pt.type)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  payType === pt.type
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-dark-600 hover:border-primary-300'
                }`}
              >
                <span className="text-2xl">{pt.icon}</span>
                <span className={`text-xs font-semibold text-center ${
                  payType === pt.type ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                }`}>{pt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Aralash to'lov */}
        {payType === 'ARALASH' && (
          <div className="space-y-3 p-4 bg-primary-50 dark:bg-primary-900/10 rounded-xl border border-primary-200 dark:border-primary-800">
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-400">Аралаш тўлов</p>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Нақд пул</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                value={mixedNaqd || ''}
                onChange={(e) => {
                  const naqd = Number(e.target.value);
                  setMixedNaqd(naqd);
                  setMixedKarta(Math.max(0, finalAmount - naqd));
                }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Банк карта</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                value={mixedKarta || ''}
                onChange={(e) => setMixedKarta(Number(e.target.value))}
              />
            </div>
            <p className="text-xs text-primary-600">
              Жами: {formatMoney(mixedNaqd + mixedKarta)} / {formatMoney(finalAmount)}
            </p>
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={loading}
          className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>✓ Тўловни тасдиқлаш — {formatMoney(finalAmount)}</>
          )}
        </button>
      </div>
    </Modal>
  );
}
