import React from 'react';
import type { ContentItem } from '../types';
import { GraduationCap, BookOpen, ChevronLeft } from 'lucide-react';

interface CourseViewProps {
  courses: ContentItem[];
  lessons: ContentItem[];
  onSelectCourse: (course: ContentItem) => void;
  onSelectLesson: (lesson: ContentItem) => void;
}

export const CourseView: React.FC<CourseViewProps> = ({
  courses,
  lessons,
  onSelectCourse,
  onSelectLesson,
}) => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fadeIn">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="w-14 h-14 bg-emerald-100 text-[#8CB65F] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
          <GraduationCap size={32} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight mb-3">
          קורסי לימוד ומבחנים
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          מערכי שיעור מובנים, תרגולים מוקלטים ומבחני ידע להעמקת השליטה בקריאה בטעמים ובדיוקי הניקוד.
        </p>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {courses.map((course) => {
          const courseLessons = lessons.filter(l => l.parentId === course.id || l.meta?._lp_course === course.id);
          
          return (
            <div
              key={course.id}
              onClick={() => onSelectCourse(course)}
              className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs hover:shadow-md hover:border-[#8CB65F] transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-emerald-50 text-[#8CB65F] font-bold text-xs px-3 py-1 rounded-full border border-emerald-100">
                    קורס מודרך
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {courseLessons.length > 0 ? `${courseLessons.length} שיעורים` : 'שיעורים ותרגולים'}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-slate-800 group-hover:text-[#8CB65F] transition-colors mb-3 font-hebrew">
                  {course.title}
                </h3>

                <p className="text-slate-600 text-sm leading-relaxed mb-6 line-clamp-3">
                  {course.excerpt || 'לימוד מקיף צעד אחר צעד עם תרגול שמע והסברים מפורטים.'}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs font-bold text-[#8CB65F]">
                <span>התחל לימוד</span>
                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* All Lessons & Topics List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <BookOpen className="text-[#8CB65F]" size={22} />
          כל השיעורים והנושאים
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {lessons.slice(0, 30).map((lesson, idx) => (
            <button
              key={lesson.id}
              onClick={() => onSelectLesson(lesson)}
              className="text-right p-3 rounded-xl border border-slate-100 hover:border-[#8CB65F] hover:bg-slate-50 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center shrink-0 group-hover:bg-[#8CB65F] group-hover:text-white transition-colors">
                  {idx + 1}
                </span>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-[#8CB65F] truncate">
                  {lesson.title}
                </span>
              </div>
              <ChevronLeft size={14} className="text-slate-300 group-hover:text-[#8CB65F] shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
