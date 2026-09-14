import { getStaffList, updateStaff, getPriceList, updatePriceList } from './lib/db';

async function runTest() {
  const results: any[] = [];
  const staffs = await getStaffList();
  if (staffs.length > 0) {
    const s = staffs[0];
    let res = { OPERASI: 'UPDATE (Existing)', TABEL: 'staff', HASIL: '', 'ERROR SEBENARNYA': '' };
    try {
        await updateStaff(s.id, { nama: s.nama }); // update with same value
        res.HASIL = 'SUKSES';
    } catch(err: any) {
        res.HASIL = 'GAGAL';
        res['ERROR SEBENARNYA'] = err.message || err.toString();
    }
    results.push(res);
  }

  const prices = await getPriceList();
  if (prices.length > 0) {
    const p = prices[0];
    let res = { OPERASI: 'UPDATE (Existing)', TABEL: 'price_list', HASIL: '', 'ERROR SEBENARNYA': '' };
    try {
        await updatePriceList(p.id, { harga: p.harga }, []); // update with same value
        res.HASIL = 'SUKSES';
    } catch(err: any) {
        res.HASIL = 'GAGAL';
        res['ERROR SEBENARNYA'] = err.message || err.toString();
    }
    results.push(res);
  }
  console.table(results);
}
runTest().catch(console.error);
