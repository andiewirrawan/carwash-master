import { addStaff, updateStaff, deleteStaff, addPriceList, updatePriceList, deletePriceList } from './lib/db';

async function runWriteTest() {
  const results: any[] = [];
  
  // 1. INSERT staff
  let staffId = null;
  let s1 = { OPERASI: 'INSERT', TABEL: 'staff', HASIL: '', 'ERROR': '' };
  try {
    const res = await addStaff({ nama: 'TEST_CRUD_STAFF', role: 'washer', aktif: true });
    staffId = res.id;
    s1.HASIL = 'SUKSES';
  } catch (err: any) {
    s1.HASIL = 'GAGAL';
    s1['ERROR'] = err.message || err.toString();
  }
  results.push(s1);

  if (staffId) {
      // 2. UPDATE staff
      let s2 = { OPERASI: 'UPDATE', TABEL: 'staff', HASIL: '', 'ERROR': '' };
      try {
        await updateStaff(staffId, { nama: 'TEST_CRUD_STAFF_UPD' });
        s2.HASIL = 'SUKSES';
      } catch (err: any) {
        s2.HASIL = 'GAGAL';
        s2['ERROR'] = err.message || err.toString();
      }
      results.push(s2);

      // 3. DELETE staff
      let s3 = { OPERASI: 'DELETE', TABEL: 'staff', HASIL: '', 'ERROR': '' };
      try {
        await deleteStaff(staffId);
        s3.HASIL = 'SUKSES';
      } catch (err: any) {
        s3.HASIL = 'GAGAL';
        s3['ERROR'] = err.message || err.toString();
      }
      results.push(s3);
  }

  // 4. INSERT price_list
  let priceId = null;
  let p1 = { OPERASI: 'INSERT', TABEL: 'price_list', HASIL: '', 'ERROR': '' };
  try {
    const res = await addPriceList({ kendaraan: 'Mobil', paket: 'TEST_PAKET', fasilitas: '-', tipe: 'Small', harga: 10000 }, []);
    priceId = res.id;
    p1.HASIL = 'SUKSES';
  } catch (err: any) {
    p1.HASIL = 'GAGAL';
    p1['ERROR'] = err.message || err.toString();
  }
  results.push(p1);

  if (priceId) {
      // 5. UPDATE price_list
      let p2 = { OPERASI: 'UPDATE', TABEL: 'price_list', HASIL: '', 'ERROR': '' };
      try {
        await updatePriceList(priceId, { harga: 20000 }, []);
        p2.HASIL = 'SUKSES';
      } catch (err: any) {
        p2.HASIL = 'GAGAL';
        p2['ERROR'] = err.message || err.toString();
      }
      results.push(p2);
      
      let p3 = { OPERASI: 'DELETE', TABEL: 'price_list', HASIL: '', 'ERROR': '' };
      try {
        await deletePriceList(priceId);
        p3.HASIL = 'SUKSES';
      } catch (err: any) {
        p3.HASIL = 'GAGAL';
        p3['ERROR'] = err.message || err.toString();
      }
      results.push(p3);
  }

  console.table(results);
}

runWriteTest().catch(console.error);
