# Gangnam King

프리미엄 강남 유흥 업소를 소개하는 간단한 노드 기반 웹사이트입니다. `data/shops.json` 파일에 업소 정보를 추가하면 메인 페이지와 상세 페이지가 자동으로 업데이트됩니다.

## 설치 및 실행

```bash
npm install
npm run dev
```

> ⚠️ 만약 패키지 설치가 제한된 환경이라면 `express`와 `ejs`를 수동으로 설치하거나, 패키지 설치가 허용된 환경에서 실행해주세요.

서버는 기본적으로 `http://localhost:3000` 에서 실행됩니다.

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
