'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.push('/login');
        return;
      }

      // Verify token with backend
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        const response = await fetch(`${API_URL}/api/auth/verify`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userEmail');
          router.push('/login');
        }
      } catch (error) {
        // In case backend is not available, allow if token exists (demo mode)
        if (token) {
          setIsAuthenticated(true);
        } else {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    // Don't check auth on login/register pages
    if (pathname !== '/login' && pathname !== '/register') {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, [pathname, router]);

  // Don't show sidebar on login/register pages
  if (pathname === '/login' || pathname === '/register') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Fullscreen layout for live-trader page and root page (no sidebar, no topbar)
  if (pathname === '/live-trader' || pathname === '/') {
    return (
      <div className="min-h-screen w-full">
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Topbar with Market Hours - Above everything */}
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
