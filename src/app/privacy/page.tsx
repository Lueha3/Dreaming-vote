import Link from "next/link";

/**
 * 개인정보처리방침 — 로그인 없이도 접근 가능한 공개 페이지.
 * /join 가입 폼의 동의 체크박스, Header 메뉴에서 링크한다.
 * 내용은 반드시 실제 처리 현황(prisma/schema.prisma User 모델 등)과 맞춰 최신화할 것.
 */
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="text-center">
        <span className="mb-2 inline-block text-[11px] font-extrabold tracking-widest text-teal-ink uppercase">
          동아리드림
        </span>
        <h1 className="mb-2 text-2xl font-extrabold text-ink sm:text-3xl">
          <span className="gradient-text">개인정보처리방침</span>
        </h1>
        <p className="mx-auto max-w-[42ch] text-sm leading-relaxed text-ink-soft">
          꿈꾸는교회 청년부(이하 &quot;교회&quot;)는 동아리드림 서비스 이용자의 개인정보를
          소중히 다루며, 아래와 같이 개인정보를 처리합니다.
        </p>
        <p className="mt-2 text-xs text-ink-faint">시행일: 2026년 9월 8일</p>
      </div>

      <div className="mt-8 space-y-7">
        <Section icon="📋" title="1. 수집하는 개인정보 항목">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-ink">가입 신청 시</strong> — 이름, 나이, 성별, 소속 꿈터,
              전화번호
            </li>
            <li>
              <strong className="text-ink">로그인 시</strong> — 구글 계정 식별자(이메일), 프로필
              사진
            </li>
            <li>
              <strong className="text-ink">프로필 설정 시(선택)</strong> — 생일(월/일, 연도는
              수집하지 않음), 프로필 사진
            </li>
            <li>
              <strong className="text-ink">서비스 이용 중 자동 생성</strong> — 동아리·모임
              가입/신청 내역, 작성한 게시글·댓글·기도제목·후기·사진, 알림 수신 이력
            </li>
            <li>
              <strong className="text-ink">알림 수신 동의 시(선택)</strong> — 휴대폰 푸시 알림
              구독 정보(브라우저가 발급하는 기기별 식별자)
            </li>
          </ul>
        </Section>

        <Section icon="🎯" title="2. 개인정보 수집 및 이용 목적">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>청년부 회원 확인 및 가입 승인 심사</li>
            <li>동아리·모임 운영 지원(참석 관리, 공지 전달 등)</li>
            <li>생일 축하 카드 등 공동체 활동 지원</li>
            <li>댓글·모임 공지 등 새 소식 알림 발송</li>
            <li>부정 이용 방지 및 게시물 신고 처리</li>
          </ul>
        </Section>

        <Section icon="🗓️" title="3. 보유 및 이용 기간">
          <p>
            원칙적으로 개인정보 수집·이용 목적이 달성되면 지체 없이 파기합니다. 회원이
            탈퇴하면 계정 및 개인정보는 즉시 비활성화되며, 재가입 시에도 이전 정보가
            복원되지 않습니다. 다만 부정 이용 방지 등을 위해 필요한 최소한의 기록은
            관계 법령에서 정한 기간 동안 보관될 수 있습니다.
          </p>
        </Section>

        <Section icon="🤝" title="4. 개인정보의 제3자 제공">
          <p>
            교회는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 법령에
            근거가 있거나 이용자가 별도로 동의한 경우에는 예외로 합니다.
          </p>
        </Section>

        <Section icon="🛠️" title="5. 개인정보 처리 위탁">
          <p className="mb-2">
            서비스 운영을 위해 아래 업체에 개인정보 처리를 위탁하고 있습니다.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-ink">Supabase</strong> — 로그인 인증, 데이터베이스,
              사진·파일 저장
            </li>
            <li>
              <strong className="text-ink">Vercel</strong> — 서비스 호스팅
            </li>
            <li>
              <strong className="text-ink">웹 푸시 알림 서비스(브라우저 제공)</strong> — 알림
              발송(구글·애플 등 각 브라우저 제조사의 푸시 서비스 경유)
            </li>
          </ul>
        </Section>

        <Section icon="🔒" title="6. 개인정보의 파기 절차 및 방법">
          <p>
            파기 사유가 발생한 개인정보는 데이터베이스에서 삭제하는 방식으로 처리하며,
            전자적 파일 형태의 정보는 복구할 수 없는 방법으로 영구 삭제합니다.
          </p>
        </Section>

        <Section icon="🙋" title="7. 정보주체의 권리">
          <p>
            이용자는 언제든지 본인의 개인정보를 열람·정정·삭제하거나 처리 정지를
            요청할 수 있습니다. 요청은 프로필 화면 또는 아래{" "}
            <Link href="/support" className="font-semibold text-teal-ink underline underline-offset-2">
              문의하기
            </Link>
            를 통해 접수해주시면 지체 없이 처리해드립니다.
          </p>
        </Section>

        <Section icon="👶" title="8. 만 14세 미만 아동의 개인정보">
          <p>
            동아리드림은 청년부(만 20세 이상) 전용 서비스로, 만 14세 미만 아동을 대상으로
            하지 않으며 해당 정보를 의도적으로 수집하지 않습니다.
          </p>
        </Section>

        <Section icon="📮" title="9. 문의처">
          <p>
            개인정보 관련 문의는{" "}
            <Link href="/support" className="font-semibold text-teal-ink underline underline-offset-2">
              /support 문의하기
            </Link>
            를 이용해주세요. 운영진이 확인 후 답변드립니다.
          </p>
        </Section>

        <Section icon="📝" title="10. 개인정보처리방침 변경">
          <p>
            이 방침은 서비스 내용 변경 등에 따라 수정될 수 있으며, 변경 시 이 페이지를 통해
            공지합니다.
          </p>
        </Section>
      </div>

      <p className="mt-10 text-center text-xs text-ink-faint">꿈꾸는교회 청년부 · 동아리드림</p>
    </div>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
        <span className="text-base">{icon}</span>
        {title}
      </h2>
      <div className="space-y-2 text-sm leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}
