'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Users, 
  GraduationCap, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { SafeUser } from '@/lib/auth';

interface StudentItem {
  id: string;
  student_name: string | null;
  class_name: string | null;
  section: string | null;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

interface StatsData {
  total_accounts: number;
  total_students: number;
  total_admins: number;
  active_students: number;
  inactive_students: number;
}

export default function AdminDashboardClient({ admin }: { admin: SafeUser }) {
  // Stats & Filters State
  const [stats, setStats] = useState<StatsData | null>(null);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  // Query Controls State
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);

  // Loading & Action States
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [statusTogglingId, setStatusTogglingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    student: StudentItem;
    targetStatus: boolean;
  } | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch Summary Statistics
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setAvailableClasses(data.availableClasses || []);
        setAvailableSections(data.availableSections || []);
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch Paginated Students List
  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: search.trim(),
        class: selectedClass,
        section: selectedSection,
        status: selectedStatus,
        sortBy,
        sortOrder,
      });

      const res = await fetch(`/api/admin/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setTotalStudents(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoadingStudents(false);
    }
  }, [page, search, selectedClass, selectedSection, selectedStatus, sortBy, sortOrder]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Execute Toggle Account Status
  const handleToggleStatus = async () => {
    if (!confirmModal) return;
    const { student, targetStatus } = confirmModal;
    setStatusTogglingId(student.id);
    setConfirmModal(null);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: targetStatus }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: `Student "${student.student_name || student.username}" ${targetStatus ? 'activated' : 'deactivated'} successfully.`,
        });
        loadStudents();
        loadStats();
      } else {
        setActionMessage({
          type: 'error',
          text: data.error || 'Failed to update account status.',
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: 'Network error occurred while updating account.',
      });
    } finally {
      setStatusTogglingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Administrative Portal
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Admin Control Center
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Logged in as <span className="font-bold text-slate-800">{admin.student_name || admin.username}</span>. Manage registered student accounts and monitor system usage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { loadStats(); loadStudents(); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStudents ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Action Notification Message */}
        {actionMessage && (
          <div
            role="alert"
            className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-medium ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs font-bold underline opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section A: Statistics Cards */}
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">Account Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Total Accounts */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Accounts</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {loadingStats ? '...' : stats?.total_accounts ?? 0}
                </p>
              </div>
            </div>

            {/* Total Students */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Students</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {loadingStats ? '...' : stats?.total_students ?? 0}
                </p>
              </div>
            </div>

            {/* Total Administrators */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Administrators</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {loadingStats ? '...' : stats?.total_admins ?? 0}
                </p>
              </div>
            </div>

            {/* Active Students */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Students</p>
                <p className="text-2xl font-black text-emerald-600 mt-0.5">
                  {loadingStats ? '...' : stats?.active_students ?? 0}
                </p>
              </div>
            </div>

            {/* Inactive Students */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inactive Students</p>
                <p className="text-2xl font-black text-rose-600 mt-0.5">
                  {loadingStats ? '...' : stats?.inactive_students ?? 0}
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Section B: Registered Student Management */}
        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          
          {/* Header & Filter Controls Bar */}
          <div className="p-6 border-b border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Registered Students Directory
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  Showing {students.length} of {totalStudents} matching student records
                </p>
              </div>
            </div>

            {/* Search and Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
              
              {/* Search input */}
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by name or username..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>

              {/* Class Filter */}
              <div>
                <select
                  value={selectedClass}
                  onChange={(e) => { setSelectedClass(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:border-blue-600 outline-none transition-all text-slate-700"
                >
                  <option value="">All Classes</option>
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                  {availableClasses.length === 0 && <option value="Class 10">Class 10</option>}
                </select>
              </div>

              {/* Section Filter */}
              <div>
                <select
                  value={selectedSection}
                  onChange={(e) => { setSelectedSection(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:border-blue-600 outline-none transition-all text-slate-700"
                >
                  <option value="">All Sections</option>
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                  {availableSections.length === 0 && (
                    <>
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                    </>
                  )}
                </select>
              </div>

              {/* Account Status Filter */}
              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:border-blue-600 outline-none transition-all text-slate-700"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>

            </div>

            {/* Sorting Row */}
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span>Sort by:</span>
                <button
                  onClick={() => setSortBy(sortBy === 'created_at' ? 'name' : 'created_at')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <span>{sortBy === 'created_at' ? 'Registration Date' : 'Student Name'}</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </button>
                <button
                  onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                >
                  {sortOrder === 'ASC' ? 'Ascending (A-Z / Oldest)' : 'Descending (Z-A / Newest)'}
                </button>
              </div>
            </div>

          </div>

          {/* Responsive Students Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Student ID</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Class</th>
                  <th className="py-3.5 px-4">Section</th>
                  <th className="py-3.5 px-4">Username</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Registered Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingStudents ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-32" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-8" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                      <td className="py-4 px-4"><div className="h-6 bg-slate-200 rounded-full w-20" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                      <td className="py-4 px-4 text-right"><div className="h-8 bg-slate-200 rounded w-24 ml-auto" /></td>
                    </tr>
                  ))
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="max-w-sm mx-auto flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                          <Users className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">No students found</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Try adjusting your search query or clear the active filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  students.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                      
                      {/* Short ID */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500" title={st.id}>
                        {st.id.substring(0, 8)}...
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {st.student_name || '—'}
                      </td>

                      {/* Class */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {st.class_name || 'Class 10'}
                      </td>

                      {/* Section */}
                      <td className="py-3.5 px-4 text-slate-700 font-semibold">
                        {st.section || '—'}
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                        @{st.username}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {st.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            <XCircle className="w-3.5 h-3.5" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {new Date(st.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/students/${st.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                          >
                            <span>Profile</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </Link>

                          <button
                            onClick={() => setConfirmModal({ student: st, targetStatus: !st.is_active })}
                            disabled={statusTogglingId === st.id}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                              st.is_active
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {statusTogglingId === st.id
                              ? 'Updating...'
                              : st.is_active
                              ? 'Deactivate'
                              : 'Activate'}
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Footer */}
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/50">
            <div>
              Page <span className="font-bold text-slate-900">{page}</span> of{' '}
              <span className="font-bold text-slate-900">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loadingStudents}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loadingStudents}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </section>

      </div>

      {/* Confirmation Modal for Account Status Changes */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                confirmModal.targetStatus ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {confirmModal.targetStatus ? 'Activate Student Account' : 'Deactivate Student Account'}
                </h3>
                <p className="text-xs text-slate-500">Please confirm this action</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to {confirmModal.targetStatus ? 'activate' : 'deactivate'} the account for{' '}
              <strong className="text-slate-900">{confirmModal.student.student_name || confirmModal.student.username}</strong>?
              {!confirmModal.targetStatus && (
                <span className="block mt-2 text-rose-600 text-xs font-semibold">
                  Note: Deactivating this account will immediately revoke all active student sessions. The student will not be able to log in.
                </span>
              )}
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStatus}
                className={`px-4 py-2 rounded-xl text-white text-sm font-bold shadow-md transition-all ${
                  confirmModal.targetStatus
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {confirmModal.targetStatus ? 'Yes, Activate Account' : 'Yes, Deactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
