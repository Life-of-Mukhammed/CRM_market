'use client';
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Modal } from '@/components/ui/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categories as categoriesApi } from '@/lib/api';
import { Category } from '@/types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  name: z.string().min(1, 'Ном киритилиши шарт'),
  icon: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const suggestedIcons = ['🧴', '📖', '👗', '👟', '💄', '🍬', '📱', '🧸', '⌚', '💍'];

export default function KategoriyalarPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const icon = watch('icon');

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => editCategory
      ? categoriesApi.update(editCategory.id, data)
      : categoriesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setModalOpen(false);
      setEditCategory(null);
      reset();
      toast.success(editCategory ? 'Категория янгиланди' : 'Категория қўшилди');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Хатолик';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setDeleteId(null);
      toast.success('Категория ўчирилди');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Хатолик';
      toast.error(msg);
    },
  });

  const openEdit = (category: Category) => {
    setEditCategory(category);
    setValue('name', category.name);
    setValue('icon', category.icon || '');
    setModalOpen(true);
  };

  const openNew = () => {
    setEditCategory(null);
    reset({ name: '', icon: '' });
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    saveMutation.mutate(data);
  };

  const list: Category[] = categoriesData || [];

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Категориялар</h1>
            <p className="text-gray-500 text-sm mt-1">Маҳсулотлар учун ўз категорияларингизни яратинг</p>
          </div>
          <button onClick={openNew} className="btn-primary flex items-center gap-2">
            <span>+</span> Янги категория
          </button>
        </div>

        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">🏷️</p>
              <p>Ҳали категория йўқ. Юқоридаги тугма орқали қўшинг.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-dark-700">
              {list.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon || '📦'}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{cat.name}</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => openEdit(cat)} className="text-xs text-primary-600 hover:underline font-medium">
                      Таҳрирлаш
                    </button>
                    <button onClick={() => setDeleteId(cat.id)} className="text-xs text-red-500 hover:underline font-medium">
                      Ўчириш
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditCategory(null); reset(); }}
        title={editCategory ? 'Категорияни таҳрирлаш' : 'Янги категория'}
        footer={
          <>
            <button onClick={() => { setModalOpen(false); setEditCategory(null); reset(); }} className="btn-secondary">
              Бекор қилиш
            </button>
            <button onClick={handleSubmit(onSubmit)} disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Сақланмоқда...' : editCategory ? 'Сақлаш' : 'Қўшиш'}
            </button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Номи *</label>
            <input {...register('name')} className="input" placeholder="Масалан: Эркаклар атири" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Белги (эмодзи, ихтиёрий)</label>
            <input {...register('icon')} className="input" placeholder="🧴" />
            <div className="flex flex-wrap gap-2 mt-2">
              {suggestedIcons.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  onClick={() => setValue('icon', ic)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg border-2 transition-all ${
                    icon === ic ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-dark-600'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Категорияни ўчириш"
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
        <p className="text-gray-600 dark:text-gray-400">
          Бу категорияни ўчиришни тасдиқлайсизми? Унга боғланган маҳсулотлар қолиб кетади, лекин категория рўйхатда кўринмайди.
        </p>
      </Modal>
    </DashboardLayout>
  );
}
