'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User, Shield, BookOpen, Sparkles, LayoutDashboard } from 'lucide-react';

interface CurrentUser {
  id: string;
  student_name: string | null;
  class_name: string | null;
  section: string | null;
  username: string;
  role: 'ADMIN' | 'STUDENT';
  is_active: boolean;
}

export function Navbar() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user || null);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [pathname]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight leading-tight">
                  MathTutor
                </span>
                <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                  Class 10 AI Learning
                </span>
              </div>
            </Link>

            {/* Quick Links */}
            <div className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200">
              <Link
                href="/#chapters"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Chapters
              </Link>
              <Link
                href="/#tools"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Visualizers
              </Link>
            </div>
          </div>

          {/* Right Action Area */}
          <div className="flex items-center gap-3">
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-3">
                    {/* Role-based dashboard button */}
                    <Link
                      href={user.role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard'}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors shadow-sm"
                    >
                      <LayoutDashboard className="w-4 h-4 text-blue-600" />
                      <span className="hidden sm:inline">
                        {user.role === 'ADMIN' ? 'Admin Dashboard' : 'Student Dashboard'}
                      </span>
                      <span className="sm:hidden">Dashboard</span>
                    </Link>

                    {/* User Badge */}
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-semibold text-blue-800">
                      {user.role === 'ADMIN' ? (
                        <Shield className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      <span>{user.student_name || user.username}</span>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-blue-200 text-blue-900 font-bold">
                        {user.role}
                      </span>
                    </div>

                    {/* Logout Button */}
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 transition-colors"
                      title="Log Out"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {loggingOut ? 'Logging out...' : 'Log out'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <Link
                      href="/login"
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition-all"
                    >
                      Student Signup
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
