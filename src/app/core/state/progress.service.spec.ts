import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Course } from '../models/course.models';
import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  let service: ProgressService;
  const course: Course = {
    id: 'course-a',
    title: { ar: 'دورة', en: 'Course' },
    instructor: { ar: 'محاضر', en: 'Instructor' },
    thumbnail: '',
    sections: [
      {
        id: 'section-a',
        title: { ar: 'قسم', en: 'Section' },
        lessons: [
          { id: 'lesson-1', title: { ar: 'الأول', en: 'First' }, durationSec: 100, video: '' },
          { id: 'lesson-2', title: { ar: 'الثاني', en: 'Second' }, durationSec: 100, video: '' },
        ],
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProgressService, { provide: PLATFORM_ID, useValue: 'server' }],
    });
    service = TestBed.inject(ProgressService);
  });

  it('completes only after the learner reaches 90 percent', () => {
    expect(service.hasReachedCompletionThreshold(89, 100)).toBe(false);
    expect(service.hasReachedCompletionThreshold(90, 100)).toBe(true);
  });

  it('unlocks each lesson only after its predecessor is complete', () => {
    expect(service.isLessonUnlocked(course, 'lesson-1')).toBe(true);
    expect(service.isLessonUnlocked(course, 'lesson-2')).toBe(false);
    service.recordPosition(course.id, 'lesson-1', 90, 100);
    expect(service.isLessonUnlocked(course, 'lesson-2')).toBe(true);
  });

  it('calculates course progress from completed lessons', () => {
    service.recordPosition(course.id, 'lesson-1', 90, 100);
    expect(service.getCourseProgressPercent(course)).toBe(50);
  });
});
