const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 5001,
  path: '/api/gym/all',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer super_admin_dummy_token'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`BODY: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
