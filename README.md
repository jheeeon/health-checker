# Health Checker

개인용 7일 운동 회복 체크 웹페이지입니다.

목표는 운동 강도를 높이는 것이 아니라, 매일의 회복 상태와 최소한의 움직임을 기록하면서 `다시 반복할 수 있는 생활 리듬`을 확인하는 것입니다.

## Project Goal

- 한 장짜리 반응형 웹페이지로 만든다.
- GitHub Pages에 정적 페이지로 배포한다.
- 체크 상태와 회복 기록은 Supabase에 저장한다.
- 같은 URL을 여러 기기에서 열어도 동일한 진행 상태를 볼 수 있게 한다.
- 첫 버전은 로그인과 보안보다 빠른 개인 실사용 검증을 우선한다.

## Planned Stack

- Hosting: GitHub Pages
- Frontend: HTML, CSS, JavaScript
- Remote sync: Supabase
- Auth: none for MVP

## Local Preview

정적 파일만 사용하는 프로젝트라 별도 빌드 없이 로컬에서 확인할 수 있습니다.

```sh
python3 -m http.server 4173
```

그 다음 브라우저에서 `http://localhost:4173`을 엽니다.

## GitHub Pages Deployment

GitHub Pages는 저장소의 정적 파일을 그대로 서빙합니다.

권장 설정:

- Repository root에 `index.html`, `styles.css`, `app.js`, `config.js`를 둔다.
- GitHub repository Settings > Pages로 이동한다.
- Source는 `Deploy from a branch`를 선택한다.
- Branch는 `main`, folder는 `/root`를 선택한다.
- 배포 후 표시되는 Pages URL로 접속한다.

Supabase 동기화를 켜려면 `config.js`의 값을 실제 프로젝트 값으로 바꿉니다.

```js
window.HEALTH_CHECKER_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_ID.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY"
};
```

첫 버전은 퍼블릭 사용을 가정하므로 `config.js`는 GitHub Pages에 함께 배포합니다.

## Docs

프로젝트 문서는 `docs` 폴더에 있습니다.

- [REQUIREMENTS.md](docs/REQUIREMENTS.md): MVP 요구사항, 포함 범위, 제외 범위, 완료 기준
- [DATA_MODEL.md](docs/DATA_MODEL.md): Supabase 테이블 구조, 저장 데이터, 초기 SQL 초안
- [SCREEN_FLOW.md](docs/SCREEN_FLOW.md): 한 장짜리 페이지의 영역 구성과 사용자 흐름
- [DECISIONS.md](docs/DECISIONS.md): 배포, 동기화, 보안 수준 등 확정된 의사결정
- [QA_TEST_SCENARIOS.md](docs/QA_TEST_SCENARIOS.md): 수동 검증 시나리오와 기대 결과

## Current Scope

MVP에서는 아래 기능만 우선 구현합니다.

- 7일 운동 프로그램 표시
- 날짜별 체크 상태 저장
- 회복 점수와 메모 저장
- Supabase 기반 기기 간 동기화
- 모바일/데스크톱 반응형 화면
- 저장 중/저장 완료/저장 실패 상태 표시

아래 기능은 후속 범위로 둡니다.

- 로그인
- 사용자별 데이터 분리
- 프로그램 리셋
- 장기 통계
- 알림
- 캘린더 연동
