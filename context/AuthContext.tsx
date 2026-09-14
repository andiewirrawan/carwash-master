'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role, SessionUser } from '@/types/database';
import { useRouter } from 'next/navigation';

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 1,
  spv: 2,
  owner: 3,
  sistem_owner: 4,
};

interface AuthContextType {
  user: SessionUser | null;
  isLoading: boolean;
  login: (username: string, password_hash: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasAccess: (minRole: Role) => boolean;
  isSistemOwner: boolean;
  isOwner: boolean;
  isSpv: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'bsa_carwash_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SessionUser;
        setUser(parsed);
      }
    } catch (e) {
      console.error('Failed to parse session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password_hash: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password_hash,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setIsLoading(false);
        return {
          success: false,
          error: result.error || 'Login gagal. Silakan coba lagi.',
        };
      }

      const sessionUser: SessionUser = result.user;
      setUser(sessionUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error('Login error details:', err);
      setIsLoading(false);
      return {
        success: false,
        error: 'Terjadi kesalahan sistem: ' + (err.message || JSON.stringify(err)),
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    router.push('/login');
  };

  const hasAccess = (minRole: Role): boolean => {
    if (!user) return false;
    const userLevel = ROLE_HIERARCHY[user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
    return userLevel >= requiredLevel;
  };

  const isSistemOwner = user?.role === 'sistem_owner';
  const isOwner = hasAccess('owner');
  const isSpv = hasAccess('spv');
  const isAdmin = hasAccess('admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        hasAccess,
        isSistemOwner,
        isOwner,
        isSpv,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
