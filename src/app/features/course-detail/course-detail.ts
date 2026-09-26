import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslatePipe } from '@ngx-translate/core';
import { Course, Lesson, LocalizedText } from '../../core/models/course.models';
import { CourseCatalogService } from '../../core/data-access/course-catalog.service';
import { ProgressService, flattenLessons } from '../../core/state/progress.service';

@Component({
  standalone: true,
  selector: 'app-course-detail-page',
  imports: [MatButtonModule, MatCardModule, RouterLink, TranslatePipe],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CourseCatalogService);
  readonly progress = inject(ProgressService);
  readonly course = signal<Course | undefined>(undefined);
  readonly loadState = signal<'loading' | 'ready' | 'error' | 'not-found'>('loading');
  readonly showLockedNotice = signal(false);

  constructor() {
    this.route.paramMap.subscribe((params) => this.loadCourse(params.get('courseId') ?? ''));
    this.route.queryParamMap.subscribe((params) =>
      this.showLockedNotice.set(params.get('locked') === 'true'),
    );
  }

  private loadCourse(courseId: string): void {
    this.loadState.set('loading');
    this.catalog.getCourse(courseId).subscribe({
      next: (course) => {
        this.course.set(course);
        this.loadState.set(course ? 'ready' : 'not-found');
      },
      error: () => this.loadState.set('error'),
    });
  }

  localized(value: LocalizedText): string {
    return document.documentElement.lang === 'en' ? value.en : value.ar;
  }
  lessonState(
    course: Course,
    lesson: Lesson,
  ): 'completed' | 'in-progress' | 'not-started' | 'locked' {
    if (!this.progress.isLessonUnlocked(course, lesson.id)) return 'locked';
    if (this.progress.isLessonCompleted(course.id, lesson.id)) return 'completed';
    return this.progress.getResumePosition(course.id, lesson.id) > 0
      ? 'in-progress'
      : 'not-started';
  }
  durationLabel(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  }
  lessonCount(course: Course): number {
    return flattenLessons(course).length;
  }
}
