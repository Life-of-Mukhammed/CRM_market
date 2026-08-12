'use client';
import { User } from '@/types';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('market_token');
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('market_user');
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

export function setAuth(token: string, user: User) {
  localStorage.setItem('market_token', token);
  localStorage.setItem('market_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('market_token');
  localStorage.removeItem('market_user');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getDashboardPath(role: string): string {
  const paths: Record<string, string> = {
    DIREKTOR: '/direktor',
    KASSIR: '/kassir',
  };
  return paths[role] || '/login';
}
