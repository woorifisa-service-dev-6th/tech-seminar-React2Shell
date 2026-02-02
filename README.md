# React2Shell (CVE-2025-55182)

[![CVE](https://img.shields.io/badge/CVE-2025--55182-Critical-red)](https://cve.mitre.org/)
[![CVSS](https://img.shields.io/badge/CVSS-10.0-black)](https://nvd.nist.gov/)
[![React](https://img.shields.io/badge/React-Server%20Components-61DAFB?logo=react)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

> **우리FISA 기술세미나 - 3팀**
>
> React Server Component(RSC)의 Flight Protocol 설계 결함을 악용한 **원격 코드 실행(RCE)** 취약점 분석 및 연구 저장소입니다.

## 📖 목차 (Table of Contents)
- [📌 개요](#-개요-overview)
- [👥 팀원 소개](#-팀원-소개-team)
- [📅 타임라인](#-타임라인-timeline)
- [⚔️ 기술적 분석 & 공격 메커니즘](#-기술적-분석--공격-메커니즘-technical-analysis)
- [🛡️ 대응 및 패치 코드](#-대응-및-패치-코드-mitigation--patch)
- [⚠️ 면책 조항](#-면책-조항-disclaimer)

---

## 📌 개요 (Overview)

**React2Shell**은 React Server Component(RSC)가 클라이언트와 서버 간 상태를 동기화하기 위해 사용하는 **Flight Protocol**의 직렬화(Serialization) 과정에서 발생하는 치명적인 보안 취약점입니다.

공격자는 조작된 직렬화 스트림을 서버로 전송함으로써, **인증 절차 없이(Unauthenticated)** 서버 내부에서 임의의 시스템 명령어를 실행할 수 있습니다.

* **Vulnerability Type**: Deserialization of Untrusted Data / Prototype Pollution
* **Affected Components**: `react-server-dom-webpack`, `react-server-dom-parcel` 등
* **Severity**: Critical (CVSS Score 10.0)

---

## 👥 팀원 소개 (Team)

| Member | Role | GitHub |
| :--- | :--- | :--- |
| **남인서** | 🛡️ Vulnerability Analysis & Research | [@user](https://github.com/) |
| **유승준** | 🛡️ Vulnerability Analysis & Research | [@user](https://github.com/) |
| **이수현** | 🛡️ Vulnerability Analysis & Research | [@user](https://github.com/) |
| **김유정** | 🛡️ Vulnerability Analysis & Research | [@user](https://github.com/) |

---

## 📅 타임라인 (Timeline)

- **2025.11.29**: 🚩 Lachlan Davidson, Meta Bug Bounty를 통해 최초 제보
- **2025.11.30**: 🔍 Meta 보안팀 취약점 확인 및 React Core 팀 핫라인 가동
- **2025.12.01**: 🛠️ 패치 코드 개발 완료 및 Vercel 등 호스팅 파트너사 검증 진행
- **2025.12.03**: 🚀 **Patch Released** (npm 배포) 및 CVE-2025-55182 공개

---

## ⚔️ 기술적 분석 & 공격 메커니즘 (Technical Analysis)

본 취약점은 RSC Stream 처리 과정에서의 **Prototype Pollution**과 **Unsafe Deserialization**이 결합되어 발생합니다.



### 1. The Payload Structure (Bomb Installation)
공격자는 `multipart/form-data` 요청을 통해 서버의 스트림 파서가 오작동하도록 유도하는 특수 페이로드를 전송합니다.

```http
POST /rsc/action HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary
Content-Disposition: form-data; name="1_payload"

{"$1": "__proto__", "then": {"status": "fulfilled", "value": "...malicious_blob..."}}
------WebKitFormBoundary--
