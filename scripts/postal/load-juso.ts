/**
 * 행안부 도로명주소 DB 전체분(건물 DB) 적재 스크립트.
 *
 * 데이터 출처: https://business.juso.go.kr → 주소DB → "도로명주소 한글(전체분)"
 *   - 무료, 상업 이용 가능. 매월 변동분 배포.
 *   - 압축 해제하면 시도별 `build_*.txt` (파이프 `|` 구분, EUC-KR 인코딩) 파일.
 *
 * 사용법:
 *   1) 내려받은 txt 들을 한 폴더에 모은다.
 *   2) DATABASE_URL(Postgres) 설정.
 *   3)  npx tsx scripts/postal/load-juso.ts ./juso_data
 *
 * 대량(수백만 행)이라 Prisma createMany 대신 Postgres COPY 로 삽입한다.
 * 적재 후 zipcode/roadKey/jibunKey 인덱스가 자동 생성돼 있어야 조회가 빠르다
 * (prisma migrate 로 PostalBuilding 테이블 선생성 필요).
 *
 * 건물 DB 필드 순서(전체분, |구분) — 행안부 레이아웃 기준:
 *   0 관리번호 1 도로명코드 2 읍면동일련번호 3 지하여부 4 건물본번 5 건물부번
 *   6 시군구용건물명 7 우편번호 8 건물관리번호 9 시군구용건물명(영문) ...
 * ※ 레이아웃은 배포본 헤더 문서(`도로명주소 DB 구조.pdf`)로 반드시 확인할 것.
 *   아래 인덱스는 대표적인 "주소_XXXX.txt"(매칭용) 레이아웃 예시이며,
 *   실제 파일 종류(주소/부가정보/관련지번)에 맞게 COLS 매핑만 바꾸면 된다.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import iconv from "iconv-lite"; // npm i -D iconv-lite (EUC-KR 디코딩용)
import { Client } from "pg"; // npm i pg
import { from as copyFrom } from "pg-copy-streams"; // npm i pg-copy-streams
import { roadKeyOf, jibunKeyOf } from "../../src/lib/postal/normalize";

// 매칭용 "주소" 파일(주소_지역명.txt) 컬럼 인덱스. 배포 레이아웃에 맞춰 조정.
const COLS = {
  sido: 1, // 시도명
  sigungu: 2, // 시군구명
  emd: 3, // 읍면동명
  ri: 4, // 리명
  roadName: 8, // 도로명
  isBasement: 9, // 지하여부(0/1)
  buildingMain: 10, // 건물본번
  buildingSub: 11, // 건물부번
  zipcode: 19, // 우편번호
  isMountain: 25, // 산여부(0/1)
  jibunMain: 26, // 지번본번
  jibunSub: 27, // 지번부번
  buildingName: 30, // 건물명
};

function n(v: string | undefined): number {
  const x = parseInt((v ?? "").trim(), 10);
  return Number.isFinite(x) ? x : 0;
}
function s(v: string | undefined): string {
  return (v ?? "").trim();
}

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("사용법: npx tsx scripts/postal/load-juso.ts <데이터폴더>");
    process.exit(1);
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".txt"))
    .map((f) => path.join(dir, f));
  if (!files.length) {
    console.error(`.txt 파일을 찾지 못했습니다: ${dir}`);
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // 빠른 재적재를 위해 기존 데이터 비우기(운영 갱신 정책에 맞게 조정).
  await client.query("TRUNCATE TABLE postal_building RESTART IDENTITY");

  const columns = [
    "zipcode", "sido", "sigungu", "emd", "ri", "roadName",
    "buildingMain", "buildingSub", "isBasement",
    "jibunMain", "jibunSub", "isMountain", "buildingName",
    "roadKey", "jibunKey",
  ];
  const copySql = `COPY postal_building (${columns
    .map((c) => `"${c}"`)
    .join(",")}) FROM STDIN WITH (FORMAT csv, DELIMITER E'\\t', QUOTE E'\\b')`;

  let total = 0;
  for (const file of files) {
    const stream = client.query(copyFrom(copySql));
    const rl = readline.createInterface({
      input: fs.createReadStream(file).pipe(iconv.decodeStream("euc-kr")),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      const c = line.split("|");
      const sido = s(c[COLS.sido]);
      const sigungu = s(c[COLS.sigungu]);
      const emd = s(c[COLS.emd]);
      const roadName = s(c[COLS.roadName]);
      const bMain = n(c[COLS.buildingMain]);
      const bSub = n(c[COLS.buildingSub]);
      const jMain = n(c[COLS.jibunMain]);
      const jSub = n(c[COLS.jibunSub]);
      const isMt = s(c[COLS.isMountain]) === "1" || s(c[COLS.isMountain]) === "산";

      const bno = bSub > 0 ? `${bMain}-${bSub}` : `${bMain}`;
      const jno = jSub > 0 ? `${jMain}-${jSub}` : `${jMain}`;
      const jibun = (isMt ? "산" : "") + jno;

      const row = [
        s(c[COLS.zipcode]).padStart(5, "0").slice(0, 5),
        sido, sigungu, emd, s(c[COLS.ri]), roadName,
        String(bMain), String(bSub),
        s(c[COLS.isBasement]) === "1" ? "true" : "false",
        String(jMain), String(jSub),
        isMt ? "true" : "false",
        s(c[COLS.buildingName]),
        roadKeyOf(sido, sigungu, roadName, bno),
        jibunKeyOf(sido, sigungu, emd, jibun),
      ]
        // 탭 구분 CSV 안전화: 탭·개행 제거
        .map((v) => v.replace(/[\t\r\n]/g, " "))
        .join("\t");

      if (!stream.write(row + "\n")) {
        await new Promise((res) => stream.once("drain", res));
      }
      total++;
      if (total % 100_000 === 0) console.log(`  …${total.toLocaleString()}건`);
    }
    await new Promise<void>((resolve, reject) => {
      stream.on("finish", () => resolve());
      stream.on("error", reject);
      stream.end();
    });
    console.log(`✔ ${path.basename(file)} 적재 완료 (누적 ${total.toLocaleString()})`);
  }

  await client.end();
  console.log(`\n총 ${total.toLocaleString()}건 적재 완료.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
