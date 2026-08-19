'use client';
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Modal } from '@/components/ui/Modal';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { products as productsApi, categories as categoriesApi } from '@/lib/api';
import { Product, Category } from '@/types';
import { formatMoney, calcProfit, getCategoryIcon, getCategoryName } from '@/lib/utils';
import { useDebounce } from '@/lib/useDebounce';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';

const schema = z.object({
  name: z.string().min(1, 'Ном киритилиши шарт'),
  category: z.string().min(1, "Категория танланг"),
  brand: z.string().optional(),
  author: z.string().optional(),
  barcode: z.string().optional(),
  costPrice: z.number({ invalid_type_error: 'Таннарх киритинг' }).min(0),
  salePrice: z.number({ invalid_type_error: 'Сотув нархи киритинг' }).min(0),
  unit: z.string().default('дона'),
  quantity: z.number().optional(),
  minAlert: z.number().optional(),
  image: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function MahsulotlarPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const debouncedSearch = useDebounce(search);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  });
  const categoriesList: Category[] = categoriesData || [];

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', debouncedSearch, selectedCategory],
    queryFn: () => productsApi.list({
      search: debouncedSearch || undefined,
      category: selectedCategory || undefined,
      limit: 200,
    }).then((r) => r.data),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { unit: 'дона' },
  });

  const costPrice = watch('costPrice') || 0;
  const salePrice = watch('salePrice') || 0;
  const { profit, percent } = calcProfit(salePrice, costPrice);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => editProduct
      ? productsApi.update(editProduct.id, data)
      : productsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setModalOpen(false);
      setEditProduct(null);
      reset();
      toast.success(editProduct ? 'Маҳсулот янгиланди' : 'Маҳсулот қўшилди');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Хатолик';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setDeleteId(null);
      toast.success('Маҳсулот ўчирилди');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Маҳсулотни ўчириб бўлмади";
      toast.error(msg);
    },
  });

  const openEdit = (product: Product) => {
    setEditProduct(product);
    setValue('name', product.name);
    setValue('category', typeof product.category === 'string' ? product.category : product.category.id);
    setValue('brand', product.brand || '');
    setValue('author', product.author || '');
    setValue('barcode', product.barcode || '');
    setValue('costPrice', product.costPrice);
    setValue('salePrice', product.salePrice);
    setValue('unit', product.unit);
    setValue('quantity', product.quantity);
    setValue('image', product.image || '');
    setModalOpen(true);
  };

  const openNew = () => {
    setEditProduct(null);
    reset({ unit: 'дона', quantity: 1, category: categoriesList[0]?.id || '' });
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const payload: Record<string, unknown> = { ...data };
    if (!payload.barcode) delete payload.barcode;
    saveMutation.mutate(payload);
  };

  const handleScan = (code: string) => {
    setScannerOpen(false);
    setValue('barcode', code);
    toast.success(`Штрих-код ўқилди: ${code}`);
  };

  const productsList: Product[] = productsData?.products || [];
  const units = ['дона', 'мл', 'кг', 'қути'];

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Маҳсулотлар</h1>
            <p className="text-gray-500 text-sm mt-1">Жами: {productsData?.total || 0} та</p>
          </div>
          <button onClick={openNew} className="btn-primary flex items-center gap-2" disabled={categoriesList.length === 0}>
            <span>+</span> Янги маҳсулот
          </button>
        </div>

        {categoriesList.length === 0 && (
          <div className="card p-4 border-l-4 border-l-amber-500 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Маҳсулот қўшишдан олдин камида битта категория яратинг.
            </p>
            <Link href="/direktor/kategoriyalar" className="btn-primary shrink-0 text-sm py-2">
              Категория қўшиш
            </Link>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              className="input pl-10"
              placeholder="Маҳсулот ёки штрих-код бўйича қидириш..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-auto"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Барча категориялар</option>
            {categoriesList.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>

        {/* Products table */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-dark-700">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Маҳсулот</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Категория</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Таннарх</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Сотув нархи</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Фойда</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Омбор</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
                  {productsList.map((product) => {
                    const { profit: p, percent: pct } = calcProfit(product.salePrice, product.costPrice);
                    return (
                      <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-dark-700 flex items-center justify-center text-lg flex-shrink-0">
                              {product.image ? (
                                <img src={product.image} alt="" className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                getCategoryIcon(product)
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-gray-900 dark:text-white">{product.name}</p>
                              <p className="text-xs text-gray-400">{product.brand || product.author || ''}</p>
                              {product.barcode && <p className="text-xs text-gray-400 font-mono">{product.barcode}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="badge bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400">
                            {getCategoryIcon(product)} {getCategoryName(product.category)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                          {formatMoney(product.costPrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white text-sm">
                          {formatMoney(product.salePrice)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-bold text-green-600">{formatMoney(p)}</p>
                          <p className="text-xs text-green-500">{pct}%</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold text-sm ${
                            product.quantity === 0 ? 'text-red-600' :
                            product.quantity <= product.minAlert ? 'text-orange-500' : 'text-gray-900 dark:text-white'
                          }`}>
                            {product.quantity}
                          </span>
                          <p className="text-xs text-gray-400">{product.unit}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => openEdit(product)}
                              className="text-xs text-primary-600 hover:underline font-medium"
                            >
                              Таҳрирлаш
                            </button>
                            <button
                              onClick={() => setDeleteId(product.id)}
                              className="text-xs text-red-500 hover:underline font-medium"
                            >
                              Ўчириш
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {productsList.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">📦</p>
                  <p>Маҳсулот топилмади</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditProduct(null); reset(); }}
        title={editProduct ? 'Маҳсулотни таҳрирлаш' : 'Янги маҳсулот қўшиш'}
        size="lg"
        footer={
          <>
            <button onClick={() => { setModalOpen(false); setEditProduct(null); reset(); }} className="btn-secondary">
              Бекор қилиш
            </button>
            <button onClick={handleSubmit(onSubmit)} disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Сақланмоқда...' : editProduct ? 'Сақлаш' : 'Қўшиш'}
            </button>
          </>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Категория *</label>
              <select {...register('category')} className="input">
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
              <p className="text-xs text-gray-400 mt-1">
                Керакли категория йўқми? <Link href="/direktor/kategoriyalar" className="text-primary-600 hover:underline">Категориялар саҳифасида қўшинг</Link>
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Маҳсулот номи *</label>
              <input {...register('name')} className="input" placeholder="Маҳсулот номи" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Бренд (ихтиёрий)</label>
              <input {...register('brand')} className="input" placeholder="Масалан: Chanel" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Муаллиф (ихтиёрий)</label>
              <input {...register('author')} className="input" placeholder="Масалан: Абдулла Қодирий" />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Штрих-код</label>
              <div className="flex gap-2">
                <input {...register('barcode')} className="input font-mono" placeholder="Сканерланг ёки киритинг" />
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="btn-accent px-3 shrink-0"
                  title="Камера билан сканерлаш"
                >
                  📷
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Таннарх *</label>
              <input
                {...register('costPrice', { valueAsNumber: true })}
                type="number"
                className="input"
                placeholder="0"
              />
              {errors.costPrice && <p className="text-red-500 text-xs mt-1">{errors.costPrice.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Сотув нархи *</label>
              <input
                {...register('salePrice', { valueAsNumber: true })}
                type="number"
                className="input"
                placeholder="0"
              />
              {errors.salePrice && <p className="text-red-500 text-xs mt-1">{errors.salePrice.message}</p>}
            </div>

            {/* Profit display */}
            {costPrice > 0 && salePrice > 0 && (
              <div className="sm:col-span-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 flex gap-6">
                <div>
                  <p className="text-xs text-gray-500">Фойда суммаси</p>
                  <p className="font-black text-green-600">{formatMoney(profit)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Фойда фоизи</p>
                  <p className="font-black text-green-600">{percent}%</p>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Ўлчов бирлиги</label>
              <select {...register('unit')} className="input">
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                {editProduct ? 'Миқдор (омборда)' : 'Бошланғич миқдор'}
              </label>
              <input
                {...register('quantity', { valueAsNumber: true })}
                type="number"
                className="input"
                placeholder="0"
              />
              {editProduct && (
                <p className="text-xs text-gray-400 mt-1">
                  Янги товар келганда шу сонни жамига қўшиб ёзинг (масалан, омборда 5 та бор, 10 та келди — 15 деб ёзинг).
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Расм URL (ихтиёрий)</label>
              <input {...register('image')} className="input" placeholder="https://..." type="url" />
            </div>
          </div>
        </form>
      </Modal>

      {/* Barcode scanner for the form */}
      {scannerOpen && (
        <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />
      )}

      {/* Delete confirm */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Маҳсулотни ўчириш"
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
          Бу маҳсулотни ўчиришни тасдиқлайсизми? Бу амални қайтариб бўлмайди.
        </p>
      </Modal>
    </DashboardLayout>
  );
}
