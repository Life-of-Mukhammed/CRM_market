'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isAuthenticated, getDashboardPath } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      const user = getUser();
      if (user) {
        router.replace(getDashboardPath(user.role));
        return;
      }
    }
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700">
      <div className="text-center text-white">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-3xl font-black">I</span>
        </div>
        <p className="text-white/70 text-sm">Юкланмоқда...</p>
      </div>
    </div>
  );
}
