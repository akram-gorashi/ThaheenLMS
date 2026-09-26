import { Routes } from '@angular/router';
import { unlockedLessonGuard } from './core/guards/unlocked-lesson.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/main-shell/main-shell').then((m) => m.MainShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'courses' },
      {
        path: 'courses',
        loadComponent: () => import('./features/courses/courses').then((m) => m.CoursesPage),
      },
      {
        path: 'courses/:courseId',
        loadComponent: () =>
          import('./features/course-detail/course-detail').then((m) => m.CourseDetailPage),
      },
      {
        path: 'courses/:courseId/lessons/:lessonId',
        canActivate: [unlockedLessonGuard],
        loadComponent: () => import('./features/lesson/lesson').then((m) => m.LessonPage),
      },
      { path: '**', redirectTo: 'courses' },
    ],
  },
];
