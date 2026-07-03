/**
 * ระบบจัดเก็บสินทรัพย์ครอบครัว — Google Apps Script backend
 * ----------------------------------------------------------
 * ทำหน้าที่เป็น API (Web App) + ฐานข้อมูลบน Google Sheets + ตัวส่งแจ้งเตือน LINE
 *
 * ขั้นตอนติดตั้งดูใน backend/README.md
 *   1) สร้าง Google Sheet แล้วเปิด Apps Script (Extensions → Apps Script)
 *   2) วางไฟล์นี้ + seed.gs + appsscript.json
 *   3) รัน setup()  → สร้างชีต + ใส่ข้อมูลตัวอย่าง
 *   4) Deploy → New deployment → Web app  (Execute as: Me, Access: Anyone)
 *   5) ตั้งค่า Script Properties: LINE_CHANNEL_ACCESS_TOKEN, LINE_GROUP_ID
 *   6) รัน installTriggers()  → ตั้งเวลาแจ้งเตือนรายวัน
 */

var SHEETS = { ASSETS: 'Assets', EXPENSES: 'Expenses', MOVES: 'Moves', SETTINGS: 'Settings' };

var ASSET_HEADERS = [
  'id', 'type', 'name', 'owners', 'acctNo', 'amount', 'rate', 'due',
  'units', 'navBuy', 'navNow', 'goldBaht', 'shares', 'priceBuy', 'priceNow',
  'deedNo', 'rai', 'ngan', 'wa', 'appraisal', 'otherCat', 'otherVal',
  'receiving', 'iAcctBank', 'iAcctNo', 'iAcctOwners',
  'goldBuyPrice' // added later — must stay last; see migrateAddGoldBuyPrice()
];
var EXPENSE_HEADERS = ['assetId', 'label', 'cat', 'amount', 'date'];
var MOVE_HEADERS = ['id', 'date', 'title', 'detail'];
var SETTING_HEADERS = ['key', 'value'];

var DEFAULT_SETTINGS = {
  goldPricePerBaht: 51000,
  whtRate: 0.15,
  lineConnected: true,
  lineLead: { d30: true, d7: true, d1: true },
  lineTypes: { fd: true, bond: true, fund: false },
  lineTime: '09:00',
  lineMaturity: true,
  lineMonthly: true,
  lineLargeMove: true
};

/* =========================================================================
 *  WEB APP ENTRY POINTS
 * ========================================================================= */

