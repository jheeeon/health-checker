# Data Model

## 문서 목적

이 문서는 `health-checker` MVP에서 사용할 Supabase 기반 데이터 모델 초안을 정의한다.

목표는 다음과 같다.

- 어떤 데이터를 원격 저장소에 저장하는지 명확히 한다.
- 정적 웹페이지와 Supabase의 책임 경계를 정한다.
- 첫 구현에 필요한 최소 테이블과 필드를 고정한다.

## 설계 원칙

- 운동 프로그램 원문은 우선 프론트엔드 코드에 포함한다.
- 사용자 진행 상태와 기록만 Supabase에 저장한다.
- 첫 버전은 단일 사용자를 가정한다.
- 보안은 첫 버전에서 우선순위가 낮으며, public read/write 정책을 허용할 수 있다.
- 나중에 로그인 또는 사용자별 데이터를 붙일 수 있도록 필드 이름은 확장 가능하게 둔다.

## 외부 데이터와 내부 데이터의 경계

### 프론트엔드 코드에 포함하는 것

- 7일 운동 프로그램 제목
- 날짜별 운동 항목
- 날짜별 안내 문구
- 체크 항목 정의
- UI 표시용 라벨

### Supabase에 저장하는 것

- 날짜별 체크 상태
- 날짜별 회복 기록
- 자유 메모
- 마지막 갱신 시각
- 프로그램 시작일

## 권장 테이블

### 1. app_state

목적:

- 현재 프로그램의 기준 시작일과 전역 상태를 저장한다.

권장 필드:

- `id: text`
  - 단일 레코드 식별자
  - 초기값은 `default`
- `program_start_date: date`
  - 1일차로 계산할 기준 날짜
- `updated_at: timestamptz`

권장 제약:

- `id`는 primary key
- MVP에서는 레코드 1개만 사용

메모:

- `program_start_date`가 없으면 최초 접속일을 기준으로 생성한다.
- 프로그램을 다시 시작하는 기능이 필요해지면 이 값을 갱신한다.

### 2. daily_logs

목적:

- 각 일차의 체크 상태와 회복 기록을 저장한다.

권장 필드:

- `day_index: integer`
  - 1부터 7까지의 일차
- `log_date: date`
  - 해당 일차가 실제로 대응되는 날짜
- `checked_items: jsonb`
  - 체크 항목별 완료 여부
  - 예: `{ "water": true, "walk": false }`
- `fatigue_score: integer`
  - 피로감
  - 1부터 5까지 권장
- `focus_score: integer`
  - 집중력
  - 1부터 5까지 권장
- `sleep_score: integer`
  - 잠의 질
  - 1부터 5까지 권장
- `stability_score: integer`
  - 몸의 안정감
  - 1부터 5까지 권장
- `memo: text`
  - 자유 기록
- `updated_at: timestamptz`

권장 제약:

- `day_index`는 primary key 또는 unique
- `day_index`는 1 이상 7 이하

메모:

- MVP에서는 한 프로그램에 7개 레코드만 있으면 충분하다.
- `checked_items`를 `jsonb`로 두면 운동 항목 이름이 바뀌어도 마이그레이션 부담이 작다.

## 권장 SQL 초안

```sql
create table app_state (
  id text primary key,
  program_start_date date not null,
  updated_at timestamptz not null default now()
);

create table daily_logs (
  day_index integer primary key check (day_index between 1 and 7),
  log_date date not null,
  checked_items jsonb not null default '{}'::jsonb,
  fatigue_score integer check (fatigue_score between 1 and 5),
  focus_score integer check (focus_score between 1 and 5),
  sleep_score integer check (sleep_score between 1 and 5),
  stability_score integer check (stability_score between 1 and 5),
  memo text not null default '',
  updated_at timestamptz not null default now()
);
```

## 저장 시나리오

### 최초 접속

1. `app_state`의 `default` 레코드를 조회한다.
2. 없으면 오늘 날짜를 `program_start_date`로 생성한다.
3. `daily_logs` 1일부터 7일까지 레코드가 없으면 생성한다.
4. 화면은 `program_start_date` 기준으로 오늘 일차를 계산한다.

### 체크 항목 변경

1. 사용자가 체크박스를 변경한다.
2. 현재 일차의 `checked_items`를 갱신한다.
3. `updated_at`을 현재 시각으로 갱신한다.
4. 저장 성공/실패 상태를 UI에 표시한다.

### 회복 기록 변경

1. 사용자가 점수 또는 메모를 입력한다.
2. 해당 필드를 `daily_logs`에 저장한다.
3. 입력 중 과도한 저장을 피하기 위해 debounce를 적용할 수 있다.

### 프로그램 다시 시작

MVP에서는 제외한다.

후속 기능으로 추가할 경우:

1. 사용자 확인을 받는다.
2. `program_start_date`를 새 날짜로 갱신한다.
3. 기존 `daily_logs`를 초기화하거나 별도 히스토리로 보관한다.

## 보안 메모

첫 버전은 퍼블릭 사용을 가정하므로 Supabase anon key가 브라우저에 노출된다.

허용 가능한 초기 정책:

- 누구나 `app_state` 읽기/쓰기 가능
- 누구나 `daily_logs` 읽기/쓰기 가능

주의:

- URL과 Supabase 설정을 아는 사람은 데이터를 수정할 수 있다.
- 개인 건강 기록을 민감 정보로 다루고 싶어지는 시점에는 로그인과 RLS 정책을 다시 설계해야 한다.

