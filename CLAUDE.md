# 핔잇 (Pickit)

광고 소재 레퍼런스를 수집하고 관리하는 팀 협업 도구. Next.js 웹앱 + 크롬 확장프로그램.

@AGENTS.md

## 빌드 & 실행

- **프로덕션 모드로 운영 중** — `npm run dev` 사용하지 않음
- 코드 수정 후 반드시: `npm run build && npm start`
- 서버 재시작: `kill $(lsof -ti:3000); sleep 1; npm start &`
- Cloudflare Tunnel로 `pickit.to → localhost:3000` 서빙 중
- 린트: `npm run lint`

## 환경변수 (.env.local)

- `META_ACCESS_TOKEN` — Meta Graph API (ads_archive) 접근용
- `OPENAI_API_KEY` — Whisper 음성 인식용

## 기술 스택

- Next.js 16 (App Router), React 19, TypeScript (strict)
- Tailwind CSS 4 — 스타일링 전부 Tailwind 유틸리티 클래스 사용
- SQLite (better-sqlite3) — `data/references.db`, WAL 모드
- 외부 도구: yt-dlp (영상 다운로드), ffmpeg (썸네일/오디오 추출)
- UI 언어: 한국어

## 아키텍처

```
src/app/page.tsx           # 메인 갤러리 (SPA, 상태 기반 뷰 전환)
src/app/competitors/       # 경쟁사 관리 (별도 라우트)
src/app/api/               # API 라우트 (REST)
src/components/            # UI 컴포넌트
src/lib/db.ts              # DB 스키마, 싱글톤, 타입 정의
src/lib/auth.tsx           # AuthProvider (Context)
src/lib/constants.ts       # 플랫폼, 카테고리, 색상 상수
chrome-extension/          # 크롬 확장프로그램 (Manifest V3)
```

- 메인 페이지는 SPA — `view` 상태로 gallery/create/edit 전환, 모달로 상세/관리
- 새 페이지 추가 시 `src/app/` 아래 별도 라우트, `layout.tsx`의 AuthProvider 공유
- API 라우트는 `NextResponse.json()` 반환, params는 `Promise`로 await

## DB 관련

- 스키마 변경 시 `initDb()` 함수 내 마이그레이션 패턴 사용 (PRAGMA table_info → ALTER TABLE)
- 새 테이블은 `CREATE TABLE IF NOT EXISTS`로 추가
- 타입은 `db.ts` 하단에 인터페이스로 export

## 코드 스타일

- 컴포넌트: `"use client"` 명시, 함수형 컴포넌트
- import 순서: react → next → 컴포넌트 → lib → 타입
- 색상/스타일: `text-text-primary`, `text-text-secondary`, `bg-accent` 등 커스텀 토큰 사용
- 아이콘: 인라인 SVG (외부 아이콘 라이브러리 없음)
- 썸네일 생성: yt-dlp 아닌 ffmpeg로 영상 프레임 캡처

## 주의사항

- `/uploads/*` 경로는 next.config.ts rewrites로 `/api/uploads/*`로 프록시됨
- 미디어 파일은 `public/uploads/`에 저장, gitignore 대상
- DB 파일은 `data/` 폴더, gitignore 대상
- 크롬 확장프로그램의 `/api/collect` 엔드포인트는 CORS 전체 허용 (Access-Control-Allow-Origin: *)
