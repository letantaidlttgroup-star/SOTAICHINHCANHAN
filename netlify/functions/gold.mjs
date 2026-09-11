// Lấy giá vàng từ Bảo Tín Minh Châu ở phía máy chủ (không dính CORS/mixed-content).
const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' };

export const handler = async () => {
  try {
    const url = 'http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v';
    const res = await fetch(url);
    const json = await res.json();
    let data = json?.DataList?.Data;
    if (!Array.isArray(data)) data = data ? [data] : [];

    const cands = [];
    for (const it of data) {
      const row = it['@row'];
      const name = String(it['@n_' + row] ?? '');
      const buy = parseFloat(String(it['@pb_' + row] ?? '').replace(/[^\d]/g, ''));
      const sell = parseFloat(String(it['@ps_' + row] ?? '').replace(/[^\d]/g, ''));
      if (sell || buy) cands.push({ name, buy: buy || 0, sell: sell || 0 });
    }
    const pick = cands.find((c) => /SJC/i.test(c.name)) || cands.find((c) => /999|nhẫn/i.test(c.name)) || cands[0];
    if (!pick) return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, reason: 'no-data', all: cands.slice(0, 8) }) };

    let v = pick.sell || pick.buy;
    if (v > 0 && v < 30000000) v *= 10; // BTMC báo theo chỉ → quy về lượng
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, perLuong: v, source: pick.name, all: cands.map((c) => ({ name: c.name, sell: c.sell, buy: c.buy })) }) };
  } catch (e) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, reason: String(e) }) };
  }
};
