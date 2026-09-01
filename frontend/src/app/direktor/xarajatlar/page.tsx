'use client';
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Modal } from '@/components/ui/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenses as expensesApi } from '@/lib/api';
import { Expense, ExpenseCategory } from '@/types';
import { formatMoney, formatDate, getExpenseCategoryLabel, getExpenseCategoryIcon } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const categories: ExpenseCategory[] = ['ARENDA', 'KOMMUNAL', 'OYLIK', 'TRANSPORT', 'BOSHQA'];

const schema = z.object({
  title: z.string().min(1, 'Номи киритилиши шарт'),
  category: z.enum(['ARENDA', 'KOMMUNAL', 'OYLIK', 'TRANSPORT', 'BOSHQA']),
  amount: z.coerce.number().min(1, "Сумма 0 дан катта бўлиши керак"),
  date: z.string().min(1, 'Сана киритилиши шарт'),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function XarajatlarPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', categoryFilter],
    queryFn: () =>
      expensesApi.list(categoryFilter ? { category: categoryFilter } : undefined).then((r) => r.data),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'BOSHQA', date: todayStr() },
  });

  const category = watch('category');

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => editExpense
      ? expensesApi.update(editExpense.id, data)
      : expensesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setModalOpen(false);
      setEditExpense(null);
      reset({ category: 'BOSHQA', date: todayStr(), title: '', amount: undefined, note: '' });
      toast.success(editExpense ? 'Харажат янгиланди' : 'Харажат қўшилди');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Хатолик';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteId(null);
      toast.success('Харажат ўчирилди');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Хатолик';
      toast.error(msg);
    },
  });

  const openEdit = (expense: Expense) => {
    setEditExpense(expense);
    setValue('title', expense.title);
    setValue('category', expense.category);
    setValue('amount', expense.amount);
    setValue('date', expense.date.slice(0, 10));
    setValue('note', expense.note || '');
    setModalOpen(true);
  };

  const openNew = () => {
    setEditExpense(null);
    reset({ category: 'BOSHQA', date: todayStr(), title: '', amount: undefined, note: '' });
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    saveMutation.mutate(data);
  };

  const list: Expense[] = data?.expenses || [];
  const totalAmount: number = data?.totalAmount || 0;
  const createdByName = (e: Expense) => typeof e.createdBy === 'string' ? '—' : e.createdBy.name;

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Харажатлар</h1>
            <p className="text-gray-500 text-sm mt-1">Аренда, коммунал ва бошқа жорий харажатларни қайд қилинг</p>
          </div>
          <button onClick={openNew} className="btn-primary flex items-center gap-2">
            <span>+</span> Янги харажат
          </button>
        </div>

        <div className="stat-card w-fit">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Жами харажат</p>
          <p className="text-2xl font-black text-red-600 mt-1">{formatMoney(totalAmount)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('')}
            className={`badge ${categoryFilter === '' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-gray-300'}`}
          >
            Барчаси
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`badge ${categoryFilter === c ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-gray-300'}`}
            >
              {getExpenseCategoryIcon(c)} {getExpenseCategoryLabel(c)}
            </button>
          ))}
        </div>

        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">💸</p>
              <p>Ҳали харажат қайд қилинмаган. Юқоридаги тугма орқали қўшинг.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-dark-700">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Номи</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Тоифа</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Сана</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Киритган</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Сумма</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
                  {list.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{e.title}</p>
                        {e.note && <p className="text-xs text-gray-400 mt-0.5">{e.note}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge bg-gray-100 text-gray-700 dark:bg-dark-700 dark:text-gray-300">
                          {getExpenseCategoryIcon(e.category)} {getExpenseCategoryLabel(e.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(e.date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{createdByName(e)}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">{formatMoney(e.amount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3 justify-end">
                          <button onClick={() => openEdit(e)} className="text-xs text-primary-600 hover:underline font-medium">
                            Таҳрирлаш
                          </button>
                          <button onClick={() => setDeleteId(e.id)} className="text-xs text-red-500 hover:underline font-medium">
                            Ўчириш
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditExpense(null); reset(); }}
        title={editExpense ? 'Харажатни таҳрирлаш' : 'Янги харажат'}
        footer={
          <>
            <button onClick={() => { setModalOpen(false); setEditExpense(null); reset(); }} className="btn-secondary">
              Бекор қилиш
            </button>
            <button onClick={handleSubmit(onSubmit)} disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Сақланмоқда...' : editExpense ? 'Сақлаш' : 'Қўшиш'}
            </button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Номи *</label>
            <input {...register('title')} className="input" placeholder="Масалан: Август ойи аренда тўлови" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Тоифа *</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setValue('category', c)}
                  className={`badge ${category === c ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-gray-300'}`}
                >
                  {getExpenseCategoryIcon(c)} {getExpenseCategoryLabel(c)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Сумма (сўм) *</label>
              <input {...register('amount')} type="number" step="0.01" className="input" placeholder="0" />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Сана *</label>
              <input {...register('date')} type="date" className="input" />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Изоҳ (ихтиёрий)</label>
            <input {...register('note')} className="input" placeholder="Қўшимча маълумот" />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Харажатни ўчириш"
        size="sm"
        footer={
          <>
            <button onClick={() => setDeleteId(null)} className="btn-secondary">Бекор қилиш</button>
            <button
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="btn-danger"
            >
              Ўчириш
            </button>
          </>
        }
      >
        <p className="text-gray-600 dark:text-gray-400">Бу харажатни ўчиришни тасдиқлайсизми?</p>
      </Modal>
    </DashboardLayout>
  );
}
