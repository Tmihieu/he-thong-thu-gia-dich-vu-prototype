# Repository Guidelines

## Project Structure & Module Organization

- `backend/`: Java 21 / Spring Boot API. Domain modules live under `src/main/java/vn/dongthanh/vsmt/`; tests mirror them in `src/test/java/`. Flyway migrations and demo seeds are in `src/main/resources/db/`.
- `web/`: React, TypeScript, Vite, and Ant Design. Use `src/features/` for business screens, `src/api/` for API access, `src/shared/` for reusable code, and `public/` for static assets.
- `mobile-flutter/`: Flutter citizen app. Screens live in `lib/features/`, API clients and models in `lib/api/`, shared widgets/helpers in `lib/shared/`, routes in `lib/app.dart`.
- `SPEC.md`, `docs/`, and `tasks/` contain requirements, business flows, demo instructions, and implementation tasks.

## Build, Test, and Development Commands

Run commands from the indicated directory. Install frontend dependencies with `npm ci` in each app.

- Root: `docker compose up -d --build` builds and starts PostgreSQL, backend (`8080`), and web (`5173`).
- `backend/`: `./mvnw spring-boot:run` starts the demo profile; `./mvnw verify` builds, runs unit/integration tests, and checks coverage. On Windows, use `.\mvnw.cmd`.
- `web/`: `npm run dev` starts Vite; `npm run build`, `npm run lint`, and `npm test` validate changes.
- `mobile-flutter/`: `flutter run --dart-define=API_URL=http://<lan-ip>:8080`; `flutter analyze` and `flutter test` validate changes; `flutter build apk --release --target-platform android-arm64 --dart-define=API_URL=...` builds the APK.
- `web/`: `npm run gen:api` regenerates `src/api/schema.d.ts` from the running backend. Do not edit generated schemas manually.

## Coding Style & Naming Conventions

Follow surrounding code: four-space Java indentation; two-space TypeScript indentation, single quotes, and semicolons. Use PascalCase for classes/components and camelCase for functions/variables. Keep backend code within its domain module. Web ESLint checks TypeScript and React Hooks conventions.

## Testing Guidelines

Backend uses JUnit, Spring Boot testing, and PostgreSQL Testcontainers; Docker is required for integration tests. Name unit tests `*Test.java` and integration tests `*IT.java`. JaCoCo enforces 80% line coverage for billing, collection, and remittance service packages. Web uses Vitest/Testing Library; colocate its tests as `*.test.ts` or `*.test.tsx`. The Flutter app uses `flutter test` with tests under `mobile-flutter/test/`.

## Commit & Pull Request Guidelines

Follow existing Conventional Commits: `feat(web): ...`, `fix(market): ...`, or `docs: ...`. Keep commits focused. PRs should describe behavior changes, link relevant tasks/issues, report validation, and include screenshots for UI changes.

## Configuration & Agent Notes

Copy `.env.example` to `.env`; never commit secrets. The Flutter app takes the backend's reachable LAN address at build time via `--dart-define=API_URL=...`. If `.codegraph/` exists, use CodeGraph before searching or reading code; otherwise skip it.
