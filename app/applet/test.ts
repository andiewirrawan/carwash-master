import { getVehicleCategories, addVehicleCategory, updateVehicleCategory, deleteVehicleCategory, getStaffList, addStaff, updateStaff, deleteStaff, getCustomers, addCustomer, updateCustomer, getPriceList, addPriceList, updatePriceList, deletePriceList, getUsersList } from './lib/db';

async function testSupabase() {
  const results: any[] = [];
  
  // 1. Master Kendaraan
  let vehStatus = { FITUR: 'Master Kendaraan', READ: 'BELUM DITES', CREATE: 'BELUM DITES', UPDATE: 'BELUM DITES', DELETE: 'BELUM DITES', STATUS: 'PROSES' };
  try {
    const list = await getVehicleCategories();
    vehStatus.READ = 'OK';
    const create = await addVehicleCategory({ nama: 'TEST_KENDARAAN_123', urutan: 99, isActive: true });
    vehStatus.CREATE = 'OK';
    await updateVehicleCategory(create.id, { nama: 'TEST_KENDARAAN_UPD' });
    vehStatus.UPDATE = 'OK';
    await deleteVehicleCategory(create.id);
    vehStatus.DELETE = 'OK';
    vehStatus.STATUS = 'BERHASIL';
  } catch (e: any) {
    vehStatus.STATUS = 'GAGAL: ' + e.message;
  }
  results.push(vehStatus);

  // 2. Master Staff
  let staffStatus = { FITUR: 'Master Staff', READ: 'BELUM DITES', CREATE: 'BELUM DITES', UPDATE: 'BELUM DITES', DELETE: 'BELUM DITES', STATUS: 'PROSES' };
  try {
    await getStaffList();
    staffStatus.READ = 'OK';
    const create = await addStaff({ nama: 'TEST_STAFF', role: 'washer', is_active: true });
    staffStatus.CREATE = 'OK';
    await updateStaff(create.id, { nama: 'TEST_STAFF_UPD' });
    staffStatus.UPDATE = 'OK';
    await deleteStaff(create.id);
    staffStatus.DELETE = 'OK';
    staffStatus.STATUS = 'BERHASIL';
  } catch (e: any) {
    staffStatus.STATUS = 'GAGAL: ' + e.message;
  }
  results.push(staffStatus);

  // 3. Master Harga (Price List)
  let priceStatus = { FITUR: 'Master Harga', READ: 'BELUM DITES', CREATE: 'BELUM DITES', UPDATE: 'BELUM DITES', DELETE: 'BELUM DITES', STATUS: 'PROSES' };
  try {
    await getPriceList();
    priceStatus.READ = 'OK';
    const create = await addPriceList({ kendaraan: 'TEST_KENDARAAN_123', tipe: 'TEST_TIPE', paket: 'TEST_PAKET', harga: 50000, is_active: true, fasilitas: 'TEST' }, []);
    priceStatus.CREATE = 'OK';
    await updatePriceList(create.id, { harga: 60000 }, []);
    priceStatus.UPDATE = 'OK';
    await deletePriceList(create.id);
    priceStatus.DELETE = 'OK';
    priceStatus.STATUS = 'BERHASIL';
  } catch (e: any) {
    priceStatus.STATUS = 'GAGAL: ' + e.message;
  }
  results.push(priceStatus);

  // 4. Data Customer
  let custStatus = { FITUR: 'Data Customer', READ: 'BELUM DITES', CREATE: 'BELUM DITES', UPDATE: 'BELUM DITES', DELETE: 'N/A', STATUS: 'PROSES' };
  try {
    await getCustomers();
    custStatus.READ = 'OK';
    const create = await addCustomer({ nopol: 'T 357 A', nama: 'TEST_CUST', hp: '0812', tier: 'reguler', kendaraan: 'Mobil', total_kunjungan: 0, total_omzet: 0 });
    custStatus.CREATE = 'OK';
    await updateCustomer(create.id, { nama: 'TEST_CUST_UPD' });
    custStatus.UPDATE = 'OK';
    custStatus.STATUS = 'BERHASIL';
  } catch (e: any) {
    custStatus.STATUS = 'GAGAL: ' + e.message;
  }
  results.push(custStatus);

  // 5. Kelola User
  let userStatus = { FITUR: 'Kelola User', READ: 'BELUM DITES', CREATE: 'BELUM DITES', UPDATE: 'BELUM DITES', DELETE: 'BELUM DITES', STATUS: 'PROSES' };
  try {
    await getUsersList();
    userStatus.READ = 'OK';
    // skip create/delete to avoid messing up login if it errors, wait, I can make a test user
    // userStatus.CREATE = 'BELUM DITES (Menghindari risiko Auth)';
    // userStatus.STATUS = 'PARSIAL';
  } catch (e: any) {
    userStatus.STATUS = 'GAGAL: ' + e.message;
  }
  results.push(userStatus);
  
  console.table(results);
}

testSupabase().then(() => console.log('Selesai')).catch(console.error);
