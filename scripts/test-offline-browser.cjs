const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + (e.stack || e.message)));
  page.on('console', msg => { if (msg.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|Failed to load resource/i.test(msg.text())) errors.push('console: ' + msg.text()); });
  await page.addInitScript(() => {
    window.AndroidVoice = {
      isOffline: () => true, modeLabel: () => 'OFFLINE',
      speak: () => {}, cancel: () => {}, isReady: () => true,
      hasEnglish: () => true, hasChinese: () => true, installVoices: () => {},
      readAssetText: () => null
    };
  });
  await page.context().setOffline(true);
  const file = path.resolve('app/src/main/assets/www/index.html');
  await page.goto(pathToFileURL(file).href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const startup = await page.evaluate(() => ({
    appMode: window.appMode, sub: window.currentSubCategory,
    solo: typeof isSolo !== 'undefined' ? isSolo : null,
    hasQuestion: !!currentItem,
    title: document.title
  }));
  if (!startup.hasQuestion) throw new Error('Offline auto-start did not render a question: ' + JSON.stringify(startup));

  const modes = [
    ['english', 'A1'], ['english', 'A2'], ['english', 'B1'], ['english', 'B2'], ['english', 'C1'],
    ['chinese_hsk', 1], ['chinese_hsk', 2], ['chinese_hsk', 3], ['chinese_hsk', 4], ['chinese_hsk', 5], ['chinese_hsk', 6],
    ['grade5_math', 'M1'], ['grade5_viet', 'V1'], ['grade5_eng', 'E1']
  ];
  const results = [];
  for (const [mode, sub] of modes) {
    const result = await page.evaluate(({mode, sub}) => {
      setAppMode(mode, sub, 'offline-test');
      const item = currentItem;
      const before = questionIndex;
      nextQuestionManually();
      return {
        mode: appMode, sub: currentSubCategory,
        itemExists: !!item, itemKeys: item ? Object.keys(item).slice(0, 8) : [],
        nextIndex: questionIndex, nextItemExists: !!currentItem,
        dataCount: mode === 'english' ? (DATA_BANK.english[sub] || []).length :
          mode === 'chinese_hsk' ? (DATA_BANK.chinese_hsk[sub] || []).length :
          ((DATA_BANK[mode] || {})[sub] || []).length
      };
    }, {mode, sub});
    if (!result.itemExists || !result.nextItemExists || result.dataCount < 1) throw new Error('Mode switch/next question failed: ' + JSON.stringify(result));
    results.push(result);
  }

  const answerTest = await page.evaluate(() => {
    setAppMode('grade5_math', 'M1', 'offline-test');
    const before = questionIndex;
    scorePoints('Automated test', 10);
    return new Promise(resolve => setTimeout(() => resolve({
      before, after: questionIndex, hasQuestion: !!currentItem,
      saved: !!localStorage.getItem('ai_offline_session_v535')
    }), 3700));
  });
  if (answerTest.after <= answerTest.before || !answerTest.hasQuestion || !answerTest.saved)
    throw new Error('Answer -> next question / persistence failed: ' + JSON.stringify(answerTest));

  await page.evaluate(() => { setAppMode('chinese_hsk', 3, 'offline-test'); });
  const beforeReload = await page.evaluate(() => ({mode: appMode, sub: currentSubCategory, index: questionIndex}));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const afterReload = await page.evaluate(() => ({mode: appMode, sub: currentSubCategory, index: questionIndex, hasQuestion: !!currentItem, solo: isSolo}));
  if (afterReload.mode !== beforeReload.mode || String(afterReload.sub) !== String(beforeReload.sub) || !afterReload.hasQuestion || !afterReload.solo)
    throw new Error('Offline session restore failed: ' + JSON.stringify({beforeReload, afterReload}));
  if (errors.length) throw new Error('Browser JavaScript errors: ' + errors.join(' | '));

  console.log(JSON.stringify({startup, modesTested: results.length, results, answerTest, beforeReload, afterReload, browserErrors: errors}, null, 2));
  await browser.close();
})().catch(e => { console.error(e.stack || e); process.exit(1); });
