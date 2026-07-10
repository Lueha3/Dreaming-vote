// 메모리 기반 AddressStore — 샘플/개발용. 운영에서는 동일 인터페이스를
// Postgres 질의 구현으로 교체한다(scripts/postal/load-juso.ts 로 적재).
//
// 수백만 건 전국 DB는 메모리에 못 올리므로 운영은 반드시 DB 백엔드를 쓴다.
// 이 구현은 MVP 데모·단위테스트·수천 건 규모 로컬 처리에 적합하다.

import type { AddressStore, BuildingRecord, IndexedRecord } from "./types";
import { jibunKeyOf, roadKeyOf } from "./normalize";

export function indexRecord(r: BuildingRecord): IndexedRecord {
  const bno =
    r.buildingSub > 0 ? `${r.buildingMain}-${r.buildingSub}` : `${r.buildingMain}`;
  const jno =
    r.jibunSub > 0 ? `${r.jibunMain}-${r.jibunSub}` : `${r.jibunMain}`;
  const jibun = (r.isMountain ? "산" : "") + jno;
  return {
    ...r,
    roadKey: roadKeyOf(r.sido, r.sigungu, r.roadName, bno),
    jibunKey: jibunKeyOf(r.sido, r.sigungu, r.emd, jibun),
  };
}

export class MemoryStore implements AddressStore {
  private roadIdx = new Map<string, IndexedRecord[]>();
  private jibunIdx = new Map<string, IndexedRecord[]>();
  private zipIdx = new Map<string, IndexedRecord[]>();
  private all: IndexedRecord[] = [];

  constructor(records: BuildingRecord[] = []) {
    for (const r of records) this.add(r);
  }

  add(r: BuildingRecord): void {
    const ir = indexRecord(r);
    this.all.push(ir);
    push(this.roadIdx, ir.roadKey, ir);
    push(this.jibunIdx, ir.jibunKey, ir);
    push(this.zipIdx, ir.zipcode, ir);
  }

  byRoadKey(key: string): IndexedRecord[] {
    return this.roadIdx.get(key) ?? [];
  }
  byJibunKey(key: string): IndexedRecord[] {
    return this.jibunIdx.get(key) ?? [];
  }
  byZipcode(zipcode: string): IndexedRecord[] {
    return this.zipIdx.get(zipcode) ?? [];
  }

  /** 부분/유사 매칭: 정규화 토큰이 모두 포함된 레코드(건물명 포함 검색). */
  scan(tokens: string[]): IndexedRecord[] {
    if (!tokens.length) return [];
    const needles = tokens.map((t) => t.replace(/\s+/g, "")).filter(Boolean);
    return this.all
      .filter((r) => {
        const hay = (
          r.sido +
          r.sigungu +
          r.emd +
          r.ri +
          r.roadName +
          r.buildingName
        ).replace(/\s+/g, "");
        return needles.every((n) => hay.includes(n));
      })
      .slice(0, 20);
  }

  get size(): number {
    return this.all.length;
  }
}

function push(m: Map<string, IndexedRecord[]>, key: string, r: IndexedRecord) {
  const arr = m.get(key);
  if (arr) arr.push(r);
  else m.set(key, [r]);
}
