# 핔잇 (Pickit)

> 또 찾지 말고, 이젠 핔잇.

타사 광고 소재를 수집하고 관리하는 팀 협업 도구입니다.

## 주요 기능

### 웹앱

**소재 수집 & 관리**
- 광고 소재 등록 (이미지/영상), URL 붙여넣기로 자동 다운로드 (YouTube, TikTok, Instagram, Meta Ad Library)
- 매이슨리 갤러리 뷰, 플랫폼별 필터 (Meta, YouTube, TikTok, GFA)
- 검색 (제목, 브랜드, 태그, 메모), 정렬 (최신순, 조회수, 좋아요, 활성기간)
- 즐겨찾기, 카테고리 분류, 태그

**소재 상세**
- 영상 재생, 이미지 뷰어
- 조회수, 좋아요, 광고 집행 기간 등 성과 지표
- 영상 자동 음성 인식 (OpenAI Whisper) → 자막/스크립트 추출
- 팀원 댓글, 메모

**경쟁사 관리**
- 경쟁사 브랜드 등록 (이름, 카테고리, 메모)
- 광고 라이브러리 바로가기 링크 (Meta Ad Library, 구글 투명성센터, 자사몰 등)
- 카테고리별 그룹핑, 접기/펼치기
- 소재 탭에서 사이드바로 빠른 접근

**팀 협업**
- 팀원 계정 관리 (관리자/일반), 프로필 사진
- 수집자 표시, 수집 날짜
- 방문 기록 대시보드

### 크롬 확장프로그램

**Meta Ad Library 수집**
- 광고 카드에 "핔잇!" 버튼 자동 표시
- 브랜드, 광고 문구, 미디어, 게재 시작일, 라이브러리 ID 자동 추출
- 카테고리, 태그, 메모 입력 후 원클릭 수집
- 수집 완료된 광고 표시 (중복 방지)

**네이버 GFA 수집**
- 네이버 메인, 뉴스, 블로그 등의 GFA 광고 감지
- 브랜드, 제목, 이미지/영상 스틸컷 자동 추출
- 동일한 수집 플로우

> 상세 설치 및 사용법은 [chrome-extension/README.md](chrome-extension/README.md) 참고

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js (App Router) |
| DB | SQLite (better-sqlite3) |
| 스타일링 | Tailwind CSS |
| 영상 다운로드 | yt-dlp, ffmpeg |
| 음성 인식 | OpenAI Whisper API |
| 미디어 API | Meta Graph API (ads_archive) |
| 확장프로그램 | Chrome Manifest V3 |
| 터널링 | Cloudflare Tunnel |

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# META_ACCESS_TOKEN, OPENAI_API_KEY 입력

# 개발 서버
npm run dev

# 프로덕션 빌드 & 실행
npm run build
npm start
```

## API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/references` | GET | 소재 목록 (필터, 정렬) |
| `/api/references` | POST | 소재 등록 |
| `/api/references/[id]` | GET/PUT/DELETE | 소재 상세/수정/삭제 |
| `/api/references/[id]/comments` | GET/POST | 댓글 조회/등록 |
| `/api/collect` | POST | 확장프로그램 수집 (CORS) |
| `/api/download-video` | POST | URL에서 미디어 다운로드 |
| `/api/transcribe` | POST | 영상 음성 인식 |
| `/api/upload` | POST | 파일 업로드 |
| `/api/favorites` | GET/POST | 즐겨찾기 조회/토글 |
| `/api/competitors` | GET/POST | 경쟁사 목록/등록 |
| `/api/competitors/[id]` | PUT/DELETE | 경쟁사 수정/삭제 |
| `/api/users` | GET/POST | 팀원 목록/등록 |
| `/api/auth/login` | POST | 로그인 |
| `/api/visits` | GET/POST | 방문 기록 |

## 프로젝트 구조

```
├── chrome-extension/     # 크롬 확장프로그램
│   ├── content.js        # Meta Ad Library 수집
│   ├── content-naver.js  # 네이버 GFA 수집
│   ├── background.js     # 서비스 워커
│   ├── popup.js          # 설정 팝업
│   └── install.sh        # 간편 설치 스크립트
├── src/
│   ├── app/
│   │   ├── page.tsx           # 메인 갤러리
│   │   ├── competitors/       # 경쟁사 관리 페이지
│   │   └── api/               # API 라우트
│   ├── components/            # UI 컴포넌트
│   └── lib/                   # DB, 인증, 상수
├── data/                 # SQLite DB (gitignore)
└── public/uploads/       # 미디어 파일 (gitignore)
```