function doGet(e) {
  try {
    var resource = (e && e.parameter && e.parameter.resource) || 'all';
    var out = {};
    if (resource === 'all' || resource === 'assets') out.assets = listAssets_();
    if (resource === 'all' || resource === 'moves') out.moves = listObjects_(SHEETS.MOVES);
    if (resource === 'all' || resource === 'settings') out.settings = getSettings_();
    return jsonOut_({ ok: true, data: out });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    // LINE webhook events (used only to capture group/user IDs — see logLineWebhookIds_)
    if (body.events) { logLineWebhookIds_(body.events); return jsonOut_({ ok: true }); }
    var action = body.action;
    var payload = body.payload || {};
    var result;
    switch (action) {
      case 'createAsset': result = createAsset_(payload); break;
      case 'updateAsset': result = updateAsset_(payload); break;
      case 'deleteAsset': result = deleteAsset_(payload.id); break;
      case 'recordMove': result = recordMove_(payload); break;
      case 'saveSettings': result = saveSettings_(payload); break;
      case 'ejectLineGroup': result = ejectLineGroup_(payload.groupId); break;
      case 'sendTest': result = sendLinePush_('🔔 ทดสอบการแจ้งเตือนจากระบบสินทรัพย์ครอบครัว'); break;
      default: throw new Error('unknown action: ' + action);
    }
    return jsonOut_({ ok: true, data: result });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* =========================================================================
 *  SHEET HELPERS
 * ========================================================================= */

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_(name) {
  var s = ss_().getSheetByName(name);
  if (!s) throw new Error('ไม่พบชีต "' + name + '" — รัน setup() ก่อน');
  return s;
}

/** Read a sheet into an array of plain objects keyed by the header row. */
function listObjects_(name) {
  var s = sheet_(name);
  var values = s.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (row.join('') === '') continue;
    var o = {};
    for (var c = 0; c < headers.length; c++) o[headers[c]] = row[c];
    out.push(o);
  }
  return out;
}

function csv_(v) { return String(v == null ? '' : v).split('·').map(function (x) { return x.trim(); }).filter(Boolean); }
function num_(v) { return v === '' || v == null ? null : Number(v); }

/** Convert a raw Assets row into the nested shape the frontend expects. */
function rowToAsset_(o, expensesByAsset) {
  var a = {
    id: String(o.id),
    type: o.type,
    name: o.name,
    owners: csv_(o.owners),
    acctNo: String(o.acctNo),
    rate: num_(o.rate),
    due: o.due ? formatDate_(o.due) : null
  };
  if (o.amount !== '' && o.amount != null) a.amount = Number(o.amount);
  if (o.units !== '' && o.units != null) { a.units = Number(o.units); a.navBuy = num_(o.navBuy); a.navNow = num_(o.navNow); }
  if (o.goldBaht !== '' && o.goldBaht != null) a.goldBaht = Number(o.goldBaht);
  if (o.goldBuyPrice !== '' && o.goldBuyPrice != null) a.goldBuyPrice = Number(o.goldBuyPrice);
  if (o.shares !== '' && o.shares != null) { a.shares = Number(o.shares); a.priceBuy = num_(o.priceBuy); a.priceNow = num_(o.priceNow); }
  if (o.deedNo) { a.deedNo = o.deedNo; a.rai = num_(o.rai) || 0; a.ngan = num_(o.ngan) || 0; a.wa = num_(o.wa) || 0; a.appraisal = num_(o.appraisal); }
  if (o.otherCat) { a.otherCat = o.otherCat; a.otherVal = num_(o.otherVal); }
  if (o.receiving === true || o.receiving === 'TRUE' || o.receiving === 'true') a.receiving = true;
  if (o.iAcctNo) a.iAcct = { bank: o.iAcctBank, no: String(o.iAcctNo), owners: csv_(o.iAcctOwners) };
  var ex = expensesByAsset[a.id];
  if (ex && ex.length) a.expenses = ex;
  return a;
}

function assetToRow_(a) {
  var ia = a.iAcct || {};
  var map = {
    id: a.id, type: a.type, name: a.name, owners: (a.owners || []).join('·'), acctNo: a.acctNo,
    amount: a.amount != null ? a.amount : '', rate: a.rate != null ? a.rate : '', due: a.due || '',
    units: a.units != null ? a.units : '', navBuy: a.navBuy != null ? a.navBuy : '', navNow: a.navNow != null ? a.navNow : '',
    goldBaht: a.goldBaht != null ? a.goldBaht : '', shares: a.shares != null ? a.shares : '',
    priceBuy: a.priceBuy != null ? a.priceBuy : '', priceNow: a.priceNow != null ? a.priceNow : '',
    deedNo: a.deedNo || '', rai: a.rai != null ? a.rai : '', ngan: a.ngan != null ? a.ngan : '', wa: a.wa != null ? a.wa : '',
    appraisal: a.appraisal != null ? a.appraisal : '', otherCat: a.otherCat || '', otherVal: a.otherVal != null ? a.otherVal : '',
    receiving: a.receiving ? true : '', iAcctBank: ia.bank || '', iAcctNo: ia.no || '', iAcctOwners: (ia.owners || []).join('·'),
    goldBuyPrice: a.goldBuyPrice != null ? a.goldBuyPrice : ''
  };
  return ASSET_HEADERS.map(function (h) { return map[h]; });
}

function listAssets_() {
  var expenses = listObjects_(SHEETS.EXPENSES);
  var byAsset = {};
  expenses.forEach(function (e) {
    var k = String(e.assetId);
    (byAsset[k] = byAsset[k] || []).push({ label: e.label, cat: e.cat, amount: Number(e.amount), date: formatDate_(e.date) });
  });
  return listObjects_(SHEETS.ASSETS).map(function (o) { return rowToAsset_(o, byAsset); });
}

function formatDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd');
  return String(v).slice(0, 10);
}

/* =========================================================================
 *  CRUD
 * ========================================================================= */

function createAsset_(a) {
  if (!a.id) a.id = 'a' + Date.now();
  sheet_(SHEETS.ASSETS).appendRow(assetToRow_(a));
  if (a.expenses) writeExpenses_(a.id, a.expenses);
  return { id: a.id };
}

