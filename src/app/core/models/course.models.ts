export interface LocalizedText {
  ar: string;
  en: string;
}

export interface Lesson {
  id: string;
  title: LocalizedText;
  durationSec: number;
  video: string;
}

export interface CourseSection {
  id: string;
  title: LocalizedText;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: LocalizedText;
  instructor: LocalizedText;
  thumbnail: string;
  sections: CourseSection[];
}

export interface LessonProgress {
  positionSec: number;
  completed: boolean;
  updatedAt: number;
}

export type ProgressByCourse = Record<string, Record<string, LessonProgress>>;
