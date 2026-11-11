import React from 'react';
import Link from 'next/link';
import { requireStudent } from '@/lib/auth';
import { 
  User, 
  BookOpen, 
  Sparkles, 
  GraduationCap, 
  Calendar, 
  Layers, 
  ArrowRight, 
  CheckCircle,
  Shapes,
  Binary,
  Compass
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  const student = await requireStudent();

  const formattedDate = new Date(student.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Welcome Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-8 sm:p-10 shadow-xl shadow-indigo-900/10 border border-indigo-600/30">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-bold uppercase tracking-wider mb-4 border border-white/20">
              <GraduationCap className="w-4 h-4" />
              Student Portal
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Welcome back, {student.student_name || student.username}!
            </h1>
            <p className="mt-2 text-blue-100 max-w-2xl text-base sm:text-lg">
              Your personalized mathematics learning hub for Class 10. Master concepts with interactive visualizers, explore solved examples, and get real-time answers from your AI tutor.
            </p>
          </div>
        </div>

        {/* Student Profile Card & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Profile Details Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-lg leading-tight">
                      {student.student_name || 'Student'}
                    </h2>
                    <p className="text-xs font-medium text-slate-500">@{student.username}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Active
                </span>
              </div>

              <div className="mt-5 space-y-3.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    Class
                  </span>
                  <span className="font-bold text-slate-800">{student.class_name || 'Class 10'}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400" />
                    Section
                  </span>
                  <span className="font-bold text-slate-800">Section {student.section || 'A'}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Enrolled Since
                  </span>
                  <span className="font-semibold text-slate-700">{formattedDate}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                href="/#chapters"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                Browse Syllabus Chapters
              </Link>
            </div>
          </div>

          {/* AI Math Tutor Feature Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 sm:p-8 border border-indigo-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/80 text-indigo-800 text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Integrated AI Assistant
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Ask Kanitham AI - Class 10 Tutor
              </h2>
              <p className="mt-2 text-slate-600 text-sm sm:text-base leading-relaxed">
                Stuck on a tricky problem or theorem? Kanitham AI at the bottom right corner is pre-configured with Samacheer Kalvi syllabus knowledge, step-by-step reasoning, and LaTeX formula support.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/chapter/chapter_1_html/examples"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
              >
                <span>Chapter 1 Examples</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/chapter/chapter_1_html/exercises"
                className="px-5 py-2.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-sm transition-colors"
              >
                Exercise Practice
              </Link>
            </div>
          </div>

        </div>

        {/* Interactive Visualizers Showcase */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Interactive Concept Visualizers
              </h2>
              <p className="text-sm text-slate-500">
                Hands-on visual tools for Samacheer Kalvi Unit 1 (Relations and Functions)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Tool 1 */}
            <Link
              href="/cartesian-product"
              className="p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Binary className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                Cartesian Product
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Visualize pair sets A × B with interactive coordinate mapping.
              </p>
            </Link>

            {/* Tool 2 */}
            <Link
              href="/arrow-diagram"
              className="p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-400 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                Arrow Diagram
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Explore domain-to-codomain mapping relations visually.
              </p>
            </Link>

            {/* Tool 3 */}
            <Link
              href="/composition"
              className="p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-purple-400 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Shapes className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-purple-600 transition-colors">
                Function Composition
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Inspect step-by-step f(g(x)) transformations in real time.
              </p>
            </Link>

            {/* Tool 4 */}
            <Link
              href="/set-expression"
              className="p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-400 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-600 transition-colors">
                Set Expression
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Test Venn diagrams, unions, intersections, and complements.
              </p>
            </Link>

          </div>
        </div>

      </div>
    </main>
  );
}