function findRow_(name, id) {
  var s = sheet_(name);
  var ids = s.getRange(2, 1, Math.max(0, s.getLastRow() - 1), 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function updateAsset_(a) {
  var row = findRow_(SHEETS.ASSETS, a.id);
  if (row < 0) throw new Error('ไม่พบสินทรัพย์ id=' + a.id);
  sheet_(SHEETS.ASSETS).getRange(row, 1, 1, ASSET_HEADERS.length).setValues([assetToRow_(a)]);
  if (a.expenses) writeExpenses_(a.id, a.expenses);
  return { id: a.id };
}

function deleteAsset_(id) {
  var row = findRow_(SHEETS.ASSETS, id);
  if (row > 0) sheet_(SHEETS.ASSETS).deleteRow(row);
  return { id: id };
}

function writeExpenses_(assetId, expenses) {
  var s = sheet_(SHEETS.EXPENSES);
  var values = s.getDataRange().getValues();
  for (var r = values.length - 1; r >= 1; r--) if (String(values[r][0]) === String(assetId)) s.deleteRow(r + 1);
  expenses.forEach(function (e) { s.appendRow([assetId, e.label, e.cat, e.amount, e.date]); });
}

/** payload: { title, detail, amount } — append to Moves and optionally notify a large move. */
function recordMove_(p) {
  var id = 'm' + Date.now();
  sheet_(SHEETS.MOVES).appendRow([id, formatDate_(new Date()), p.title || 'การโยกย้ายเงิน', p.detail || '']);
  var s = getSettings_();
  if (s.lineLargeMove && Number(p.amount || 0) >= 1000000) {
    sendLinePush_('💸 การโยกย้ายเงินก้อนใหญ่\n' + (p.title || '') + '\n' + (p.detail || '') + '\nยอด ' + baht_(p.amount));
  }
  return { id: id };
}

/* =========================================================================
 *  SETTINGS
 * ========================================================================= */

function getSettings_() {
  var rows = listObjects_(SHEETS.SETTINGS);
  var out = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  var seenKeys = {};
  rows.forEach(function (r) {
    if (!r.key) return;
    seenKeys[r.key] = true;
    var v = r.value;
    try { v = JSON.parse(r.value); } catch (e) { /* keep raw */ }
    out[r.key] = v;
  });
  // one-time migration: seed lineGroups from the legacy LINE_GROUP_ID script
  // property (comma-separated) the first time it's read — only if lineGroups
  // was never explicitly saved (so ejecting the last group doesn't resurrect it)
  if (!seenKeys.lineGroups) {
    var raw = PropertiesService.getScriptProperties().getProperty('LINE_GROUP_ID') || '';
    var legacyIds = raw.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    if (legacyIds.length) out.lineGroups = legacyIds.map(function (id) { return { id: id, name: id }; });
  }
  return out;
}

function saveSettings_(partial) {
  var s = sheet_(SHEETS.SETTINGS);
  var current = getSettings_();
  Object.keys(partial).forEach(function (k) { current[k] = partial[k]; });
  // rewrite the whole settings sheet
  s.clearContents();
  s.getRange(1, 1, 1, SETTING_HEADERS.length).setValues([SETTING_HEADERS]);
  var keys = Object.keys(current);
  var values = keys.map(function (k) {
    var v = current[k];
    return [k, (typeof v === 'object') ? JSON.stringify(v) : v];
  });
  if (values.length) s.getRange(2, 1, values.length, 2).setValues(values);
  return current;
}

/* =========================================================================
 *  LINE MESSAGING
 * ========================================================================= */

/** Logs every LINE webhook event to a "LineDebug" sheet (auto-created) for
 *  debugging, and auto-registers any group the bot sees into Settings.lineGroups
 *  — this is how new groups appear in the web app's group list without any
 *  manual copy-pasting of IDs. */
function logLineWebhookIds_(events) {
  var s = ss_().getSheetByName('LineDebug') || ss_().insertSheet('LineDebug');
  events.forEach(function (ev) {
    s.appendRow([new Date(), ev.type, JSON.stringify(ev.source)]);
    if (ev.source && ev.source.type === 'group' && ev.source.groupId) registerLineGroup_(ev.source.groupId);
  });
}

/** Adds a newly-seen group to Settings.lineGroups (deduped by id), fetching its
 *  display name from LINE's Group Summary API when possible. */
function registerLineGroup_(groupId) {
  var s = getSettings_();
  var groups = s.lineGroups || [];
  if (groups.some(function (g) { return g.id === groupId; })) return;
  groups.push({ id: groupId, name: getGroupName_(groupId) || groupId });
  saveSettings_({ lineGroups: groups });
}

/** Removes a group from Settings.lineGroups AND has the bot actually leave that
 *  LINE group (LINE Messaging API's "Leave group" endpoint) — this is what makes
 *  ejecting permanent: with the bot no longer a member, no future message in that
 *  group can re-trigger `registerLineGroup_` via the webhook. */
function ejectLineGroup_(groupId) {
  var groups = (getSettings_().lineGroups || []).filter(function (g) { return g.id !== groupId; });
  saveSettings_({ lineGroups: groups });
  var token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  var leaveResult = null;
  if (token) {
    var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/group/' + groupId + '/leave', {
      method: 'post',
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    leaveResult = { status: res.getResponseCode(), body: res.getContentText() };
    // logged to the same "LineDebug" sheet used for webhook capture, so failures are visible
    // without needing to dig through Apps Script's Executions panel
    var s = ss_().getSheetByName('LineDebug') || ss_().insertSheet('LineDebug');
    s.appendRow([new Date(), 'leaveGroup:' + groupId, JSON.stringify(leaveResult)]);
  }
  return { lineGroups: groups, leaveResult: leaveResult };
}

/** One-time cleanup: the legacy-migration path in getSettings_() couldn't fetch
 *  real names (it only runs on a plain read), so it stored the groupId itself
 *  as a placeholder name. Run this once from the Apps Script editor to replace
 *  those placeholders with the real LINE group name. Safe to re-run any time. */
function fixLineGroupNames() {
  var groups = (getSettings_().lineGroups || []).map(function (g) {
    if (g.name !== g.id) return g; // already has a real name
    var real = getGroupName_(g.id);
    return real ? { id: g.id, name: real } : g;
  });
  saveSettings_({ lineGroups: groups });
  Logger.log('อัปเดตชื่อกลุ่มแล้ว: ' + JSON.stringify(groups));
}

function getGroupName_(groupId) {
  var token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  if (!token) return null;
  try {
    var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/group/' + groupId + '/summary', {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) return null;
    return JSON.parse(res.getContentText()).groupName || null;
  } catch (e) {
    return null;
  }
}

function sendLinePush_(text) {
  var token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  var groupIds = (getSettings_().lineGroups || []).map(function (g) { return g.id; });
  if (!token || !groupIds.length) { Logger.log('LINE not configured — skipped: ' + text); return { skipped: true }; }
  var results = groupIds.map(function (gid) {
    var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({ to: gid, messages: [{ type: 'text', text: text }] }),
      muteHttpExceptions: true
    });
    return { groupId: gid, status: res.getResponseCode(), body: res.getContentText() };
  });
  return { results: results };
}

