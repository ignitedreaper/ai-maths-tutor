import React from 'react';
import { requireAdmin } from '@/lib/auth';
import StudentDetailClient from './StudentDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminStudentDetailPage(props: PageProps) {
  await requireAdmin();
  const { id } = await props.params;

  return <StudentDetailClient studentId={id} />;
}
