'use client';
import { Sale } from '@/types';
import { formatMoney, formatDateTime, getPaymentLabel } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';

interface ReceiptProps {
  sale: Sale;
  open: boolean;
  onClose: () => void;
}

export function Receipt({ sale, open, onClose }: ReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal open={open} onClose={onClose} title="Чек" size="sm">
      {/* Thermal receipt preview */}
      <div className="font-mono text-xs">
        <div className="text-center border-b border-dashed border-gray-300 dark:border-gray-600 pb-3 mb-3">
          <div className="text-base font-black">MARKET</div>
          <div className="text-gray-500">Атир ва китоб дўкони</div>
        </div>

        <div className="flex justify-between mb-1">
          <span className="text-gray-500">Сана:</span>
          <span>{formatDateTime(sale.createdAt)}</span>
        </div>
        <div className="flex justify-between mb-3">
          <span className="text-gray-500">Чек #:</span>
          <span className="font-bold">{sale.saleNumber}</span>
        </div>

        <div className="border-t border-dashed border-gray-300 dark:border-gray-600 pt-2 mb-2">
          {sale.items.map((item, i) => (
            <div key={i} className="mb-2">
              <div className="text-gray-800 dark:text-gray-200 font-medium">{item.name}</div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400 pl-2">
                <span>{item.quantity} x {formatMoney(item.unitPrice)}</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatMoney(item.totalPrice)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-300 dark:border-gray-600 pt-2">
          {sale.discount > 0 && (
            <div className="flex justify-between text-green-600 mb-1">
              <span>Умумий чегирма:</span>
              <span>-{formatMoney(sale.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-base mt-1">
            <span>ЖАМИ:</span>
            <span>{formatMoney(sale.finalAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs mt-1">
            <span>Тўлов:</span>
            <span>{getPaymentLabel(sale.paymentType)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-300 dark:border-gray-600 pt-3 mt-3 text-center text-gray-500">
          <p>Харид учун раҳмат!</p>
          <p>Қайтиб келинг!</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 space-y-2">
        <button onClick={handlePrint} className="btn-primary w-full">
          🖨️ Чек чиқариш
        </button>
        <button onClick={onClose} className="btn-secondary w-full">
          ✨ Янги сотув
        </button>
      </div>

      {/* Hidden print version */}
      <div className="print-only fixed inset-0 bg-white p-4 font-mono text-xs">
        <div className="max-w-xs mx-auto">
          <div className="text-center mb-4">
            <div className="text-lg font-black">MARKET</div>
            <div>Атир ва китоб дўкони</div>
          </div>
          <div className="border-t border-black pt-2 mb-2">
            <div>Сана: {formatDateTime(sale.createdAt)}</div>
            <div>Чек: {sale.saleNumber}</div>
          </div>
          <div className="border-t border-dashed border-black pt-2 mb-2">
            {sale.items.map((item, i) => (
              <div key={i} className="mb-1">
                <div>{item.name}</div>
                <div className="flex justify-between pl-2">
                  <span>{item.quantity} x {formatMoney(item.unitPrice)}</span>
                  <span>{formatMoney(item.totalPrice)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-black pt-2">
            <div className="flex justify-between font-black text-base">
              <span>ЖАМИ:</span>
              <span>{formatMoney(sale.finalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Тўлов:</span>
              <span>{getPaymentLabel(sale.paymentType)}</span>
            </div>
          </div>
          <div className="border-t border-dashed border-black pt-2 mt-2 text-center">
            <p>Харид учун раҳмат!</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
