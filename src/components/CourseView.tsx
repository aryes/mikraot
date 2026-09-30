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
    <div className="animate-fadeIn mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-[#8CB65F] shadow-xs">
          <GraduationCap size={32} />
        </div>
        <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
          קורסי לימוד ומבחנים
        </h1>
        <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
          מערכי שיעור מובנים, תרגולים מוקלטים ומבחני ידע להעמקת השליטה בקריאה בטעמים ובדיוקי הניקוד.
        </p>
      </div>

      {/* Courses Grid */}
      <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2">
        {courses.map((course) => {
          const courseLessons = lessons.filter(
            (l) => l.parentId === course.id || l.meta?._lp_course === course.id,
          );

          return (
            <div
              key={course.id}
              onClick={() => onSelectCourse(course)}
              className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-[#8CB65F] hover:shadow-md sm:p-8"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-[#8CB65F]">
                    קורס מודרך
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    {courseLessons.length > 0
                      ? `${courseLessons.length} שיעורים`
                      : 'שיעורים ותרגולים'}
                  </span>
                </div>

                <h3 className="font-hebrew mb-3 text-2xl font-bold text-slate-800 transition-colors group-hover:text-[#8CB65F]">
                  {course.title}
                </h3>

                <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-slate-600">
                  {course.excerpt || 'לימוד מקיף צעד אחר צעד עם תרגול שמע והסברים מפורטים.'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-[#8CB65F]">
                <span>התחל לימוד</span>
                <ChevronLeft
                  size={16}
                  className="transition-transform group-hover:-translate-x-1"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* All Lessons & Topics List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-800">
          <BookOpen className="text-[#8CB65F]" size={22} />
          כל השיעורים והנושאים
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.slice(0, 30).map((lesson, idx) => (
            <button
              key={lesson.id}
              onClick={() => onSelectLesson(lesson)}
              className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 p-3 text-right transition-all hover:border-[#8CB65F] hover:bg-slate-50"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500 transition-colors group-hover:bg-[#8CB65F] group-hover:text-white">
                  {idx + 1}
                </span>
                <span className="truncate text-xs font-semibold text-slate-700 group-hover:text-[#8CB65F]">
                  {lesson.title}
                </span>
              </div>
              <ChevronLeft
                size={14}
                className="shrink-0 text-slate-300 group-hover:text-[#8CB65F]"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
