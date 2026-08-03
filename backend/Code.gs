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
var MOVE_HEADERS = ['id', 'date', 'title', 'detail', 'data'];
var SETTING_HEADERS = ['key', 'value'];

var DEFAULT_SETTINGS = {
  goldPricePerBaht: 51000,
  whtRate: 0.15,
  lineConnected: true,
  lineGroups: [],
  linePendingGroups: [],
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
    if (resource === 'all' || resource === 'moves') out.moves = listMoves_();
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
      case 'deleteMove': result = deleteMove_(payload.id); break;
      case 'saveSettings': result = saveSettings_(payload); break;
      case 'ejectLineGroup': result = ejectLineGroup_(payload.groupId); break;
      case 'acceptLineGroup': result = acceptLineGroup_(payload.groupId); break;
      case 'sendTest': result = sendLinePush_('🔔 ทดสอบการแจ้งเตือนจากระบบสินทรัพย์ครอบครัว'); break;
      case 'pushToGroup': result = pushToGroup_(payload.groupId, payload.text || ''); break;
      case 'logLogin': result = logLogin_(payload); break;
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

function deleteMove_(id) {
  var row = findRow_(SHEETS.MOVES, id);
  if (row > 0) sheet_(SHEETS.MOVES).deleteRow(row);
  return { id: id };
}

function writeExpenses_(assetId, expenses) {
  var s = sheet_(SHEETS.EXPENSES);
  var values = s.getDataRange().getValues();
  for (var r = values.length - 1; r >= 1; r--) if (String(values[r][0]) === String(assetId)) s.deleteRow(r + 1);
  expenses.forEach(function (e) { s.appendRow([assetId, e.label, e.cat, e.amount, e.date]); });
}

var THAI_MONTHS_ = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
/** e.g. "26/6/2026" → "26 มิ.ย. 69" (Buddhist year, 2-digit) — matches the frontend's dueLabelTH. */
function formatDateTH_(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return d.getDate() + ' ' + THAI_MONTHS_[d.getMonth()] + ' ' + String(d.getFullYear() + 543).slice(2);
}

var NUM_EMOJI_ = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
function numEmoji_(i) { return NUM_EMOJI_[i] || (i + 1) + ')'; }

/** Builds the LINE push text for a large move — one numbered line per source/
 *  destination leg with its own amount, so it reads clearly in a chat bubble
 *  instead of a single run-on sentence that hides which leg contributed how much. */
function formatBigMoveMessage_(p) {
  var lines = ['💸 การโยกย้ายเงินก้อนใหญ่', p.title || '', 'รวม ' + baht_(p.amount), '', 'จาก'];
  (p.sources || []).forEach(function (s, i) {
    var joiner = i < p.sources.length - 1 ? ' + ' : ' ';
    lines.push(numEmoji_(i) + ' ' + s.label + ' ' + baht_(s.amount) + ' (ถอน ' + formatDateTH_(s.date) + ')' + joiner);
  });
  lines.push('ไป');
  (p.destinations || []).forEach(function (d, i) {
    var joiner = i < p.destinations.length - 1 ? ' + ' : ' ';
    lines.push(numEmoji_(i) + ' ' + d.label + ' ' + baht_(d.amount) + ' (ฝาก ' + formatDateTH_(d.date) + ')' + joiner);
  });
  return lines.join('\n');
}

/** payload: { title, detail, amount, sources, destinations, alloc } — append to Moves
 *  (sources/destinations/alloc are stored as JSON in the "data" column so the money-flow
 *  diagram can rebuild a real graph from move history) and optionally notify a large move. */
function recordMove_(p) {
  var id = 'm' + Date.now();
  var data = { sources: p.sources || [], destinations: p.destinations || [], alloc: p.alloc || {} };
  sheet_(SHEETS.MOVES).appendRow([id, formatDate_(new Date()), p.title || 'การโยกย้ายเงิน', p.detail || '', JSON.stringify(data)]);
  var s = getSettings_();
  if (s.lineLargeMove && Number(p.amount || 0) >= 1000000) {
    sendLinePush_(formatBigMoveMessage_(p));
  }
  return { id: id };
}

/** Reads the Moves sheet and parses the JSON "data" column back into structured
 *  sources/destinations/alloc — legacy rows recorded before this column existed
 *  just come back with empty arrays. */
function listMoves_() {
  return listObjects_(SHEETS.MOVES).map(function (o) {
    var data = {};
    try { data = JSON.parse(o.data || '{}'); } catch (e) { /* legacy row, no data column */ }
    return {
      id: String(o.id),
      date: formatDate_(o.date),
      title: o.title,
      detail: o.detail,
      sources: data.sources || [],
      destinations: data.destinations || [],
      alloc: data.alloc || {},
    };
  });
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

/** Logs LINE webhook events to a "LineDebug" sheet (auto-created) for
 *  debugging, and routes group events:
 *  - "join" (bot invited to a group) → pending-approval flow (handleGroupJoin_)
 *  - "message" from a group → ignored unless it @mentions the bot (handleGroupMessage_)
 *  Anything else (1:1 chat, non-group source, etc.) is logged only, no action.
 *  Ordinary group chat that never mentions the bot isn't logged at all, so
 *  the sheet doesn't fill up with unrelated family conversation. */
function logLineWebhookIds_(events) {
  var s = ss_().getSheetByName('LineDebug') || ss_().insertSheet('LineDebug');
  events.forEach(function (ev) {
    var isGroupMsg = ev.type === 'message' && ev.source && ev.source.type === 'group';
    if (isGroupMsg && !isBotMentioned_(ev.message)) return;
    s.appendRow([new Date(), ev.type, JSON.stringify(ev.source)]);
    if (!ev.source || ev.source.type !== 'group' || !ev.source.groupId) return;
    if (ev.type === 'join') handleGroupJoin_(ev.source.groupId);
    else if (ev.type === 'message') handleGroupMessage_(ev.source.groupId, ev);
  });
}

/** Records every password-gate login attempt (success or failure) to a
 *  "LoginLog" sheet (auto-created) — a security audit trail of who accessed
 *  the app and when, since the app has no per-user accounts to log against. */
function logLogin_(p) {
  var s = ss_().getSheetByName('LoginLog') || ss_().insertSheet('LoginLog');
  if (s.getLastRow() === 0) s.appendRow(['เวลา', 'สำเร็จ', 'อุปกรณ์/เบราว์เซอร์']).getRange(1, 1, 1, 3).setFontWeight('bold');
  s.appendRow([new Date(), p.success ? 'สำเร็จ' : 'ผิดพลาด', String(p.userAgent || '')]);
  return { ok: true };
}

/** Bot was invited to a group: sends a one-time "waiting for approval" message
 *  and records the group as PENDING — it does NOT receive notifications until
 *  an admin accepts it from the web app (acceptLineGroup_). No-ops if the group
 *  is already known (active or still pending) so the message doesn't repeat. */
function handleGroupJoin_(groupId) {
  var s = getSettings_();
  var active = s.lineGroups || [];
  var pending = s.linePendingGroups || [];
  if (active.some(function (g) { return g.id === groupId; })) return;
  if (pending.some(function (g) { return g.id === groupId; })) return;
  pending.push({ id: groupId, name: getGroupName_(groupId) || groupId });
  saveSettings_({ linePendingGroups: pending });
  pushToGroup_(groupId, '🔔 บอทถูกเชิญเข้ากลุ่มนี้แล้ว กำลังรอผู้ดูแลระบบอนุมัติก่อนเริ่มส่งการแจ้งเตือนครับ');
}

/** LINE's group "@" autocomplete doesn't reliably list Official/verified
 *  accounts as mentionable, so users end up typing the bot's name as plain
 *  text instead of a real mention. Detect both: a real mention object
 *  (`message.mention.mentionees[].isSelf`, in case it ever does register)
 *  OR the account name appearing literally in the message text. */
var BOT_NAME_ = 'NSL_ASSET';

/** True if a text message @mentions the bot (real LINE mention) or contains
 *  its name as plain text (see BOT_NAME_ above). Shared by logLineWebhookIds_
 *  (to decide what's even worth logging) and handleGroupMessage_ (to decide
 *  what's worth acting on) so the two checks can't drift apart. */
function isBotMentioned_(msg) {
  if (!msg || msg.type !== 'text') return false;
  var realMention = !!(msg.mention && msg.mention.mentionees &&
    msg.mention.mentionees.some(function (m) { return m.isSelf; }));
  var textMention = !!(msg.text && msg.text.toLowerCase().indexOf(BOT_NAME_.toLowerCase()) !== -1);
  return realMention || textMention;
}

/** Ordinary chat in a group is ignored completely — the bot only reacts when
 *  tagged (see isBotMentioned_ above for how "tagged" is detected). If a
 *  mention arrives from a totally unknown group (e.g. the "join" event was
 *  missed), it's treated as a fresh join instead of answering. */
function handleGroupMessage_(groupId, ev) {
  var msg = ev.message;
  if (!isBotMentioned_(msg)) return;

  var s = getSettings_();
  var active = s.lineGroups || [];
  var pending = s.linePendingGroups || [];
  var isActive = active.some(function (g) { return g.id === groupId; });
  var isPending = pending.some(function (g) { return g.id === groupId; });
  if (!isActive && !isPending) { handleGroupJoin_(groupId); return; }
  if (!isActive) return; // still awaiting admin approval — stay silent
  answerBotQuestion_(groupId, msg.text);
}

/** Keyword-matched Q&A for @mention questions in an active group. Reuses the
 *  same amount/date logic as CRUD + daily notifications (computeAmount_,
 *  daysBetween_) so answers always match the web app and reminders. Falls
 *  back to a menu of supported questions if nothing matches. */
function answerBotQuestion_(groupId, questionText) {
  var text = questionText || '';
  var reply;
  if (text.indexOf('ใกล้ครบ') !== -1) reply = answerNearMaturity_();
  else if (text.indexOf('เจ้าของ') !== -1) reply = answerByOwner_();
  else if (text.indexOf('มูลค่ารวม') !== -1 || text.indexOf('มูลค่าสุทธิ') !== -1 || text.indexOf('รวมสุทธิ') !== -1) reply = answerTotalNetWorth_();
  else {
    var owner = matchKnownOwner_(text);
    reply = owner ? answerAssetsByOwner_(owner) : QNA_MENU_;
  }
  pushToGroup_(groupId, reply);
}

var QNA_MENU_ = '❓ ไม่เข้าใจคำถามนี้ครับ ลองถามแบบนี้ดูนะครับ:\n' +
  '• ใกล้ครบกำหนด\n' +
  '• สรุปทรัพย์สินแยกตามเจ้าของ\n' +
  '• มูลค่ารวมสุทธิทั้งหมด\n' +
  '• สรุปทรัพย์สิน[ชื่อเจ้าของ] เช่น "สรุปทรัพย์สินสุขสันต์"';

/** Known family owner names — kept in sync with PEOPLE in
 *  AssetFormFields.tsx / OWNER_BASE in colors.ts (frontend and backend are
 *  separate runtimes, so this list can't be shared directly). Order doesn't
 *  matter — none of these names are substrings of each other. */
var OWNER_NAMES_ = ['ชัย', 'วิวัฒน์', 'ธีรดา', 'กวิน', 'สุขสันต์', 'สุวิชช์', 'วิภาดา', 'สุภาดา', 'ครอบครัว'];

/** Finds the first known family owner name that appears anywhere in the
 *  text (no space required — Thai words often run together, e.g.
 *  "ทรัพย์สินสุขสันต์"). Returns null if none match. */
function matchKnownOwner_(text) {
  for (var i = 0; i < OWNER_NAMES_.length; i++) {
    if (text.indexOf(OWNER_NAMES_[i]) !== -1) return OWNER_NAMES_[i];
  }
  return null;
}

/** Lists every asset a specific owner appears on (solo or jointly-owned),
 *  with a running total — matches ownerColor()/ownerKey() semantics in the
 *  web app (joint assets aren't split, the full amount counts once). */
function answerAssetsByOwner_(ownerName) {
  var s = getSettings_();
  var items = listAssets_().filter(function (a) { return a.owners.indexOf(ownerName) !== -1; });
  if (!items.length) return '❌ ไม่พบทรัพย์สินของ ' + ownerName + ' ในระบบครับ';
  var total = 0;
  var lines = items.map(function (a) {
    var amount = computeAmount_(a, s.goldPricePerBaht);
    total += amount;
    var label = a.name ? (a.name + ' · ') : '';
    return '• ' + (TYPE_LABEL[a.type] || a.type) + ' · ' + label + a.owners.join(' · ') + ' · ' + baht_(amount);
  });
  return '📋 ทรัพย์สินของ ' + ownerName + ' — ' + items.length + ' รายการ รวม ' + baht_(total) + '\n' + lines.join('\n');
}

/** Assets due within the next 90 days (0..90 inclusive) — same window as the
 *  "ใกล้ครบกำหนด (90 วัน)" card in OverviewView.tsx. */
function answerNearMaturity_() {
  var s = getSettings_();
  var items = listAssets_().filter(function (a) { return !!a.due; })
    .map(function (a) { return { a: a, days: daysBetween_(a.due) }; })
    .filter(function (x) { return x.days >= 0 && x.days <= 90; })
    .sort(function (x, y) { return x.days - y.days; });
  if (!items.length) return '✅ ไม่มีบัญชีที่ใกล้ครบกำหนดภายใน 90 วันข้างหน้าครับ';
  var total = items.reduce(function (sum, x) { return sum + computeAmount_(x.a, s.goldPricePerBaht); }, 0);
  var lines = items.map(function (x) {
    var amount = computeAmount_(x.a, s.goldPricePerBaht);
    return '• ' + (TYPE_LABEL[x.a.type] || x.a.type) + ' · ' + x.a.name + ' · เจ้าของ: ' + x.a.owners.join(' · ') +
      '\n  ครบกำหนดอีก ' + x.days + ' วัน (' + x.a.due + ') · ' + baht_(amount);
  });
  return '📅 บัญชีใกล้ครบกำหนด (90 วัน) — ' + items.length + ' รายการ รวม ' + baht_(total) + '\n' + lines.join('\n');
}

/** Groups assets by owner combo — jointly-owned assets go into their own
 *  combined bucket (e.g. "กวิน · ธีรดา"), matching ownerKey() in assets.ts;
 *  values are NOT split across co-owners. */
function answerByOwner_() {
  var s = getSettings_();
  var buckets = {};
  var order = [];
  listAssets_().forEach(function (a) {
    var key = a.owners.length > 1 ? a.owners.slice().sort().join(' · ') : a.owners[0];
    if (!(key in buckets)) { buckets[key] = 0; order.push(key); }
    buckets[key] += computeAmount_(a, s.goldPricePerBaht);
  });
  order.sort(function (x, y) { return buckets[y] - buckets[x]; });
  var lines = order.map(function (k) { return '• ' + k + ': ' + baht_(buckets[k]); });
  return '👪 สรุปทรัพย์สินแยกตามเจ้าของ\n' + lines.join('\n');
}

/** Plain sum of every asset's computed amount — matches the "มูลค่ารวมสุทธิ"
 *  total shown in the app header (no WHT deduction, same as OverviewView.tsx). */
function answerTotalNetWorth_() {
  var s = getSettings_();
  var total = listAssets_().reduce(function (sum, a) { return sum + computeAmount_(a, s.goldPricePerBaht); }, 0);
  return '💰 มูลค่ารวมสุทธิทั้งหมด: ' + baht_(total);
}

/** Admin accepts a pending group from the web app: moves it into the active
 *  (notified) list and sends a confirmation message into that group. */
function acceptLineGroup_(groupId) {
  var s = getSettings_();
  var found = null;
  var remainingPending = (s.linePendingGroups || []).filter(function (g) {
    if (g.id === groupId) { found = g; return false; }
    return true;
  });
  var active = s.lineGroups || [];
  if (found && !active.some(function (g) { return g.id === groupId; })) active.push(found);
  saveSettings_({ lineGroups: active, linePendingGroups: remainingPending });
  pushToGroup_(groupId, '✅ กลุ่มนี้ได้รับการอนุมัติแล้ว ระบบจะเริ่มส่งการแจ้งเตือนสินทรัพย์เข้ากลุ่มนี้ต่อจากนี้ครับ');
  return { lineGroups: active, linePendingGroups: remainingPending };
}

/** Removes a group from both the active and pending lists AND has the bot
 *  actually leave that LINE group (LINE Messaging API's "Leave group" endpoint)
 *  — this is what makes ejecting/rejecting permanent: with the bot no longer a
 *  member, no future message in that group can re-trigger the join/pending flow. */
function ejectLineGroup_(groupId) {
  var s = getSettings_();
  var groups = (s.lineGroups || []).filter(function (g) { return g.id !== groupId; });
  var pending = (s.linePendingGroups || []).filter(function (g) { return g.id !== groupId; });
  saveSettings_({ lineGroups: groups, linePendingGroups: pending });
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
    var s2 = ss_().getSheetByName('LineDebug') || ss_().insertSheet('LineDebug');
    s2.appendRow([new Date(), 'leaveGroup:' + groupId, JSON.stringify(leaveResult)]);
  }
  return { lineGroups: groups, linePendingGroups: pending, leaveResult: leaveResult };
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

/** Pushes to exactly one group/user id — used both for broadcast (sendLinePush_
 *  loops this over every active group) and for one-off messages sent to a
 *  specific group (join notice, approval confirmation, question ack). */
function pushToGroup_(groupId, text) {
  var token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  if (!token) return { skipped: true };
  var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ to: groupId, messages: [{ type: 'text', text: text }] }),
    muteHttpExceptions: true
  });
  return { status: res.getResponseCode(), body: res.getContentText() };
}

