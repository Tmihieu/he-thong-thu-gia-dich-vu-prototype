# Repository Guidelines

## Project Structure & Module Organization

- `backend/`: Java 21 / Spring Boot API. Domain modules live under `src/main/java/vn/dongthanh/vsmt/`; tests mirror them in `src/test/java/`. Flyway migrations and demo seeds are in `src/main/resources/db/`.
- `web/`: React, TypeScript, Vite, and Ant Design. Use `src/features/` for business screens, `src/api/` for API access, `src/shared/` for reusable code, and `public/` for static assets.
- `mobile/`: Expo / React Native citizen app. Routes belong in `src/app/`, business logic in `src/features/`, and images in `assets/`. Read `mobile/AGENTS.md` before editing this module.
- `SPEC.md`, `docs/`, and `tasks/` contain requirements, business flows, demo instructions, and implementation tasks.

## Build, Test, and Development Commands

Run commands from the indicated directory. Install frontend dependencies with `npm ci` in each app.

- Root: `docker compose up -d --build` builds and starts PostgreSQL, backend (`8080`), and web (`5173`).
- `backend/`: `./mvnw spring-boot:run` starts the demo profile; `./mvnw verify` builds, runs unit/integration tests, and checks coverage. On Windows, use `.\mvnw.cmd`.
- `web/`: `npm run dev` starts Vite; `npm run build`, `npm run lint`, and `npm test` validate changes.
- `mobile/`: `npm start` starts Expo; `npm run typecheck` and `npm test -- --runInBand` validate changes.
- Either app: `npm run gen:api` regenerates `src/api/schema.d.ts` from the running backend. Do not edit generated schemas manually.

## Coding Style & Naming Conventions

Follow surrounding code: four-space Java indentation; two-space TypeScript indentation, single quotes, and semicolons. Use PascalCase for classes/components and camelCase for functions/variables. Keep backend code within its domain module. Web ESLint checks TypeScript and React Hooks conventions.

## Testing Guidelines

Backend uses JUnit, Spring Boot testing, and PostgreSQL Testcontainers; Docker is required for integration tests. Name unit tests `*Test.java` and integration tests `*IT.java`. JaCoCo enforces 80% line coverage for billing, collection, and remittance service packages. Web uses Vitest/Testing Library; mobile uses Jest/`jest-expo`. Colocate frontend tests as `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines

Follow existing Conventional Commits: `feat(web): ...`, `fix(market): ...`, or `docs: ...`. Keep commits focused. PRs should describe behavior changes, link relevant tasks/issues, report validation, and include screenshots for UI changes.

## Configuration & Agent Notes

Copy `.env.example` to `.env`; never commit secrets. Mobile's `.env.local` must point `EXPO_PUBLIC_API_URL` to the backend's reachable LAN address. If `.codegraph/` exists, use CodeGraph before searching or reading code; otherwise skip it.
