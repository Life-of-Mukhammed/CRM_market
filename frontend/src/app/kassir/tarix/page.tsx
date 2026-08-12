'use client';
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { sales as salesApi } from '@/lib/api';
import { Sale } from '@/types';
import { formatMoney, formatDateTime, getPaymentLabel } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Receipt } from '@/components/pos/Receipt';

export default function KassirTarix() {
  const [page, setPage] = useState(1);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  const { data } = useQuery({
    queryKey: ['sales', page],
    queryFn: () => salesApi.list({ page, limit: 20 }).then((r) => r.data),
  });

  const { data: todayData } = useQuery({
    queryKey: ['sales-today'],
    queryFn: () => salesApi.today().then((r) => r.data),
  });

  const sales: Sale[] = data?.sales || [];
  const stats = todayData?.stats;

  const payBadge: Record<string, string> = {
    NAQD: 'bg-green-100 text-green-700',
    KARTA: 'bg-blue-100 text-blue-700',
    ARALASH: 'bg-purple-100 text-purple-700',
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Сотув тарихи</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Сизнинг барча сотувларингиз</p>
        </div>

        {/* Today stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="stat-card">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Бугунги савдо</p>
              <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{stats.count} та</p>
            </div>
            <div className="stat-card">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Тушум</p>
              <p className="text-xl font-black text-green-600 mt-1">{formatMoney(stats.revenue)}</p>
            </div>
          </div>
        )}

        {/* Sales table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Чек #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Сана</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Сумма</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Тўлов</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Маҳсулот</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-primary-700 dark:text-primary-400">
                        {sale.saleNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDateTime(sale.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                      {formatMoney(sale.finalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${payBadge[sale.paymentType] || 'bg-gray-100 text-gray-600'}`}>
                        {getPaymentLabel(sale.paymentType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500">
                      {sale.items?.length} та
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="text-xs text-primary-600 hover:underline"
                        >
                          Кўриш
                        </button>
                        <button
                          onClick={() => setReceiptSale(sale)}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Чек
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sales.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-2">📋</p>
                <p>Ҳали сотув қилинмаган</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {data && data.total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-dark-700">
              <p className="text-sm text-gray-500">Жами: {data.total} та сотув</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
                >
                  ← Олдинги
                </button>
                <span className="btn-secondary py-1.5 px-3 text-sm">{page}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= data.total}
                  className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
                >
                  Кейинги →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sale detail */}
      {selectedSale && (
        <Modal open={!!selectedSale} onClose={() => setSelectedSale(null)} title={`Сотув: ${selectedSale.saleNumber}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Сана</p>
                <p className="font-semibold">{formatDateTime(selectedSale.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Тўлов</p>
                <p className="font-semibold">{getPaymentLabel(selectedSale.paymentType)}</p>
              </div>
            </div>
            <div className="border-t border-gray-100 dark:border-dark-700 pt-4">
              <p className="font-semibold mb-3">Маҳсулотлар</p>
              <div className="space-y-2">
                {selectedSale.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
                      <p className="text-gray-400 text-xs">{item.quantity} × {formatMoney(item.unitPrice)}</p>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">{formatMoney(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100 dark:border-dark-700 pt-3 flex justify-between font-black text-lg">
              <span>Жами:</span>
              <span className="text-primary-700 dark:text-primary-400">{formatMoney(selectedSale.finalAmount)}</span>
            </div>
          </div>
        </Modal>
      )}

      {receiptSale && (
        <Receipt
          sale={receiptSale}
          open={!!receiptSale}
          onClose={() => setReceiptSale(null)}
        />
      )}
    </DashboardLayout>
  );
}
