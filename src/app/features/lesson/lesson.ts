import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslatePipe } from '@ngx-translate/core';
import { Course, Lesson, LocalizedText } from '../../core/models/course.models';
import { CourseCatalogService } from '../../core/data-access/course-catalog.service';
import { ProgressService } from '../../core/state/progress.service';

@Component({
  standalone: true,
  selector: 'app-lesson-page',
  imports: [MatButtonModule, MatCardModule, RouterLink, TranslatePipe],
  templateUrl: './lesson.html',
  styleUrl: './lesson.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonPage {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CourseCatalogService);
  readonly progress = inject(ProgressService);
  @ViewChild('videoElement') private videoElement?: ElementRef<HTMLVideoElement>;

  readonly course = signal<Course | undefined>(undefined);
  readonly lesson = signal<Lesson | undefined>(undefined);
  readonly loadState = signal<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  readonly playbackError = signal(false);
  readonly playing = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly completionNotice = signal(false);
  readonly speeds = [1, 1.25, 1.5, 2] as const;
  readonly selectedSpeed = this.progress.playbackSpeed;
  readonly nextLesson = computed(() => {
    const course = this.course();
    const lesson = this.lesson();
    return course && lesson ? this.progress.getNextLesson(course, lesson.id) : undefined;
  });
  readonly noteText = signal('');

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const courseId = params.get('courseId');
      const lessonId = params.get('lessonId');
      if (courseId && lessonId) this.loadLesson(courseId, lessonId);
      else this.loadState.set('not-found');
    });
  }

  private loadLesson(courseId: string, lessonId: string): void {
    this.loadState.set('loading');
    this.playbackError.set(false);
    this.playing.set(false);
    this.completionNotice.set(false);
    this.catalog.getCourse(courseId).subscribe({
      next: (course) => {
        const lesson = course?.sections
          .flatMap((section) => section.lessons)
          .find((item) => item.id === lessonId);
        this.course.set(course);
        this.lesson.set(lesson);
        if (!course || !lesson) {
          this.loadState.set('not-found');
          return;
        }
        this.currentTime.set(this.progress.getResumePosition(courseId, lessonId));
        this.duration.set(lesson.durationSec);
        this.noteText.set(this.progress.getNote(courseId, lessonId));
        this.loadState.set('ready');
      },
      error: () => this.loadState.set('error'),
    });
  }

  localized(value: LocalizedText): string {
    return document.documentElement.lang === 'en' ? value.en : value.ar;
  }

  onMetadataLoaded(): void {
    const video = this.videoElement?.nativeElement;
    const lesson = this.lesson();
    if (!video || !lesson) return;
    const mediaDuration = Number.isFinite(video.duration) ? video.duration : lesson.durationSec;
    this.duration.set(mediaDuration);
    video.playbackRate = this.selectedSpeed();
    const savedPosition = this.progress.getResumePosition(this.course()?.id ?? '', lesson.id);
    video.currentTime = Math.min(savedPosition, Math.max(0, mediaDuration - 0.1));
    this.currentTime.set(video.currentTime);
  }

  togglePlayback(): void {
    const video = this.videoElement?.nativeElement;
    if (!video || this.playbackError()) return;
    if (video.paused) {
      void video
        .play()
        .then(() => this.playing.set(true))
        .catch(() => this.playbackError.set(true));
    } else {
      video.pause();
      this.playing.set(false);
    }
  }

  onTimeUpdate(allowCompletion = true): void {
    const video = this.videoElement?.nativeElement;
    const course = this.course();
    const lesson = this.lesson();
    if (!video || !course || !lesson) return;
    const actualDuration = Number.isFinite(video.duration) ? video.duration : lesson.durationSec;
    this.currentTime.set(video.currentTime);
    this.duration.set(actualDuration);
    const wasCompleted = this.progress.isLessonCompleted(course.id, lesson.id);
    this.progress.recordPosition(
      course.id,
      lesson.id,
      video.currentTime,
      actualDuration,
      allowCompletion && !video.paused && !video.seeking,
    );
    if (!wasCompleted && this.progress.isLessonCompleted(course.id, lesson.id))
      this.completionNotice.set(true);
  }

  onSeek(event: Event): void {
    const video = this.videoElement?.nativeElement;
    const input = event.target as HTMLInputElement;
    if (!video) return;
    video.currentTime = Number(input.value);
    this.currentTime.set(video.currentTime);
    this.onTimeUpdate(false);
  }

  chooseSpeed(speed: number): void {
    this.progress.setPlaybackSpeed(speed);
    const video = this.videoElement?.nativeElement;
    if (video) video.playbackRate = speed;
  }

  toggleFullscreen(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void video.requestFullscreen();
  }

  updateNote(value: string): void {
    this.noteText.set(value);
    const course = this.course();
    const lesson = this.lesson();
    if (course && lesson) this.progress.saveNote(course.id, lesson.id, value);
  }
  updateNoteFromEvent(event: Event): void {
    this.updateNote((event.target as HTMLTextAreaElement).value);
  }

  onMediaError(): void {
    this.playbackError.set(true);
    this.playing.set(false);
  }
  onMediaPlay(): void {
    this.playing.set(true);
  }
  onMediaPause(): void {
    this.playing.set(false);
    this.onTimeUpdate(false);
  }

  formatTime(seconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
    )
      return;
    const video = this.videoElement?.nativeElement;
    if (!video || this.loadState() !== 'ready') return;
    if (event.code === 'Space') {
      event.preventDefault();
      this.togglePlayback();
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.seekBy(-5);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.seekBy(5);
    }
  }

  private seekBy(seconds: number): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;
    video.currentTime = Math.min(
      Math.max(0, video.currentTime + seconds),
      Number.isFinite(video.duration) ? video.duration : this.duration(),
    );
    this.onTimeUpdate(false);
  }
}