function sendLinePush_(text) {
  var token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  var groupIds = (getSettings_().lineGroups || []).map(function (g) { return g.id; });
  if (!token || !groupIds.length) { Logger.log('LINE not configured — skipped: ' + text); return { skipped: true }; }
  var results = groupIds.map(function (gid) {
    var r = pushToGroup_(gid, text);
    r.groupId = gid;
    return r;
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

/** One-time migration for a Sheet that's already live: adds the "data" column to
 *  Moves (holds JSON sources/destinations/alloc for the money-flow diagram)
 *  without touching existing rows. Run once from the Apps Script editor. */
function migrateAddMoveData() {
  var s = sheet_(SHEETS.MOVES);
  var headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  if (headers.indexOf('data') !== -1) { Logger.log('มีคอลัมน์ data อยู่แล้ว'); return; }
  var col = s.getLastColumn() + 1;
  s.getRange(1, col).setValue('data').setFontWeight('bold');
  Logger.log('เพิ่มคอลัมน์ data แล้ว ที่คอลัมน์ ' + col);
}

/** One-time cleanup: deletes every row of sample/seed data from Assets,
 *  Expenses, and Moves (keeps the header row so the sheet stays usable),
 *  so real data can be entered fresh. Does NOT touch Settings — LINE groups,
 *  gold price, notification config, etc. are left exactly as configured.
 *  Run once from the Apps Script editor; takes effect immediately (no
 *  redeploy needed since nothing here goes through the Web App URL). */
function clearSampleData() {
  [SHEETS.ASSETS, SHEETS.EXPENSES, SHEETS.MOVES].forEach(function (name) {
    var s = sheet_(name);
    var lastRow = s.getLastRow();
    if (lastRow > 1) s.deleteRows(2, lastRow - 1);
  });
  Logger.log('ลบข้อมูลตัวอย่างเรียบร้อยแล้ว (Assets, Expenses, Moves) — Settings ไม่ถูกแตะต้อง');
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
