import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Course, LocalizedText } from '../../core/models/course.models';
import { CourseCatalogService } from '../../core/data-access/course-catalog.service';
import { flattenLessons, ProgressService } from '../../core/state/progress.service';

@Component({
  standalone: true,
  selector: 'app-courses-page',
  imports: [MatButtonModule, MatCardModule, MatProgressBarModule, RouterLink, TranslatePipe],
  templateUrl: './courses.html',
  styleUrl: './courses.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursesPage {
  private readonly catalog = inject(CourseCatalogService);
  readonly progress = inject(ProgressService);
  readonly courses = signal<Course[]>([]);
  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly query = signal('');
  readonly filteredCourses = computed(() => {
    const term = this.query().trim().toLocaleLowerCase();
    const courses = this.courses();
    if (!term) return courses;
    return courses.filter((course) =>
      `${course.title.ar} ${course.title.en} ${course.instructor.ar} ${course.instructor.en}`
        .toLocaleLowerCase()
        .includes(term),
    );
  });
  readonly continueItem = computed(() => {
    const latest = this.progress.latestUnfinished();
    const course = this.courses()?.find((item) => item.id === latest?.courseId);
    const lesson = course
      ? flattenLessons(course).find((item) => item.id === latest?.lessonId)
      : undefined;
    return course && lesson ? { course, lesson } : undefined;
  });

  constructor() {
    this.loadCourses();
  }

  loadCourses(): void {
    this.loadState.set('loading');
    this.catalog.getCourses().subscribe({
      next: (courses) => {
        this.courses.set(courses);
        this.loadState.set('ready');
      },
      error: () => this.loadState.set('error'),
    });
  }

  localized(value: LocalizedText): string {
    return document.documentElement.lang === 'en' ? value.en : value.ar;
  }
  lessonCount(course: Course): number {
    return flattenLessons(course).length;
  }
  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
}
