# React2Shell (CVE-2025-55182)

**우리FISA 기술세미나 - 3팀**

React Server Component(RSC)의 통신 프로토콜 설계 결함을 이용한 원격 코드 실행(RCE) 취약점, **React2Shell**에 대한 분석 및 연구 저장소입니다.

## 📌 개요 (Overview)

**React2Shell**은 React Server Component가 사용하는 통신 프로토콜(Flight Protocol)의 설계 결함으로 인해 발생하는 심각한 보안 취약점입니다. 공격자는 인증 없이 단 한 번의 HTTP 요청만으로 서버에서 임의의 코드를 원격으로 실행(RCE)할 수 있습니다.

* **CVE ID**: CVE-2025-55182
* **CVSS Score**: 10.0 (Critical)
* **Impact**: Remote Code Execution (RCE) without Authentication

## 👥 팀원 소개 (Team)

| 이름 | 역할 |
| :--- | :--- |
| **남인서** | 취약점 분석 및 메커니즘 연구 |
| **유승준** | 취약점 분석 및 메커니즘 연구 |
| **이수현** | 취약점 분석 및 메커니즘 연구 |
| **김유정** | 취약점 분석 및 메커니즘 연구 |

## 📅 타임라인 (Timeline)

* **2025.11.29**: Lachlan Davidson이 Meta Bug Bounty를 통해 최초 제보
* **2025.11.30**: Meta 보안팀 확인 및 React 팀과 협업 시작
* **2025.12.01**: 해결책 개발 및 패치 코드 작성 완료 (Vercel 등 호스팅 파트너와 검증)
* **2025.12.03**: 패치 공식 배포 (npm) 및 CVE-2025-55182 공개

## ⚔️ 공격 메커니즘 (Attack Mechanism)

React2Shell 공격은 RSC Stream의 처리 방식과 직렬화/역직렬화 과정의 허점을 파고듭니다.

### 1. 폭탄 설치 (Bomb Installation)
공격자는 `multipart/form-data` 형식을 이용해 악성 페이로드가 담긴 HTTP POST 요청을 서버로 전송합니다.
* **가짜 청크(Fake Chunk)**: Promise 객체처럼 위장한 JSON 데이터를 전송합니다. (`then`, `status`, `value` 속성 포함)
* **Payload**: `execSync('cat .env')`와 같은 악성 명령어가 포함된 Function 생성자를 Blob 데이터로 위장하여 주입합니다.

### 2. 점화 (Ignition) - Prototype Pollution
서버가 전송받은 데이터를 역직렬화하는 과정에서 **Prototype Pollution**이 발생합니다.
* 공격자는 `$1:__proto__:then`과 같은 키를 사용하여 가짜 청크의 `then` 속성을 조작합니다.
* 서버의 파싱 로직이 객체의 프로퍼티에 접근할 때, 가짜 청크가 실제 Promise처럼 동작하도록 유도합니다.

### 3. 폭탄 실행 (Detonation)
서버는 가짜 청크를 해석하면서 주입된 악성 코드를 실행합니다.
* **Blob 역직렬화**: Payload가 `Function` 생성자로 해석되어 악성 스크립트가 메모리에 로드됩니다.
* **Execution**: Promise Chain이 해결(Resolve)되는 과정에서 주입된 함수가 호출되어 서버에서 명령어가 실행됩니다.

## 🛡️ 대응 및 해결 방안 (Mitigation)

### 1. 패키지 업데이트
취약점이 해결된 최신 버전의 React 관련 패키지로 업데이트해야 합니다.

| 패키지명 | 패치 버전 |
| :--- | :--- |
| `react-server-dom-webpack` | 19.0.1 / 19.1.2 / 19.2.1 이상 |
| `react-server-dom-parcel` | 19.0.1+ |
| `react-server-dom-turbopack` | 19.0.1+ |

### 2. 프레임워크 업데이트
Next.js와 같이 RSC를 내장한 프레임워크를 사용하는 경우, 프레임워크 자체를 최신 버전으로 업그레이드해야 합니다. (예: Next.js 14.2.10+ 등)

### 3. 코드 레벨 패치 내용
React 팀은 다음과 같은 방식으로 취약점을 해결했습니다.
* **`hasOwnProperty` 체크 추가**: 객체 속성 접근 시 상속된 속성(`__proto__` 등)이 아닌 고유 속성인지 확인하는 로직 추가.
* **`busboyStream.destroy(error)` 도입**: 스트림 처리 중 에러 발생 시 즉시 소켓 연결을 종료하고 메모리 자원을 해제하도록 개선.

## ⚠️ 면책 조항 (Disclaimer)

본 저장소의 정보와 코드는 **보안 연구 및 학습 목적**으로만 제공됩니다. 악의적인 목적으로 이 정보를 사용하여 발생하는 모든 법적 책임은 사용자 본인에게 있습니다.

---
© 2026 Team 3. All Rights Reserved.
