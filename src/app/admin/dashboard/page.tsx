import React from 'react';
import { requireAdmin } from '@/lib/auth';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  return <AdminDashboardClient admin={admin} />;
}
