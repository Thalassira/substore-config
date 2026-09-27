const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadMain(filename) {
  const context = vm.createContext({ console: { log() {} } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'scripts', filename), 'utf8'), context);
  return context.main;
}

const original = loadMain('mihomo-clash-party.js');
const preserve = loadMain('mihomo-clash-party-preserve-dns.js');
for (const dns of [undefined, { enable: false }, {
  enable: true,
  'nameserver-policy': { '+.example.com': ['https://dns.example.com/dns-query'] },
  'proxy-server-nameserver': ['223.5.5.5']
}]) {
  const input = { proxies: [{ name: '香港测试', type: 'socks5', server: '127.0.0.1', port: 1080 }] };
  if (dns !== undefined) input.dns = dns;
  const before = JSON.stringify(input.dns);
  const expected = original(JSON.parse(JSON.stringify(input)));
  const actual = preserve(input);
  assert.strictEqual(actual.dns, dns);
  assert.equal(JSON.stringify(actual.dns), before);
  assert.equal(Object.hasOwn(actual, 'dns'), dns !== undefined);
  delete expected.dns;
  const otherFields = { ...actual };
  delete otherFields.dns;
  assert.deepEqual(JSON.parse(JSON.stringify(otherFields)), JSON.parse(JSON.stringify(expected)));
}
const official = fs.readFileSync(path.join(__dirname, '狗狗加速', '官方.txt'), 'utf8');
const policyLine = official.split(/\r?\n/).find(line => line.includes('nameserver-policy:'));
const officialServers = [...new Set([...policyLine.matchAll(/'([^']+)'/g)].map(match => match[1]))];
assert.equal(officialServers.length, 2);
for (const server of ['hk.quandao.com', 'QUANDAO.COM.', 'hk.jiandaoyun.com', 'quandao.com.example.org', 'notquandao.com']) {
  const input = { proxies: [{ name: '任意改名', type: 'socks5', server, port: 1080 }] };
  const expected = original(JSON.parse(JSON.stringify(input)));
  const actual = preserve(input);
  const shouldAdd = !['quandao.com.example.org', 'notquandao.com'].includes(server);
  assert.equal(Object.hasOwn(actual, 'dns'), shouldAdd);
  if (shouldAdd) {
    assert.equal(actual.dns.enable, true);
    for (const domain of ['+.quandao.com', '+.jiandaoyun.com']) {
      // Compare without printing private addresses on failure.
      assert.ok(JSON.stringify(actual.dns['nameserver-policy'][domain]) === JSON.stringify(officialServers), 'Official DNS mismatch');
    }
    const existing = { enable: false, nameserver: ['223.5.5.5'] };
    const existingBefore = JSON.stringify(existing);
    const kept = preserve({ proxies: [{ name: '测试', type: 'socks5', server, port: 1080 }], dns: existing });
    assert.strictEqual(kept.dns, existing);
    assert.equal(JSON.stringify(kept.dns), existingBefore);
  }
  delete actual.dns;
  delete expected.dns;
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)));
}
console.log('PASS: existing DNS preserved, private DNS matches official input, domain boundaries checked, other output unchanged.');
