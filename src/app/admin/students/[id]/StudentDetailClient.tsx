'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  BookOpen, 
  Layers, 
  Calendar, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Save, 
  AlertTriangle,
  Clock
} from 'lucide-react';

interface StudentData {
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

export default function StudentDetailClient({ studentId }: { studentId: string }) {
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editable Form fields
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Status Change Confirmation
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/admin/students/${studentId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Student not found.');
        return res.json();
      })
      .then((data) => {
        const s = data.student;
        setStudent(s);
        setName(s.student_name || '');
        setClassName(s.class_name || 'Class 10');
        setSection(s.section || 'A');
        setIsActive(s.is_active);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load student details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [studentId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Student name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: name.trim(),
          class_name: className.trim(),
          section: section.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save student details.');
      } else {
        setStudent(data.student);
        setSuccess('Student profile details saved successfully.');
      }
    } catch (err: any) {
      setError('Network error occurred while saving profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActiveState = async () => {
    setShowStatusConfirm(false);
    setError(null);
    setSuccess(null);
    setSaving(true);

    const target = !isActive;
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: target }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update account status.');
      } else {
        setStudent(data.student);
        setIsActive(data.student.is_active);
        setSuccess(`Student account ${target ? 'activated' : 'deactivated'} successfully.`);
      }
    } catch (err: any) {
      setError('Network error occurred while updating status.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading student profile...</p>
        </div>
      </main>
    );
  }

  if (error && !student) {
    return (
      <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 border border-slate-200 text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900">Student Record Not Found</h1>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
          <div className="mt-6">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Admin Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:underline transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Directory
          </Link>
        </div>

        {/* Notifications */}
        {success && (
          <div
            role="status"
            className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-2"
          >
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Profile Card Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-blue-500/20">
              <User className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {student?.student_name || 'Student Profile'}
                </h1>
                {isActive ? (
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
              </div>
              <p className="text-sm font-mono text-slate-500 mt-1">@{student?.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowStatusConfirm(true)}
              disabled={saving}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${
                isActive
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isActive ? 'Deactivate Student' : 'Activate Student'}
            </button>
          </div>
        </div>

        {/* Account Details & Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Metadata Sidebar */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
              Account Metadata
            </h2>

            <div>
              <span className="text-xs text-slate-400">Database ID</span>
              <p className="font-mono text-xs text-slate-800 break-all select-all font-semibold mt-0.5">
                {student?.id}
              </p>
            </div>

            <div>
              <span className="text-xs text-slate-400">Assigned Role</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 uppercase">{student?.role}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400">Registration Date</span>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-700 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {student?.created_at ? new Date(student.created_at).toLocaleString() : '—'}
                </span>
              </div>
            </div>

            {student?.updated_at && (
              <div>
                <span className="text-xs text-slate-400">Last Updated</span>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-700 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{new Date(student.updated_at).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Edit Permitted Details Form */}
          <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Edit Student Details
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Update permitted student information. Username and password hashes are strictly protected.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Student Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={saving}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 text-sm font-medium outline-none transition-all"
                  />
                </div>
              </div>

              {/* Class and Section in 2 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Class
                  </label>
                  <div className="relative">
                    <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      disabled={saving}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 text-sm font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Section
                  </label>
                  <div className="relative">
                    <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      disabled={saving}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 text-sm font-medium outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Save Button */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-60 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

            </form>
          </div>

        </div>

      </div>

      {/* Confirmation Modal */}
      {showStatusConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                !isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {!isActive ? 'Activate Student Account' : 'Deactivate Student Account'}
                </h3>
                <p className="text-xs text-slate-500">Please confirm this action</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to {isActive ? 'deactivate' : 'activate'} this student account?
              {isActive && (
                <span className="block mt-2 text-rose-600 text-xs font-semibold">
                  Deactivating this student will immediately revoke their session and prevent future logins.
                </span>
              )}
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowStatusConfirm(false)}
                className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleActiveState}
                className={`px-4 py-2 rounded-xl text-white text-sm font-bold shadow-md transition-all ${
                  !isActive
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {!isActive ? 'Yes, Activate' : 'Yes, Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
