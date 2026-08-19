'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { auth } from '@/lib/api';
import { setAuth, getDashboardPath } from '@/lib/auth';
import { User } from '@/types';

const schema = z.object({
  phone: z.string().min(9, 'Телефон рақам киритинг'),
  password: z.string().min(1, 'Парол киритинг'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await auth.login(data.phone, data.password);
      const { token, user } = res.data;
      setAuth(token, user as User);
      toast.success(`Хуш келибсиз, ${user.name}!`);
      router.push(getDashboardPath(user.role));
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Хатолик юз берди';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #2e1552 0%, #4a2482 50%, #5c2fa0 100%)' }}>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-2xl mb-4">
            <MarketLogo />
          </div>
          <h1 className="text-white text-3xl font-black tracking-tight">AYFA</h1>
          <p className="text-white/60 text-sm mt-1">Атир ва китоб дўкони</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-dark-800 rounded-3xl shadow-modal p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Кириш</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Тизимга кириш учун маълумотларингизни киритинг</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Телефон рақам
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📱</span>
                <input
                  {...register('phone')}
                  className="input pl-10"
                  placeholder="+998 90 123 45 67"
                  type="tel"
                />
              </div>
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Парол
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                <input
                  {...register('password')}
                  className="input pl-10"
                  type="password"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Кирилмоқда...
                </>
              ) : (
                'Кириш →'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          © 2026 AYFA Бошқарув тизими
        </p>
      </div>
    </div>
  );
}

function MarketLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#4a2482"/>
      <path d="M12 30L14 16H18L20 26L24 16H28L30 26L32 16H36L38 30H34L32.5 20L28.5 30H25.5L23.5 20L21.5 30H18.5L16.5 20L15.5 30H12Z" fill="#d4af37"/>
    </svg>
  );
}
