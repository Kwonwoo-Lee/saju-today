// regions.js — 진태양시 보정에 쓰이는 경도(lng, 동경 기준 양수/음수) + 표준시(비 서머타임) UTC 오프셋.
// utcOffset은 각 지역의 "표준시" 자오선(15도 단위)을 정하는 데 쓰이고,
// 서머타임 적용 여부는 별도 체크박스로 사용자가 직접 표시한다.
const REGIONS = [
  // North America
  { id: "new_york", lng: -74.01, utcOffset: -5, names: { en: "New York, NY", zh: "纽约", fr: "New York", ko: "뉴욕" } },
  { id: "boston", lng: -71.06, utcOffset: -5, names: { en: "Boston, MA", zh: "波士顿", fr: "Boston", ko: "보스턴" } },
  { id: "washington_dc", lng: -77.04, utcOffset: -5, names: { en: "Washington, DC", zh: "华盛顿", fr: "Washington, DC", ko: "워싱턴 D.C." } },
  { id: "atlanta", lng: -84.39, utcOffset: -5, names: { en: "Atlanta, GA", zh: "亚特兰大", fr: "Atlanta", ko: "애틀랜타" } },
  { id: "miami", lng: -80.19, utcOffset: -5, names: { en: "Miami, FL", zh: "迈阿密", fr: "Miami", ko: "마이애미" } },
  { id: "toronto", lng: -79.38, utcOffset: -5, names: { en: "Toronto, ON", zh: "多伦多", fr: "Toronto", ko: "토론토" } },
  { id: "montreal", lng: -73.57, utcOffset: -5, names: { en: "Montreal, QC", zh: "蒙特利尔", fr: "Montréal", ko: "몬트리올" } },
  { id: "chicago", lng: -87.65, utcOffset: -6, names: { en: "Chicago, IL", zh: "芝加哥", fr: "Chicago", ko: "시카고" } },
  { id: "dallas", lng: -96.80, utcOffset: -6, names: { en: "Dallas, TX", zh: "达拉斯", fr: "Dallas", ko: "댈러스" } },
  { id: "houston", lng: -95.37, utcOffset: -6, names: { en: "Houston, TX", zh: "休斯顿", fr: "Houston", ko: "휴스턴" } },
  { id: "denver", lng: -104.99, utcOffset: -7, names: { en: "Denver, CO", zh: "丹佛", fr: "Denver", ko: "덴버" } },
  { id: "phoenix", lng: -112.07, utcOffset: -7, names: { en: "Phoenix, AZ", zh: "凤凰城", fr: "Phoenix", ko: "피닉스" } },
  { id: "los_angeles", lng: -118.24, utcOffset: -8, names: { en: "Los Angeles, CA", zh: "洛杉矶", fr: "Los Angeles", ko: "로스앤젤레스" } },
  { id: "san_francisco", lng: -122.42, utcOffset: -8, names: { en: "San Francisco, CA", zh: "旧金山", fr: "San Francisco", ko: "샌프란시스코" } },
  { id: "seattle", lng: -122.33, utcOffset: -8, names: { en: "Seattle, WA", zh: "西雅图", fr: "Seattle", ko: "시애틀" } },
  { id: "vancouver", lng: -123.12, utcOffset: -8, names: { en: "Vancouver, BC", zh: "温哥华", fr: "Vancouver", ko: "밴쿠버" } },
  { id: "honolulu", lng: -157.86, utcOffset: -10, names: { en: "Honolulu, HI", zh: "檀香山", fr: "Honolulu", ko: "호놀룰루" } },

  // Chinese-speaking
  { id: "beijing", lng: 116.41, utcOffset: 8, names: { en: "Beijing", zh: "北京", fr: "Pékin", ko: "베이징" } },
  { id: "shanghai", lng: 121.47, utcOffset: 8, names: { en: "Shanghai", zh: "上海", fr: "Shanghai", ko: "상하이" } },
  { id: "guangzhou", lng: 113.26, utcOffset: 8, names: { en: "Guangzhou", zh: "广州", fr: "Guangzhou", ko: "광저우" } },
  { id: "hong_kong", lng: 114.17, utcOffset: 8, names: { en: "Hong Kong", zh: "香港", fr: "Hong Kong", ko: "홍콩" } },
  { id: "taipei", lng: 121.56, utcOffset: 8, names: { en: "Taipei", zh: "台北", fr: "Taipei", ko: "타이베이" } },

  // French-speaking
  { id: "paris", lng: 2.35, utcOffset: 1, names: { en: "Paris", zh: "巴黎", fr: "Paris", ko: "파리" } },
  { id: "brussels", lng: 4.35, utcOffset: 1, names: { en: "Brussels", zh: "布鲁塞尔", fr: "Bruxelles", ko: "브뤼셀" } },
  { id: "geneva", lng: 6.14, utcOffset: 1, names: { en: "Geneva", zh: "日内瓦", fr: "Genève", ko: "제네바" } },

  // Korea
  { id: "seoul", lng: 126.98, utcOffset: 9, names: { en: "Seoul", zh: "首尔", fr: "Séoul", ko: "서울" } },
  { id: "busan", lng: 129.08, utcOffset: 9, names: { en: "Busan", zh: "釜山", fr: "Busan", ko: "부산" } },
  { id: "incheon", lng: 126.70, utcOffset: 9, names: { en: "Incheon", zh: "仁川", fr: "Incheon", ko: "인천" } },
  { id: "daegu", lng: 128.60, utcOffset: 9, names: { en: "Daegu", zh: "大邱", fr: "Daegu", ko: "대구" } },

  // Other reference points
  { id: "london", lng: -0.13, utcOffset: 0, names: { en: "London", zh: "伦敦", fr: "Londres", ko: "런던" } },
  { id: "tokyo", lng: 139.69, utcOffset: 9, names: { en: "Tokyo", zh: "东京", fr: "Tokyo", ko: "도쿄" } },
  { id: "sydney", lng: 151.21, utcOffset: 10, names: { en: "Sydney", zh: "悉尼", fr: "Sydney", ko: "시드니" } },

  { id: "other", lng: null, utcOffset: null, names: { en: "Other / not sure (no correction)", zh: "其他 / 不确定（不做校正）", fr: "Autre / je ne sais pas (sans correction)", ko: "기타 / 모름 (보정 없음)" } },
];

function regionName(id, lang) {
  const r = REGIONS.find((x) => x.id === id);
  if (!r) return "";
  return r.names[lang] || r.names.en;
}
