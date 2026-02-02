업로드해주신 발표 자료(PDF)의 목차(Contents) 흐름에 맞춰 `README.md`를 재구성했습니다.

발표 흐름인 **[개요 - 공격 메커니즘 - 영향 - 프론트엔드 보안 책임]** 순서로 내용을 전개하여, 세미나의 스토리라인이 그대로 드러나도록 작성했습니다.

---

# React2Shell (CVE-2025-55182)

> **우리FISA 기술세미나 - 3팀**
> React Server Component(RSC)의 설계 결함을 이용한 원격 코드 실행(RCE) 취약점, **React2Shell** 분석 및 연구 저장소입니다.

## 👥 Team

| 남인서 | 유승준 | 이수현 | 김유정 |
| --- | --- | --- | --- |
| Analysis | Research | Research | Presentation |

---

## 📑 목차 (Contents)

1. [개요: React2Shell이란?](https://www.google.com/search?q=%2301-%EA%B0%9C%EC%9A%94-react2shell%EC%9D%B4%EB%9E%80)
2. [React2Shell 공격 메커니즘](https://www.google.com/search?q=%2302-react2shell-%EA%B3%B5%EA%B2%A9-%EB%A9%94%EC%BB%A4%EB%8B%88%EC%A6%98)
3. [React2Shell이 미친 영향](https://www.google.com/search?q=%2303-react2shell%EC%9D%B4-%EB%AF%B8%EC%B9%9C-%EC%98%81%ED%96%A5)
4. [프론트엔드에서의 보안 책임](https://www.google.com/search?q=%2304-%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C%EC%97%90%EC%84%9C%EC%9D%98-%EB%B3%B4%EC%95%88-%EC%B1%85%EC%9E%84)

---

## 01. 개요: React2Shell이란?

**React2Shell**(CVE-2025-55182)은 React Server Component(RSC)가 사용하는 **Flight Protocol**의 통신 과정에서 발견된 치명적인 보안 취약점입니다.

* **핵심 문제**: 공격자가 인증 없이(Unauthenticated) 단 한 번의 HTTP 요청으로 서버 내부 명령어를 실행할 수 있습니다.
* **심각도**: CVSS Score **10.0 (Critical)**
* **발생 원인**: 신뢰할 수 없는 데이터의 역직렬화(Deserialization) 과정에서 발생한 Prototype Pollution

### 📅 Timeline

* **2025.11.29**: Meta Bug Bounty를 통해 최초 제보
* **2025.11.30**: 보안팀 확인 및 핫라인 가동
* **2025.12.01**: 패치 코드 개발 및 파트너사(Vercel 등) 검증
* **2025.12.03**: 패치 배포 및 CVE 공개

---

## 02. React2Shell 공격 메커니즘

공격은 크게 **폭탄 설치(Payload 전송) → 점화(Prototype Pollution) → 폭발(RCE 실행)**의 3단계로 이루어집니다.

### 1) 폭탄 설치 (Bomb Installation)

공격자는 `multipart/form-data` 요청을 통해 조작된 JSON 데이터를 서버로 전송합니다. 이때 일반적인 데이터가 아닌 **Promise 객체처럼 위장한 가짜 청크(Fake Chunk)**를 포함시킵니다.

### 2) 점화 (Ignition)

서버가 데이터를 해석(Parsing)하는 과정에서 **Prototype Pollution**이 발생합니다.

```javascript
// 공격자가 전송한 페이로드 예시
{
  "$1": "__proto__",
  "then": { ... } // 객체의 프로토타입을 오염시켜 Promise처럼 동작하게 유도
}

```

### 3) 폭발 (Detonation)

서버는 오염된 객체를 처리하며 공격자가 주입한 악성 함수(Blob)를 실행하게 되고, 결과적으로 서버의 쉘(Shell) 권한이 탈취됩니다.

---

## 03. React2Shell이 미친 영향

이 취약점은 단순한 라이브러리 버그를 넘어 모던 웹 생태계 전반에 큰 파장을 일으켰습니다.

* **서버 컴포넌트 신뢰도 타격**: "프론트엔드 프레임워크가 서버 보안까지 책임져야 하는가?"에 대한 논의 촉발
* **호스팅 플랫폼 비상**: Vercel, Netlify 등 RSC를 지원하는 주요 PaaS 업체들의 긴급 보안 패치 진행
* **보안 프로세스 강화**: 오픈소스 생태계에서 '직렬화(Serialization)' 로직에 대한 보안 감수가 필수 절차로 자리 잡음

---

## 04. 프론트엔드에서의 보안 책임

React2Shell 사태는 **"프론트엔드 개발자도 서버 보안을 이해해야 한다"**는 교훈을 남겼습니다.

### 🛡️ 대응 방안 (Mitigation)

1. **의존성 업데이트**: `react-server-dom-webpack` 등 관련 패키지를 즉시 최신 버전(19.0.1+ 등)으로 업데이트
2. **입력 값 검증**: 서버로 전달되는 스트림 데이터에 대한 엄격한 타입 체크 및 살균(Sanitization)
3. **보안 의식 제고**: Next.js와 같은 풀스택 프레임워크 사용 시, 클라이언트-서버 경계에서 발생할 수 있는 취약점에 대한 지속적인 학습 필요

> **Conclusion**
> 기술의 발전으로 프론트엔드와 백엔드의 경계가 희미해진 만큼, 보안에 대한 책임의 범위 또한 넓어졌음을 인지해야 합니다.

---

© 2026 Team 3. All Rights Reserved.
