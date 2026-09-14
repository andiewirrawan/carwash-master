import { addStaff, updateStaff, deleteStaff, addPriceList, updatePriceList, deletePriceList } from './lib/db';

async function runWriteTest() {
  const results: any[] = [];
  
  // 1. INSERT staff
  let staffId = null;
  let s1 = { OPERASI: 'INSERT', TABEL: 'staff', HASIL: '', 'ERROR SEBENARNYA': '' };
  try {
    const res = await addStaff({ nama: 'TEST_WRITE_STAFF', role: 'washer', aktif: true });
    staffId = res.id;
    s1.HASIL = 'SUKSES';
  } catch (err: any) {
    s1.HASIL = 'GAGAL';
    s1['ERROR SEBENARNYA'] = err.message || err.toString();
  }
  results.push(s1);

  // 2. UPDATE staff
  let s2 = { OPERASI: 'UPDATE', TABEL: 'staff', HASIL: '', 'ERROR SEBENARNYA': '' };
  if (staffId) {
    try {
      await updateStaff(staffId, { nama: 'TEST_WRITE_STAFF_UPD' });
      s2.HASIL = 'SUKSES';
    } catch (err: any) {
      s2.HASIL = 'GAGAL';
      s2['ERROR SEBENARNYA'] = err.message || err.toString();
    }
  } else {
    s2.HASIL = 'N/A';
    s2['ERROR SEBENARNYA'] = 'Insert sebelumnya gagal';
  }
  results.push(s2);

  // 3. DELETE staff
  let s3 = { OPERASI: 'DELETE', TABEL: 'staff', HASIL: '', 'ERROR SEBENARNYA': '' };
  if (staffId) {
    try {
      await deleteStaff(staffId);
      s3.HASIL = 'SUKSES';
    } catch (err: any) {
      s3.HASIL = 'GAGAL';
      s3['ERROR SEBENARNYA'] = err.message || err.toString();
    }
  } else {
    s3.HASIL = 'N/A';
    s3['ERROR SEBENARNYA'] = 'Insert sebelumnya gagal';
  }
  results.push(s3);

  // 4. INSERT price_list
  let priceId = null;
  let p1 = { OPERASI: 'INSERT', TABEL: 'price_list', HASIL: '', 'ERROR SEBENARNYA': '' };
  try {
    const res = await addPriceList({ kendaraan: 'Mobil', paket: 'TEST_PAKET', fasilitas: '-', tipe: 'Small', harga: 10000 }, []);
    priceId = res.id;
    p1.HASIL = 'SUKSES';
  } catch (err: any) {
    p1.HASIL = 'GAGAL';
    p1['ERROR SEBENARNYA'] = err.message || err.toString();
  }
  results.push(p1);

  // 5. UPDATE price_list
  let p2 = { OPERASI: 'UPDATE', TABEL: 'price_list', HASIL: '', 'ERROR SEBENARNYA': '' };
  if (priceId) {
    try {
      await updatePriceList(priceId, { harga: 20000 }, []);
      p2.HASIL = 'SUKSES';
    } catch (err: any) {
      p2.HASIL = 'GAGAL';
      p2['ERROR SEBENARNYA'] = err.message || err.toString();
    }
  } else {
    p2.HASIL = 'N/A';
    p2['ERROR SEBENARNYA'] = 'Insert sebelumnya gagal';
  }
  results.push(p2);

  console.table(results);
}

runWriteTest().catch(console.error);
