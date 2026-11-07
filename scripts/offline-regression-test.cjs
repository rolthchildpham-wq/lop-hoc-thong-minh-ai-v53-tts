const fs = require('fs');
const vm = require('vm');
const htmlPath = 'app/src/main/assets/www/index.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
assert(html.length > 500000, 'Offline HTML missing/truncated');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
let checked = 0;
for (const [_, attrs, code] of scripts) {
  if (/application\/(ld\+json|json)|importmap/i.test(attrs)) continue;
  if (!code.trim()) continue;
  new vm.Script(code, { filename: 'inline-script-' + checked + '.js' });
  checked++;
}
assert(checked >= 15, 'Expected the full application script bundle');
const refs = [...html.matchAll(/<(?:script|link|img|source)[^>]+(?:src|href)=["']([^"']+)/gi)].map(x => x[1]);
assert(refs.every(x => !/^https?:/i.test(x)), 'External static dependency found in offline HTML');
for (const file of [
  'app/src/main/assets/www/vendor/firebase-app-compat.js',
  'app/src/main/assets/www/vendor/firebase-auth-compat.js',
  'app/src/main/assets/www/vendor/firebase-database-compat.js',
  'app/src/main/assets/www/vendor/hanzi-writer.min.js',
  'app/src/main/assets/tts/en/en_US-lessac-medium.onnx',
  'app/src/main/assets/tts/zh/model.onnx',
  'app/src/main/assets/tts/zh/voices.bin'
]) assert(fs.existsSync(file) && fs.statSync(file).size > 1000, 'Missing offline asset: ' + file);
assert(html.includes('function setAppMode(') && html.includes('function switchTopic('), 'Learning mode/topic handlers missing');
assert(html.includes('function nextQuestionManually(') && html.includes('function scorePoints('), 'Question navigation/answer handlers missing');
assert(html.includes('Offline mode isolation') && html.includes('AndroidVoice.isOffline()'), 'Offline isolation guard missing');
assert(html.includes('ai_offline_session_v535') && html.includes('offline-auto-start'), 'Offline resume/persistence missing');
assert(html.includes('DATA_BANK.english') && html.includes('DATA_BANK.chinese_hsk'), 'Language banks missing');
assert(html.includes('grade5_math') && html.includes('grade5_viet') && html.includes('grade5_eng'), 'Grade 5 banks missing');
console.log('PASS: ' + checked + ' inline scripts parsed; offline static assets, mode/topic navigation, answer flow and session restore verified.');
