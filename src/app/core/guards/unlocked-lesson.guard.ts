import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CourseCatalogService } from '../data-access/course-catalog.service';
import { flattenLessons, ProgressService } from '../state/progress.service';

export const unlockedLessonGuard: CanActivateFn = async (route) => {
  const catalog = inject(CourseCatalogService);
  const progress = inject(ProgressService);
  const router = inject(Router);
  const courseId = route.paramMap.get('courseId');
  const lessonId = route.paramMap.get('lessonId');
  if (!courseId || !lessonId) return true;

  try {
    const course = await firstValueFrom(catalog.getCourse(courseId));
    if (!course) return true;
    const lessonExists = flattenLessons(course).some((lesson) => lesson.id === lessonId);
    if (!lessonExists || progress.isLessonUnlocked(course, lessonId)) return true;
    return router.createUrlTree(['/courses', courseId], { queryParams: { locked: 'true' } });
  } catch {
    return true;
  }
};
