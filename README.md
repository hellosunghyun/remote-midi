# 🎵 Remote MIDI Session

Next.js 기반의 실시간 MIDI 세션 공유 웹 애플리케이션입니다. 고유한 링크를 통해 여러 사용자가 실시간으로 MIDI 신호를 주고받을 수 있습니다.

## ✨ 주요 기능

- **세션 기반 연결**: URL 쿼리 파라미터를 통한 세션 식별 및 자동 생성
- **실시간 MIDI 전송**: Supabase Realtime을 활용한 실시간 MIDI 신호 중계
- **Web MIDI API 연동**: 물리적/가상 MIDI 장치 연결 및 제어
- **직관적 UI**: 장치 선택, 상태 표시, 활동 모니터링

## 🛠️ 기술 스택

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Realtime Broadcast + Presence)
- **API**: Web MIDI API
- **Icons**: Lucide React

## 🚀 시작하기

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

`.env.local` 파일에서 Supabase 설정을 업데이트하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📋 Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 URL과 anon key를 `.env.local`에 설정
3. Realtime 기능이 활성화되어 있는지 확인

## 🎹 사용 방법

1. 웹 애플리케이션에 접속
2. 자동으로 생성된 세션 링크를 다른 사용자와 공유
3. MIDI 초기화
4. MIDI 입력/출력 장치 선택
5. 실시간 MIDI 협업 시작!

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx          # 루트 레이아웃
│   └── page.tsx            # 메인 페이지
├── components/
│   └── MidiSession.tsx     # MIDI 세션 컴포넌트
├── hooks/
│   └── useMidiSession.ts   # MIDI 세션 커스텀 훅
└── lib/
    └── utils.ts            # 유틸리티 함수
```

## 🔧 개발 스크립트

- `pnpm dev`: 개발 서버 실행
- `pnpm build`: 프로덕션 빌드
- `pnpm start`: 프로덕션 서버 실행
- `pnpm lint`: ESLint 실행
- `pnpm type-check`: TypeScript 타입 체크

## 📝 라이선스

MIT License
