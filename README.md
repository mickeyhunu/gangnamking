# Gangnam King

프리미엄 강남 유흥 업소를 소개하는 간단한 노드 기반 웹사이트입니다. `data/shops.json` 파일에 업소 정보를 추가하면 메인 페이지와 상세 페이지가 자동으로 업데이트됩니다.

## 설치 및 실행

```bash
npm install
npm run dev
```

> ⚠️ 만약 패키지 설치가 제한된 환경이라면 `express`와 `ejs`를 수동으로 설치하거나, 패키지 설치가 허용된 환경에서 실행해주세요.

서버는 기본적으로 `http://localhost:3000` 에서 실행됩니다.

## 로깅

- 모든 HTTP 요청은 `data/request_logs.jsonl` 파일에 JSON Lines 형태로 저장됩니다. 각 라인은 요청 시각, IP, User-Agent,
  HTTP 메서드/경로, 동일 IP에서 반복 호출되었는지를 포함하므로 무단 크롤링 근거 자료로 보관할 수 있습니다.

## Cloudflare Bot 차단

- Cloudflare Bot Management(또는 Super Bot Fight Mode)에서 전달되는 헤더를 기반으로 봇 요청을 차단합니다.
- 기본 동작:
  - `cf-verified-bot: true` 는 허용합니다(검색 엔진 등).
  - `cf-client-bot: true` 이거나 `cf-bot-score`가 임계값 이하이면 403으로 차단합니다.
- 환경 변수:
  - `CF_BOT_BLOCK_ENABLED=true|false` (기본값: true)
  - `CF_BOT_ALLOW_VERIFIED=true|false` (기본값: true)
  - `CF_BOT_SCORE_THRESHOLD=숫자` (기본값: 30)

## 보호된 출근부 API

- `GET /shops/:id/entries.json` 엔드포인트는 토큰·세션 기반 인증이 필요합니다. `PROTECTED_ENTRY_TOKENS` 환경 변수에 콤마로 구분된 토큰 목록을 설정하고,
  클라이언트는 `Authorization: Bearer <token>` 헤더(또는 `token` 쿼리 파라미터, `SESSION_COOKIE_NAME` 쿠키)를 포함해야 합니다.
- 허용되지 않은 요청은 401(미인증) 또는 403(권한 없음) 상태 코드로 거부되며 JSON 본문을 반환하지 않습니다.
- 토큰을 하나도 설정하지 않으면 기본적으로 로컬/사설망(127.0.0.1, 10.x, 192.168.x, 172.16–31)에서 들어오는 요청만 통과합니다.
  외부 공개가 필요하면 토큰을 설정하거나, 환경 변수 `PROTECTED_ENTRY_ALLOW_LOCAL_BYPASS=false`로 로컬 우회를 차단하세요.
- `config/reverse-proxy.conf` 파일에는 Nginx/Apache에서 동일 경로를 차단하는 2중 방어 예시가 포함되어 있습니다.

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
