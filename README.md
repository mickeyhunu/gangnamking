# Gangnam King

프리미엄 강남 유흥 업소를 소개하는 간단한 노드 기반 웹사이트입니다. `data/shops.json` 파일에 업소 정보를 추가하면 메인 페이지와 상세 페이지가 자동으로 업데이트됩니다.

## 설치 및 실행

```bash
npm install
npm run dev
```

> ⚠️ 만약 패키지 설치가 제한된 환경이라면 `express`와 `ejs`를 수동으로 설치하거나, 패키지 설치가 허용된 환경에서 실행해주세요.

서버는 기본적으로 `http://localhost:3000` 에서 실행됩니다.

## 로깅과 차단

- 모든 HTTP 요청은 `data/request_logs.jsonl` 파일에 JSON Lines 형태로 저장됩니다. 각 라인은 요청 시각, IP, User-Agent,
  HTTP 메서드/경로, 동일 IP에서 반복 호출되었는지를 포함하므로 무단 크롤링 근거 자료로 보관할 수 있습니다.
- 무단 크롤링으로 판별된 IP는 `data/blocked_ips.json` 파일(문자열 배열 형태)에 추가하면 됩니다. 서버가 파일을 자동으로 생성하고
  로드하며, 차단된 IP에서 요청이 들어오면 403 응답으로 즉시 거부됩니다. IP 전체 대역을 막고 싶다면 와일드카드(`*`)를 사용할 수
  있습니다. 예: `"3.34.*"` 또는 `"3.36.*"`.
- 요청 속도가 비정상적으로 빠른 IP는 자동으로 rate limit(기본 60초 동안 30회) 되며, 제한을 3회 이상 반복 초과하면 5분 내에서 `blocked_ips.json`
  에 자동 추가되어 장기 차단됩니다. 필요 시 `ABUSE_RATE_LIMIT_*` 및 `ABUSE_AUTO_BLOCK_*` 환경 변수를 이용해 기준을 조정할 수 있습니다.
- 광고 심사 등 일시적으로 모든 차단을 해제해야 할 때는 환경 변수 `SECURITY_GUARDS_ENABLED=false`를 설정하세요. CORS, IP 차단, 자동 차단
  미들웨어가 모두 건너뛰어져 누구나 접근할 수 있게 됩니다(요청 로깅은 계속 동작).

## 보호된 출근부 API

- `GET /shops/:id/entries.json` 엔드포인트는 토큰·세션 기반 인증이 필요합니다. `PROTECTED_ENTRY_TOKENS` 환경 변수에 콤마로 구분된 토큰 목록을 설정하고,
  클라이언트는 `Authorization: Bearer <token>` 헤더(또는 `token` 쿼리 파라미터, `SESSION_COOKIE_NAME` 쿠키)를 포함해야 합니다.
- 허용되지 않은 요청은 401(미인증) 또는 403(권한 없음) 상태 코드로 거부되며 JSON 본문을 반환하지 않습니다.
- 토큰을 하나도 설정하지 않으면 기본적으로 로컬/사설망(127.0.0.1, 10.x, 192.168.x, 172.16–31)에서 들어오는 요청만 통과합니다.
  외부 공개가 필요하면 토큰을 설정하거나, 환경 변수 `PROTECTED_ENTRY_ALLOW_LOCAL_BYPASS=false`로 로컬 우회를 차단하세요.
- `config/reverse-proxy.conf` 파일에는 Nginx/Apache에서 동일 경로를 차단하는 2중 방어 예시가 포함되어 있습니다.
- 출근부 섹션의 데이터 호출을 늦추고 싶다면 `ENTRY_LOAD_DELAY_SECONDS` 환경 변수에 원하는 지연 시간을 초 단위로 지정하세요.

## CORS 및 WAF

- `CORS_ALLOWED_ORIGINS` 환경 변수에 허용할 Origin을 콤마로 지정하면 해당 도메인만 CORS 요청이 통과합니다(와일드카드 `*` 지원).
- User-Agent가 누락되었거나 크롤러 패턴을 포함하는 경우, 또는 짧은 시간 동안 `/shops/*/entries.json`을 과도하게 호출하는 경우 WAF와 rate limiter가 403/429로 차단합니다.
- 민감한 출근부 데이터는 서버에서 HTML에 선렌더링되므로, 정상 사용자는 추가 JSON 호출 없이도 페이지 내에서 즉시 확인할 수 있습니다.

## 데이터 구조

`data/shops.json` 파일은 다음과 같은 구조의 배열입니다.

```json
[
  {
    "id": "고유한 슬러그",
    "name": "상호명",
    "area": "지역(예: 강남)",
    "category": "업종(예: 라운지바)",
    "address": "주소",
    "phone": "전화번호",
    "hours": "영업시간",
    "description": "짧은 설명",
    "highlights": ["특장점1", "특장점2"],
    "image": "/images/파일명.svg"
  }
]
```

새로운 업소를 추가할 때는 `public/images` 폴더에 이미지 파일을 저장하고 `image` 경로를 맞춰주세요. `shops.json` 파일이 변경되면 서버가 자동으로 데이터를 다시 로드합니다.
