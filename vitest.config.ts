import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 순수 로직(결정론 매칭·RBAC·검증) 단위 테스트용 설정.
// DB/네트워크 없이 도는 lib 함수만 대상으로 한다(node 환경).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
