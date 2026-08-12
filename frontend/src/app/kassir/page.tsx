'use client';
import { useState, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { Receipt } from '@/components/pos/Receipt';
import { products as productsApi, sales as salesApi, categories as categoriesApi } from '@/lib/api';
import { Product, CartItem, Sale, PaymentType, Category } from '@/types';
import { formatMoney, getCategoryIcon } from '@/lib/utils';
import { useDebounce } from '@/lib/useDebounce';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  label: string;
  cart: CartItem[];
  discount: number;
}

let sessionCounter = 1;

function makeSession(): Session {
  return { id: String(Date.now()), label: `Мижоз ${sessionCounter++}`, cart: [], discount: 0 };
}

export default function KassirPOS() {
  // ─── Multi-session state ───────────────────────────────────────────────────
  const [sessions, setSessions] = useState<Session[]>(() => [makeSession()]);
  const [activeId, setActiveId] = useState<string>(() => sessions[0].id);

  const activeSession = sessions.find((s) => s.id === activeId) ?? sessions[0];
  const cart = activeSession.cart;
  const discount = activeSession.discount;

  const patchSession = useCallback((id: string, patch: Partial<Omit<Session, 'id'>>) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const setCart = useCallback((updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeId
          ? { ...s, cart: typeof updater === 'function' ? updater(s.cart) : updater }
          : s
      )
    );
  }, [activeId]);

  const setDiscount = useCallback((val: number) => {
    patchSession(activeId, { discount: val });
  }, [activeId, patchSession]);

  const addSession = useCallback(() => {
    const s = makeSession();
    setSessions((prev) => [...prev, s]);
    setActiveId(s.id);
  }, []);

  const removeSession = useCallback((id: string) => {
    setSessions((prev) => {
      if (prev.length === 1) return prev;
      const remaining = prev.filter((s) => s.id !== id);
      setActiveId((cur) => (cur === id ? remaining[remaining.length - 1].id : cur));
      return remaining;
    });
  }, []);

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const debouncedSearch = useDebounce(search);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  });
  const categoriesList: Category[] = categoriesData || [];

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['pos-products', debouncedSearch, selectedCategory],
    queryFn: () =>
      productsApi
        .list({ search: debouncedSearch || undefined, category: selectedCategory || undefined, limit: 100 })
        .then((r) => r.data),
  });

  const addToCart = useCallback(
    (product: Product) => {
      setCart((prev) => {
        const existing = prev.find((i) => i.product.id === product.id);
        if (existing) {
          if (existing.quantity >= product.quantity) {
            toast.error(`Омборда фақат ${product.quantity} дона мавжуд`);
            return prev;
          }
          return prev.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        if (product.quantity <= 0) {
          toast.error("Бу маҳсулот омборда йўқ");
          return prev;
        }
        return [...prev, { product, quantity: 1 }];
      });
    },
    [setCart]
  );

  const updateQty = useCallback(
    (productId: string, qty: number) => {
      if (qty <= 0) {
        setCart((prev) => prev.filter((i) => i.product.id !== productId));
        return;
      }
      setCart((prev) =>
        prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i))
      );
    },
    [setCart]
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
    },
    [setCart]
  );

  const handleBarcodeScanned = useCallback(
    async (rawCode: string) => {
      setScannerOpen(false);
      const code = rawCode.trim();
      if (!code) return;
      try {
        const res = await productsApi.byBarcode(code);
        addToCart(res.data as Product);
        toast.success(`${(res.data as Product).name} қўшилди`);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const serverMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        if (status === 404) {
          toast.error(serverMsg || `Бундай штрих-кодли товар мавжуд эмас: ${code}`);
        } else if (status === 401) {
          toast.error("Сессия тугаган, қайтадан киринг");
        } else {
          toast.error(serverMsg || `Хатолик юз берди (кодни қайта сканерланг): ${code}`);
        }
      }
    },
    [addToCart]
  );

  const total = cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
  const finalAmount = total - discount;

  const handlePaymentSubmit = async (payData: { paymentType: PaymentType; note?: string }) => {
    const res = await salesApi.create({
      items: cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      })),
      discount,
      paymentType: payData.paymentType,
      note: payData.note,
    });

    const saleId = res.data.id;
    const saleRes = await salesApi.get(saleId);
    setCompletedSale(saleRes.data as Sale);
    setPayModalOpen(false);
    setCartOpen(false);

    // Clear only this session's cart after payment
    patchSession(activeId, { cart: [], discount: 0 });
    patchSession(activeId, { label: `Мижоз ${sessionCounter++}` });

    toast.success('Сотув муваффақиятли амалга оширилди!');
    return saleId;
  };

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setScannerOpen(true);
      }
      if (e.key === 'F2' && cart.length > 0) {
        e.preventDefault();
        setPayModalOpen(true);
      }
      if (e.key === 'F3') {
        e.preventDefault();
        addSession();
        toast(`Янги мижоз очилди`, { icon: '➕' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart.length, addSession]);

  const productsList: Product[] = productsData?.products || [];

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row h-screen overflow-hidden relative">
        {/* ── Left: Products ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-dark min-w-0 min-h-0">
          {/* Search + Scanner */}
          <div className="p-3 bg-white dark:bg-dark-800 border-b border-gray-100 dark:border-dark-700">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  className="input pl-10"
                  placeholder="Маҳсулот қидириш... (ном ёки штрих-код, сканердан кейин Enter)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && search.trim()) {
                      handleBarcodeScanned(search.trim());
                      setSearch('');
                    }
                  }}
                  autoFocus
                />
              </div>
              <button
                onClick={() => setScannerOpen(true)}
                className="btn-accent flex items-center gap-2 px-4 shrink-0"
              >
                <span>📷</span>
                <span className="hidden sm:inline">Сканер</span>
                <kbd className="hidden lg:inline text-xs bg-black/20 rounded px-1">F1</kbd>
              </button>
            </div>

            {/* Category filter */}
            <div className="flex gap-2 mt-2 overflow-x-auto pb-0.5 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory('')}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  !selectedCategory
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400'
                )}
              >
                Барчаси
              </button>
              {categoriesList.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    selectedCategory === cat.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400'
                  )}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products grid */}
          <div className={cn('flex-1 overflow-y-auto p-3', cart.length > 0 && 'pb-24 lg:pb-3')}>
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="h-28 bg-gray-200 dark:bg-dark-700 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : productsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-5xl mb-3">📦</p>
                <p className="font-semibold">Маҳсулот топилмади</p>
                <p className="text-sm mt-1">Қидирув сўзини ўзгартиринг</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {productsList.map((product) => {
                  const stock = product.quantity;
                  const cartItem = cart.find((i) => i.product.id === product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={cn(
                        'pos-product-card text-left relative',
                        stock <= 0 && 'opacity-50 cursor-not-allowed',
                        cartItem && 'border-primary-400 dark:border-primary-600'
                      )}
                      disabled={stock <= 0}
                    >
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-16 object-cover rounded-lg mb-2"
                        />
                      ) : (
                        <div className="w-full h-16 bg-gray-100 dark:bg-dark-700 rounded-lg flex items-center justify-center mb-2 text-2xl">
                          {getCategoryIcon(product)}
                        </div>
                      )}
                      <p className="font-semibold text-gray-900 dark:text-white text-xs leading-tight line-clamp-2">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-400 line-clamp-1">
                        {product.brand || product.author || ''}
                      </p>
                      <p className="font-black text-primary-700 dark:text-primary-400 text-sm mt-1">
                        {formatMoney(product.salePrice)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Омбор: {stock} {product.unit}
                      </p>

                      {cartItem && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {cartItem.quantity}
                        </span>
                      )}
                      {stock <= product.minAlert && stock > 0 && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold rounded-full px-1.5">
                          {stock}!
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Mobile backdrop when cart sheet is expanded */}
        {cartOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-30"
            onClick={() => setCartOpen(false)}
          />
        )}

        {/* ── Right: Cart ────────────────────────────────────────────────── */}
        <div
          className={cn(
            'flex flex-col bg-white dark:bg-dark-800 lg:border-l border-gray-100 dark:border-dark-700',
            // Mobile: fixed bottom sheet that peeks as a mini-bar when collapsed
            'fixed inset-x-0 bottom-0 z-40 h-[80vh] rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out',
            cart.length === 0
              ? 'translate-y-full'
              : cartOpen
                ? 'translate-y-0'
                : 'translate-y-[calc(100%-64px)]',
            // Desktop: static sidebar, always fully visible
            'lg:static lg:z-auto lg:h-auto lg:w-80 xl:w-96 lg:rounded-none lg:shadow-none lg:translate-y-0'
          )}
        >
          {/* Mobile mini-bar / drag handle — tap to expand/collapse */}
          {cart.length > 0 && (
            <button
              onClick={() => setCartOpen((v) => !v)}
              className="lg:hidden w-full flex flex-col items-center pt-2 pb-3 px-4 shrink-0"
            >
              <span className="w-10 h-1 bg-gray-300 dark:bg-dark-600 rounded-full mb-2" />
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛒</span>
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                    {cart.length} та маҳсулот
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-gray-900 dark:text-white">{formatMoney(finalAmount)}</span>
                  <span className={cn('text-gray-400 transition-transform', cartOpen ? 'rotate-180' : '')}>▲</span>
                </div>
              </div>
            </button>
          )}

          {/* ── Session Tabs ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-0 border-b border-gray-100 dark:border-dark-700 bg-gray-50 dark:bg-dark-800 overflow-x-auto scrollbar-hide">
            {sessions.map((s) => {
              const isActive = s.id === activeId;
              const hasItems = s.cart.length > 0;
              return (
                <div
                  key={s.id}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2.5 cursor-pointer shrink-0 border-b-2 transition-all select-none group',
                    isActive
                      ? 'border-primary-600 bg-white dark:bg-dark-800 text-primary-700 dark:text-primary-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                  )}
                  onClick={() => setActiveId(s.id)}
                >
                  <span className="text-xs font-semibold whitespace-nowrap">{s.label}</span>
                  {hasItems && (
                    <span
                      className={cn(
                        'text-xs font-bold px-1.5 py-0.5 rounded-full leading-none',
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 dark:bg-dark-600 text-gray-600 dark:text-gray-300'
                      )}
                    >
                      {s.cart.length}
                    </span>
                  )}
                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSession(s.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-xs leading-none"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => {
                addSession();
                toast(`Янги мижоз очилди`, { icon: '➕' });
              }}
              title="Янги мижоз (F3)"
              className="shrink-0 px-3 py-2.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-dark-700 transition-all"
            >
              <span className="text-lg leading-none">+</span>
            </button>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 dark:text-gray-600 p-8">
                <p className="text-6xl mb-3">🛒</p>
                <p className="font-semibold text-center text-gray-500 dark:text-gray-400">
                  {activeSession.label} саватчаси бўш
                </p>
                <p className="text-sm mt-1 text-center text-gray-400">Маҳсулот қўшиш учун босинг</p>
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-300 dark:text-gray-600">
                    F3 — янги мижоз таб очиш
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-dark-700">
                {cart.map((item) => (
                  <div key={item.product.id} className="px-4 py-3">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight pr-2 flex-1">
                        {item.product.name}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.product.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-dark-700 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQty(item.product.id, Number(e.target.value))}
                          className="w-12 text-center text-sm font-bold border border-gray-200 dark:border-dark-600 rounded-lg py-1 bg-transparent dark:text-white"
                        />
                        <button
                          onClick={() => updateQty(item.product.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-dark-700 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">
                        {formatMoney(item.product.salePrice * item.quantity)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatMoney(item.product.salePrice)} / {item.product.unit}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart footer */}
          {cart.length > 0 && (
            <div className="border-t border-gray-100 dark:border-dark-700 p-4 space-y-3">
              {/* Discount */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">Чегирма:</span>
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={discount || ''}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    placeholder="0"
                    className="input py-2 pr-12 text-right"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    сўм
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400 text-sm">Жами:</span>
                <span className="font-black text-2xl text-gray-900 dark:text-white">
                  {formatMoney(finalAmount)}
                </span>
              </div>

              {/* Action row */}
              <div className="flex gap-2">
                <button
                  onClick={() => patchSession(activeId, { cart: [], discount: 0 })}
                  className="px-3 py-3 rounded-xl bg-gray-100 dark:bg-dark-700 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors text-sm"
                  title="Тозалаш"
                >
                  🗑
                </button>
                <button
                  onClick={() => setPayModalOpen(true)}
                  className="btn-primary flex-1 py-3 text-base flex items-center justify-center gap-2"
                >
                  <span>💳</span>
                  <span>Тўлов</span>
                  <kbd className="text-xs bg-primary-700 rounded px-1 hidden lg:inline">F2</kbd>
                </button>
              </div>

              <p className="text-xs text-center text-gray-300 dark:text-gray-600">
                F3 — янги мижоз &nbsp;|&nbsp; F1 — сканер &nbsp;|&nbsp; F2 — тўлов
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scanner */}
      {scannerOpen && (
        <BarcodeScanner onScan={handleBarcodeScanned} onClose={() => setScannerOpen(false)} />
      )}

      {/* Payment modal */}
      <PaymentModal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        total={total}
        discount={discount}
        items={cart}
        onSubmit={handlePaymentSubmit}
      />

      {/* Receipt */}
      {completedSale && (
        <Receipt
          sale={completedSale}
          open={!!completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </DashboardLayout>
  );
}
