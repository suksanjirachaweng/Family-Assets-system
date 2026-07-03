/** Thai bank name → small colored monogram badge (real brand colors, no logo artwork —
 *  avoids reproducing trademarked logo images while still giving an at-a-glance bank cue). */
export interface BankInfo { abbr: string; color: string; name: string }

/** Each bank matches on its Thai name AND common English name/abbreviation
 *  (checked case-insensitively — "scb", "SCB", "Scb" all match). */
const BANKS: { match: RegExp; info: BankInfo }[] = [
  { match: /ออมสิน|gsb/i, info: { abbr: 'GSB', color: '#EB198D', name: 'ธนาคารออมสิน' } },
  { match: /กสิกร|kbank|k-bank|kasikorn/i, info: { abbr: 'K', color: '#138F2D', name: 'ธนาคารกสิกรไทย' } },
  { match: /ไทยพาณิชย์|scb/i, info: { abbr: 'SCB', color: '#4E2E7F', name: 'ธนาคารไทยพาณิชย์' } },
  { match: /กรุงเทพ|bangkok bank|\bbbl\b/i, info: { abbr: 'BBL', color: '#1E4598', name: 'ธนาคารกรุงเทพ' } },
  { match: /กรุงไทย|\bktb\b/i, info: { abbr: 'KTB', color: '#1BA5E1', name: 'ธนาคารกรุงไทย' } },
  { match: /กรุงศรี|krungsri|\bbay\b/i, info: { abbr: 'BAY', color: '#FEC43B', name: 'ธนาคารกรุงศรีอยุธยา' } },
  { match: /ทหารไทยธนชาต|ทีทีบี|\bttb\b/i, info: { abbr: 'ttb', color: '#1279BE', name: 'ธนาคารทหารไทยธนชาต' } },
  { match: /ทิสโก้|tisco/i, info: { abbr: 'TISCO', color: '#0B4F9E', name: 'ธนาคารทิสโก้' } },
  { match: /เกียรตินาคิน|\bkkp\b/i, info: { abbr: 'KKP', color: '#66C7C1', name: 'ธนาคารเกียรตินาคินภัทร' } },
  { match: /ธ\.ก\.ส|เพื่อการเกษตร|\bbaac\b/i, info: { abbr: 'BAAC', color: '#4C9A2A', name: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร' } },
  { match: /ยูโอบี|\buob\b/i, info: { abbr: 'UOB', color: '#0B3979', name: 'ธนาคารยูโอบี' } },
  { match: /ซีไอเอ็มบี|\bcimb\b/i, info: { abbr: 'CIMB', color: '#7E2426', name: 'ธนาคารซีไอเอ็มบีไทย' } },
  { match: /แลนด์ ?แอนด์ ?เฮ้าส์|land and houses|\blh ?bank\b|\blh\b/i, info: { abbr: 'LH', color: '#ED1C24', name: 'ธนาคารแลนด์ แอนด์ เฮ้าส์' } },
];

/** Scans free-form text (an asset name, a bank+account string, etc.) for a known bank name —
 *  matches either the Thai name or a common English name/abbreviation, case-insensitively. */
export function detectBank(text: string | undefined | null): BankInfo | null {
  if (!text) return null;
  for (const b of BANKS) if (b.match.test(text)) return b.info;
  return null;
}
