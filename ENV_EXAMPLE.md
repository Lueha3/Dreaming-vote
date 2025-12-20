# Environment Variables

이 프로젝트에서 사용하는 환경 변수 목록입니다.

## 필수 환경 변수

### `.env.local` (로컬 개발용, Git에 커밋하지 않음)

로컬 개발 환경에서만 사용하는 값들을 설정합니다.

```bash
# 데이터베이스 연결 (로컬 개발: SQLite)
DATABASE_URL="file:./dev.db"

# 관리자 인증 비밀번호
ADMIN_SECRET=your-admin-secret-here

# 교회 코드 (모집글 생성 시 사용)
CHURCH_CODE=your-church-code-here
```

### `.env` (선택사항, Git에 커밋하지 않음)

프로젝트 전체에 공통으로 사용되는 값들을 설정합니다. 
현재는 사용하지 않지만, 향후 공유가 필요한 설정이 있을 경우 사용할 수 있습니다.

## 환경 변수 설명

### `DATABASE_URL`
- **용도**: Prisma 데이터베이스 연결 문자열
- **위치**: `.env.local` (로컬), Vercel 환경 변수 (프로덕션)
- **필수**: 예
- **설명**: 
  - 로컬 개발: `"file:./dev.db"` (SQLite)
  - 프로덕션: Supabase Postgres 연결 문자열 (예: `postgresql://postgres:password@host:5432/postgres`)
  - 자세한 내용은 [DEPLOYMENT.md](./DEPLOYMENT.md) 참고

### `ADMIN_SECRET`
- **용도**: 관리자 모집글 생성 API 인증
- **위치**: `.env.local`
- **필수**: 예
- **설명**: `/api/admin/recruitments` 엔드포인트에서 관리자 인증에 사용됩니다.

### `CHURCH_CODE`
- **용도**: 모집글 생성 시 교회 코드로 저장
- **위치**: `.env.local`
- **필수**: 예
- **설명**: 새 모집글을 생성할 때 이 값이 `churchCode` 필드에 저장됩니다.

### `NODE_ENV`
- **용도**: 실행 환경 구분 (development/production)
- **위치**: 자동 설정 (Next.js)
- **필수**: 아니오
- **설명**: Next.js가 자동으로 설정합니다. 개발 서버는 `development`, 빌드는 `production`입니다.

### `NEXT_PUBLIC_API_URL` (선택사항)
- **용도**: 클라이언트에서 API 호출 시 사용할 기본 URL
- **위치**: `.env.local`
- **필수**: 아니오
- **설명**: `scripts/cleanup-corrupt.js`에서 사용됩니다. 설정하지 않으면 `http://localhost:3000`을 사용합니다.

## 설정 방법

1. 프로젝트 루트에 `.env.local` 파일 생성
2. 위의 환경 변수들을 복사하여 값 입력
3. 개발 서버 재시작 (`npm run dev`)

## 주의사항

- `.env.local` 파일은 Git에 커밋하지 마세요 (이미 `.gitignore`에 포함됨)
- 프로덕션 환경에서는 배포 플랫폼의 환경 변수 설정 기능을 사용하세요
- 비밀번호나 민감한 정보는 절대 Git에 커밋하지 마세요