var TYPE_LABEL = { fd: 'ฝากประจำ', sav: 'ออมทรัพย์', fund: 'กองทุน', bond: 'หุ้นกู้', gold: 'ทองคำ', stock: 'หุ้นสามัญ', land: 'อสังหาฯ', other: 'อื่นๆ' };

function baht_(n) { return '฿' + Math.round(Number(n) || 0).toLocaleString('en-US'); }

function computeAmount_(a, goldPrice) {
  if (a.type === 'gold') return (a.goldBaht || 0) * goldPrice;
  if (a.type === 'fund') return (a.units || 0) * (a.navNow || 0);
  if (a.type === 'stock') return (a.shares || 0) * (a.priceNow || 0);
  if (a.type === 'land') return a.appraisal || 0;
  if (a.type === 'other') return a.otherVal || 0;
  return a.amount || 0;
}

function todayBangkok_() {
  var s = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  var p = s.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

function daysBetween_(due) {
  var d = due.split('-');
  var t = new Date(Number(d[0]), Number(d[1]) - 1, Number(d[2]));
  return Math.round((t.getTime() - todayBangkok_().getTime()) / 86400000);
}

/** Time-driven: run once a day. Sends maturity reminders + monthly summary. */
function sendDailyNotifications() {
  var s = getSettings_();
  var assets = listAssets_();
  var leadDays = [];
  if (s.lineLead.d30) leadDays.push(30);
  if (s.lineLead.d7) leadDays.push(7);
  if (s.lineLead.d1) leadDays.push(1);

  if (s.lineMaturity) {
    assets.forEach(function (a) {
      if (!a.due) return;
      if (!s.lineTypes[a.type]) return;
      var days = daysBetween_(a.due);
      if (leadDays.indexOf(days) < 0) return;
      var amount = computeAmount_(a, s.goldPricePerBaht);
      var msg = '🔔 แจ้งเตือนครบกำหนด\n' +
        (TYPE_LABEL[a.type] || a.type) + ' · ' + a.name + '\n' +
        'เจ้าของบัญชี: ' + a.owners.join(' · ') + '\n' +
        'ครบกำหนดอีก ' + days + ' วัน (' + a.due + ')\n' +
        'จำนวนเงิน ' + baht_(amount) +
        (a.iAcct ? ('\nดอกเบี้ยเข้า ' + a.iAcct.bank + ' ' + a.iAcct.no) : '');
      sendLinePush_(msg);
    });
  }

  if (s.lineMonthly && todayBangkok_().getDate() === 1) {
    var total = 0, plCost = 0, plVal = 0;
    assets.forEach(function (a) {
      var amt = computeAmount_(a, s.goldPricePerBaht);
      total += amt;
      if (a.type === 'fund') { plCost += (a.units || 0) * (a.navBuy || 0); plVal += amt; }
      if (a.type === 'stock') { plCost += (a.shares || 0) * (a.priceBuy || 0); plVal += amt; }
    });
    var gain = plVal - plCost;
    sendLinePush_('📊 สรุปพอร์ตประจำเดือน\nมูลค่ารวมสุทธิ ' + baht_(total) +
      '\nกำไร/ขาดทุน (หุ้น+กองทุน) ' + (gain >= 0 ? '+' : '') + baht_(gain));
  }
}

/* =========================================================================
 *  SETUP & TRIGGERS
 * ========================================================================= */

function setup() {
  var ss = ss_();
  ensureSheet_(ss, SHEETS.ASSETS, ASSET_HEADERS);
  ensureSheet_(ss, SHEETS.EXPENSES, EXPENSE_HEADERS);
  ensureSheet_(ss, SHEETS.MOVES, MOVE_HEADERS);
  ensureSheet_(ss, SHEETS.SETTINGS, SETTING_HEADERS);
  saveSettings_(DEFAULT_SETTINGS);
  seedData_(); // defined in seed.gs
  Logger.log('setup เสร็จแล้ว — ลองรัน listAssets_() หรือเปิด Sheet ดูได้เลย');
}

/** One-time migration for a Sheet that's already live: adds the goldBuyPrice
 *  column without touching existing rows (unlike setup(), which clears everything).
 *  Run once from the Apps Script editor after pasting this updated Code.gs, then redeploy. */
function migrateAddGoldBuyPrice() {
  var s = sheet_(SHEETS.ASSETS);
  var headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  if (headers.indexOf('goldBuyPrice') !== -1) { Logger.log('มีคอลัมน์ goldBuyPrice อยู่แล้ว'); return; }
  var col = s.getLastColumn() + 1;
  s.getRange(1, col).setValue('goldBuyPrice').setFontWeight('bold');
  Logger.log('เพิ่มคอลัมน์ goldBuyPrice แล้ว ที่คอลัมน์ ' + col);
}

function ensureSheet_(ss, name, headers) {
  var s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  s.clear();
  s.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  s.setFrozenRows(1);
  return s;
}

/** Run once to schedule the daily LINE notification at the configured time. */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendDailyNotifications') ScriptApp.deleteTrigger(t);
  });
  var s = getSettings_();
  var hour = Number((s.lineTime || '09:00').split(':')[0]) || 9;
  ScriptApp.newTrigger('sendDailyNotifications').timeBased().everyDays(1).atHour(hour).create();
  Logger.log('ตั้งเวลาแจ้งเตือนรายวันเวลา ' + hour + ':00 น. แล้ว');
}
