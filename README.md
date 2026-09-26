# Thaheen — Mini Offline LMS

An Arabic-first course portal built with Angular standalone components, Angular Material, signals and ngx-translate. Course metadata, translation dictionaries, thumbnails and MP4 lessons are bundled with the app; there is no application backend or external data service.

## Run locally

```bash
npm install && ng serve
```

If Angular CLI is not installed globally, run `npm install && npx ng serve` (or `npm start`, which uses the project-local CLI). Open `http://localhost:4200/courses`. The app defaults to Arabic and RTL. Use the header controls to switch to English or toggle the theme.

Run the progress logic unit tests once, without watch mode, with:

```bash
npm test -- --watch=false
```

## Included product flows

- The course library shows two courses, lesson counts and completion percentages, supports local search, and surfaces the most recently updated unfinished lesson.
- Course pages show section contents, duration and status. Lesson N is unlocked only when lesson N−1 is complete.
- The **Watch lesson** page uses a bundled HTML5 video with play, seek, fullscreen and speed controls. It resumes the saved playhead, saves notes locally, and completes a lesson once normal playback reaches 90% of its duration. Video, notes and the next-lesson action sit in one responsive column.
- Space toggles playback; left and right arrows seek backward and forward. Shortcuts are ignored while typing in a field.
- A functional guard redirects a known locked lesson to its course and shows a translated explanation. Unknown course or lesson IDs render a not-found state.
- Loading, catalog errors, empty courses, and broken local video files have explicit UI states.

## Architecture

```text
src/app/
  core/
    data-access/   Local JSON catalog loader
    guards/        Sequential lesson access guard
    layout/        Responsive navigation shell and language/theme controls
    models/        Strict course and progress types
    state/         Local progress, notes and playback-speed adapter
  features/
    courses/       Searchable course library and continue-watching card
    course-detail/ Course outline and lesson status
    lesson/        Watch lesson page, video controls and local notes
src/assets/
  data/courses.json
  images/          Bundled hand-hygiene course illustrations
  videos/          Three offline MP4 lesson excerpts
public/i18n/       Arabic and English ngx-translate dictionaries
```

The app uses standalone Angular components and lazy-loaded feature routes to keep page boundaries clear and avoid loading every feature at startup. Core services own shared concerns: `CourseCatalogService` reads only `/assets/data/courses.json`, while `ProgressService` is the sole owner of browser persistence. The catalog service is a small seam for a future data source; components never call a backend or access storage directly.

Signals hold the current progress and UI state so components update when a learner watches, completes or revisits a lesson. `ProgressService` stores completion, playhead positions, notes and playback speed in versioned `localStorage` keys. Keeping this behind a service makes persistence replaceable and lets tests focus on the progress rules. A functional route guard and the course outline use the same sequential-unlock rule.

The course catalog is static bilingual JSON, with `{ "ar": "…", "en": "…" }` fields for course content. `ngx-translate` handles interface copy from `public/i18n/ar.json` and `public/i18n/en.json`. This keeps lesson data offline while giving the interface one translation mechanism. Arabic is the default language and sets the document direction to RTL.

## Visual theme

The visual palette uses a violet, magenta and coral navigation gradient in both themes. Light mode uses a warm off-white canvas, white cards and a deep violet accent; dark mode uses ink-plum surfaces and a soft lilac accent. Text, warning and error colors change with the theme. Arabic prefers Noto Sans Arabic with Tahoma and system fallbacks; English prefers Inter with Segoe UI, Roboto and Arial fallbacks. These are local system-font stacks, so the app makes no font CDN requests. Header icons are inline SVGs.

The shell includes a small translated footer. Video seeking uses a three-column layout with a shrink-safe range control, and course progress bars are clipped to their card width to prevent overlap on narrow screens.


## Progress behavior

Course completion is the rounded percentage of lessons completed. The first lesson in each course is available immediately; later lessons become available one at a time. A video is considered complete at 90% of its media duration. Scrubbing while paused updates the resume point without completing the lesson. Continuing normal playback near the end triggers completion and unlocks the next lesson.

Three service tests cover the 90% threshold, sequential unlocking and course percentage calculation.

## Trade-offs and known issues

- Progress and notes are stored in the current browser only. Clearing site storage removes them; data does not sync between devices or users.
- There is no account system, backend, course enrollment flow or cross-device synchronization; the included courses are demo content.
- Playback depends on browser support for the bundled H.264/AAC MP4 files. A failed media load is shown in the player.

## What I would improve next

With more time, I would source distinct Arabic videos for the infection-prevention lessons, add real lesson descriptions and transcripts, and expand tests to cover catalog errors, notes and resume behavior. I would also do a hands-on responsive and keyboard accessibility review in desktop and mobile browsers.

## Estimated effort

Roughly **5–7 hours** across implementation, testing, visual refinement and follow-up changes. 
