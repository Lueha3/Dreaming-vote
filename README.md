This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Setup

1. 루트의 `.env.local.example`를 복사해 `.env.local`을 만드세요:
   ```bash
   cp .env.local.example .env.local
   ```
2. Supabase·DB·AI·관리자 값을 채우세요 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `DIRECT_URL`, `GOOGLE_AI_API_KEY`, `ADMIN_SECRET` 등)
3. 자세한 환경 변수 설명은 [ENV_EXAMPLE.md](./ENV_EXAMPLE.md)를 참고하세요

### Development

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Static Assets

Static assets (images, fonts, etc.) should be placed in the `public/` folder at the project root.

**Logo Setup:**
1. Place the church logo image file at `public/logo.png`
2. Ensure the filename is exactly `logo.png` (no double extensions)
3. Restart the dev server after adding the file
4. Verify the logo is accessible by visiting [http://localhost:3000/logo.png](http://localhost:3000/logo.png) - it should return 200 OK

The logo will appear in the global header on all pages.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
