import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { Course } from '../models/course.models';

@Injectable({ providedIn: 'root' })
export class CourseCatalogService {
  private readonly http = inject(HttpClient);
  private readonly catalog$ = this.http
    .get<Course[]>('/assets/data/courses.json')
    .pipe(shareReplay(1));

  getCourses(): Observable<Course[]> {
    return this.catalog$;
  }
  getCourse(courseId: string): Observable<Course | undefined> {
    return this.catalog$.pipe(map((courses) => courses.find((course) => course.id === courseId)));
  }
}
