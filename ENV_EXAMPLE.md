# Environment Variables

이 프로젝트에서 사용하는 환경 변수 목록입니다. 실제 템플릿은 루트의 `.env.local.example`를 참고하세요(Git에 커밋되지 않음).

## 필수 환경 변수

### `.env.local` (로컬 개발용, Git에 커밋하지 않음)

로컬·프로덕션 모두 Supabase Postgres를 사용합니다(SQLite 경로 없음).

```bash
# Supabase (인증 + 데이터베이스) — Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Prisma 연결 — Supabase Dashboard > Settings > Database > Connection string
# DATABASE_URL: 풀러(PgBouncer, 6543) — 런타임용
# DIRECT_URL:   다이렉트(5432) — 스키마 적용(prisma db push)용
DATABASE_URL=postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[project-ref].supabase.co:5432/postgres

# Google AI API (AI 파싱) — https://aistudio.google.com/apikey
GOOGLE_AI_API_KEY=AIza...

# 관리자 대시보드 비밀번호
ADMIN_SECRET=your-admin-secret-here

# 슈퍼관리자 이메일 (쉼표로 구분) — RBAC 최초 관리자 부트스트랩. 서버 전용(NEXT_PUBLIC_ 금지).
SUPERADMIN_EMAILS=you@example.com

# 앱 기본 URL (배포 후 실제 URL로 변경)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### `.env` (선택사항, Git에 커밋하지 않음)

프로젝트 전체에 공통으로 사용되는 값들을 설정합니다.
현재는 사용하지 않지만, 향후 공유가 필요한 설정이 있을 경우 사용할 수 있습니다.

## 환경 변수 설명

### `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **용도**: Supabase 인증(구글 로그인)·클라이언트 SDK 연결
- **위치**: `.env.local` (로컬), Vercel 환경 변수 (프로덕션)
- **필수**: 예
- **설명**: Supabase Dashboard > Settings > API에서 발급. `NEXT_PUBLIC_` 접두사대로 브라우저에 노출되는 공개 값입니다.

### `DATABASE_URL`
- **용도**: Prisma 런타임 데이터베이스 연결 문자열
- **위치**: `.env.local` (로컬), Vercel 환경 변수 (프로덕션)
- **필수**: 예
- **설명**: Supabase 풀러(PgBouncer) 연결을 사용합니다. 포트 `6543`, 끝에 `?pgbouncer=true`. 자세한 내용은 [DEPLOYMENT.md](./DEPLOYMENT.md) 참고.

### `DIRECT_URL`
- **용도**: Prisma 다이렉트 연결 — 스키마 적용(`prisma db push`)에 사용
- **위치**: `.env.local` (로컬), Vercel 환경 변수 (프로덕션)
- **필수**: 예
- **설명**: 풀러를 거치지 않는 직접 연결. 포트 `5432`. `prisma/schema.prisma`의 `directUrl`이 이 값을 읽습니다. 마이그레이션 히스토리는 두지 않고 `prisma db push`(또는 Supabase MCP `apply_migration`)로 스키마를 동기화합니다.

### `GOOGLE_AI_API_KEY`
- **용도**: AI 파싱(성향 카드 생성 등)에 사용하는 Google AI API 키
- **위치**: `.env.local` (로컬), Vercel 환경 변수 (프로덕션)
- **필수**: 예
- **설명**: Google AI Studio에서 발급. 서버 전용이므로 절대 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.

### `ADMIN_SECRET`
- **용도**: 관리자 대시보드/관리자 API 인증
- **위치**: `.env.local` (로컬), Vercel 환경 변수 (프로덕션)
- **필수**: 예
- **설명**: 관리자 로그인 및 `x-admin-secret` 헤더 검증에 사용됩니다.

### `SUPERADMIN_EMAILS`
- **용도**: RBAC 최초 관리자(superadmin) 부트스트랩
- **위치**: `.env.local` (로컬), Vercel 환경 변수 (프로덕션)
- **필수**: 아니오 (비우면 superadmin 없음 — fail-closed)
- **설명**: 쉼표로 구분한 Google 로그인 이메일 목록. 여기 적힌 이메일은 DB `role` 값과 무관하게 항상 최고 권한을 갖습니다. 민감 정보이므로 절대 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.

### `NEXT_PUBLIC_APP_URL`
- **용도**: 앱의 공개 기본 URL
- **위치**: `.env.local` (로컬), Vercel 환경 변수 (프로덕션)
- **필수**: 아니오 (없으면 합리적 기본값으로 대체)
- **설명**: 로그아웃 리다이렉트 등 절대 URL 생성에 사용됩니다. 로컬은 `http://localhost:3000`, 프로덕션은 실제 배포 URL.

### `NODE_ENV`
- **용도**: 실행 환경 구분 (development/production)
- **위치**: 자동 설정 (Next.js)
- **필수**: 아니오
- **설명**: Next.js가 자동으로 설정합니다. 개발 서버는 `development`, 빌드는 `production`입니다.

## 설정 방법

1. 루트의 `.env.local.example`를 복사해 `.env.local`로 만드세요 (`cp .env.local.example .env.local`)
2. 위의 환경 변수 값을 채우세요
3. 개발 서버 재시작 (`npm run dev`)

## 주의사항

- `.env.local` 파일은 Git에 커밋하지 마세요 (이미 `.gitignore`에 포함됨)
- 프로덕션 환경에서는 배포 플랫폼의 환경 변수 설정 기능을 사용하세요
- 비밀번호나 민감한 정보는 절대 Git에 커밋하지 마세요
