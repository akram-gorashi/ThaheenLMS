import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Course, Lesson, LessonProgress, ProgressByCourse } from '../models/course.models';

const PROGRESS_STORAGE_KEY = 'thaheen.progress.v1';
const NOTES_STORAGE_KEY = 'thaheen.notes.v1';
const SPEED_STORAGE_KEY = 'thaheen.playback-speed.v1';
const COMPLETION_THRESHOLD = 0.9;
const SUPPORTED_SPEEDS = [1, 1.25, 1.5, 2] as const;

export function flattenLessons(course: Course): Lesson[] {
  return course.sections.flatMap((section) => section.lessons);
}

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly progress = signal<ProgressByCourse>(
    this.readObject<ProgressByCourse>(PROGRESS_STORAGE_KEY, {}),
  );
  readonly notes = signal<Record<string, string>>(
    this.readObject<Record<string, string>>(NOTES_STORAGE_KEY, {}),
  );
  readonly playbackSpeed = signal<number>(this.readSpeed());
  readonly latestUnfinished = computed(() => {
    const candidates = Object.entries(this.progress()).flatMap(([courseId, lessons]) =>
      Object.entries(lessons)
        .filter(([, value]) => value.positionSec > 0 && !value.completed)
        .map(([lessonId, value]) => ({ courseId, lessonId, updatedAt: value.updatedAt })),
    );
    return candidates.sort((a, b) => b.updatedAt - a.updatedAt)[0];
  });

  getLessonProgress(courseId: string, lessonId: string): LessonProgress | undefined {
    return this.progress()[courseId]?.[lessonId];
  }

  getResumePosition(courseId: string, lessonId: string): number {
    return this.getLessonProgress(courseId, lessonId)?.positionSec ?? 0;
  }

  isLessonCompleted(courseId: string, lessonId: string): boolean {
    return this.getLessonProgress(courseId, lessonId)?.completed ?? false;
  }

  isLessonUnlocked(course: Course, lessonId: string): boolean {
    const lessons = flattenLessons(course);
    const lessonIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
    return (
      lessonIndex === 0 ||
      (lessonIndex > 0 && this.isLessonCompleted(course.id, lessons[lessonIndex - 1].id))
    );
  }

  getCourseProgressPercent(course: Course): number {
    const lessons = flattenLessons(course);
    if (lessons.length === 0) return 0;
    const completedCount = lessons.filter((lesson) =>
      this.isLessonCompleted(course.id, lesson.id),
    ).length;
    return Math.round((completedCount / lessons.length) * 100);
  }

  getNextLesson(course: Course, lessonId: string): Lesson | undefined {
    const lessons = flattenLessons(course);
    const currentIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
    return currentIndex < 0 ? undefined : lessons[currentIndex + 1];
  }

  hasReachedCompletionThreshold(positionSec: number, durationSec: number): boolean {
    return durationSec > 0 && positionSec / durationSec >= COMPLETION_THRESHOLD;
  }

  recordPosition(
    courseId: string,
    lessonId: string,
    positionSec: number,
    durationSec: number,
    allowCompletion = true,
  ): void {
    const safeDuration = Math.max(0, durationSec);
    const boundedPosition = Math.min(
      Math.max(0, positionSec),
      safeDuration || Math.max(0, positionSec),
    );
    const previous = this.getLessonProgress(courseId, lessonId);
    const completed =
      previous?.completed === true ||
      (allowCompletion && this.hasReachedCompletionThreshold(boundedPosition, safeDuration));
    const nextProgress: ProgressByCourse = {
      ...this.progress(),
      [courseId]: {
        ...this.progress()[courseId],
        [lessonId]: {
          positionSec: completed ? safeDuration : boundedPosition,
          completed,
          updatedAt: Date.now(),
        },
      },
    };
    this.progress.set(nextProgress);
    this.writeObject(PROGRESS_STORAGE_KEY, nextProgress);
  }

  getNote(courseId: string, lessonId: string): string {
    return this.notes()[this.noteKey(courseId, lessonId)] ?? '';
  }

  saveNote(courseId: string, lessonId: string, note: string): void {
    const notes = { ...this.notes(), [this.noteKey(courseId, lessonId)]: note };
    this.notes.set(notes);
    this.writeObject(NOTES_STORAGE_KEY, notes);
  }

  setPlaybackSpeed(speed: number): void {
    if (!SUPPORTED_SPEEDS.some((supportedSpeed) => supportedSpeed === speed)) return;
    this.playbackSpeed.set(speed);
    if (this.browser) this.safeStorageSet(SPEED_STORAGE_KEY, String(speed));
  }

  private noteKey(courseId: string, lessonId: string): string {
    return `${courseId}:${lessonId}`;
  }

  private readSpeed(): number {
    const raw = this.browser ? this.safeStorageGet(SPEED_STORAGE_KEY) : null;
    const speed = raw ? Number(raw) : 1;
    return SUPPORTED_SPEEDS.some((supportedSpeed) => supportedSpeed === speed) ? speed : 1;
  }

  private readObject<T extends object>(key: string, fallback: T): T {
    if (!this.browser) return fallback;
    try {
      const value: unknown = JSON.parse(this.safeStorageGet(key) ?? 'null');
      return value && typeof value === 'object' ? (value as T) : fallback;
    } catch {
      return fallback;
    }
  }

  private writeObject(key: string, value: object): void {
    if (!this.browser) return;
    try {
      this.safeStorageSet(key, JSON.stringify(value));
    } catch {
      /* Memory state remains available. */
    }
  }

  private safeStorageGet(key: string): string | null {
    try {
      return globalThis.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private safeStorageSet(key: string, value: string): void {
    try {
      globalThis.localStorage.setItem(key, value);
    } catch {
      /* Memory state remains available. */
    }
  }
}
