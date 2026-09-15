import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { supabase as clientSupabase } from '@/lib/supabase';
import { PriceList, PriceListKomisi } from '@/types/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getDb() {
  return getSupabaseAdmin() || clientSupabase;
}

// Verifikasi user yang meminta memiliki wewenang (spv, owner, sistem_owner)
async function verifyAccess(requestingUserId: number | null | undefined): Promise<{
  authorized: boolean;
  error?: string;
  user?: any;
}> {
  if (!requestingUserId || isNaN(Number(requestingUserId))) {
    return {
      authorized: false,
      error: 'Akses ditolak: Identitas user peminta (requesting_user_id) tidak disertakan.',
    };
  }

  const db = getDb();
  if (!db) {
    return { authorized: false, error: 'Database tidak terhubung.' };
  }

  const { data: user, error } = await db
    .from('users')
    .select('id, username, role, aktif')
    .eq('id', Number(requestingUserId))
    .maybeSingle();

  if (error || !user) {
    return { authorized: false, error: 'User tidak ditemukan.' };
  }

  if (!user.aktif) {
    return { authorized: false, error: 'Akun Anda telah dinonaktifkan.' };
  }

  const allowedRoles = ['spv', 'owner', 'sistem_owner'];
  if (!allowedRoles.includes(user.role)) {
    return {
      authorized: false,
      error: `Akses ditolak: Role '${user.role}' tidak memiliki izin mengelola Harga & Komisi.`,
    };
  }

  return { authorized: true, user };
}

// GET: Mengambil seluruh price_list beserta relasi price_list_komisi
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database tidak terhubung' }, { status: 500 });
    }

    const { data: priceList, error: pError } = await db
      .from('price_list')
      .select('*')
      .order('id', { ascending: true });

    if (pError) {
      console.error('[API /api/price-list GET price_list error]:', pError);
      return NextResponse.json({ success: false, error: pError.message }, { status: 500 });
    }

    const { data: komisiList, error: kError } = await db
      .from('price_list_komisi')
      .select('*')
      .order('id', { ascending: true });

    if (kError) {
      console.error('[API /api/price-list GET price_list_komisi error]:', kError);
    }

    const allKomisi = (komisiList || []).map((k: any) => ({
      ...k,
      komisi: Number(k.komisi) || 0,
    })) as PriceListKomisi[];

    const formattedList: PriceList[] = (priceList || []).map((p: any) => {
      const matchedKomisi = allKomisi.filter((k) => k.price_list_id === p.id);
      const washerKomisi = matchedKomisi.find((k) => k.peran.toLowerCase() === 'washer')?.komisi;
      const checkerKomisi = matchedKomisi.find((k) => k.peran.toLowerCase() === 'checker')?.komisi;

      return {
        id: p.id,
        kendaraan: p.kendaraan,
        paket: p.paket,
        paket_nama: p.paket,
        fasilitas: p.fasilitas,
        tipe: p.tipe,
        harga: Number(p.harga) || 0,
        komisi_list: matchedKomisi,
        komisi_washer: washerKomisi !== undefined ? washerKomisi : Number(p.komisi_washer || 0),
        komisi_checker: checkerKomisi !== undefined ? checkerKomisi : Number(p.komisi_checker || 0),
      };
    });

    return NextResponse.json({ success: true, data: formattedList });
  } catch (err: any) {
    console.error('[API /api/price-list GET error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Menambah paket price_list baru beserta komisi peran
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: 'Request body tidak valid.' }, { status: 400 });
    }

    const { requesting_user_id, kendaraan, paket, fasilitas, tipe, harga, komisi_list } = body;

    const authCheck = await verifyAccess(requesting_user_id);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: 403 });
    }

    if (!kendaraan || !paket || !fasilitas || !tipe || harga === undefined) {
      return NextResponse.json({ success: false, error: 'Semua kolom paket wajib diisi.' }, { status: 400 });
    }

    const db = getDb();
    const cleanHarga = Number(harga) || 0;

    // Hitung komisi_washer & komisi_checker dari komisi_list untuk backward compatibility kolom price_list
    let kw = 0;
    let kc = 0;
    if (Array.isArray(komisi_list)) {
      const w = komisi_list.find((k: any) => k.peran?.toLowerCase() === 'washer');
      const c = komisi_list.find((k: any) => k.peran?.toLowerCase() === 'checker');
      if (w) kw = Number(w.komisi) || 0;
      if (c) kc = Number(c.komisi) || 0;
    }

    const { data: newPrice, error: pInsertErr } = await db
      .from('price_list')
      .insert([
        {
          kendaraan: String(kendaraan).trim(),
          paket: String(paket).trim(),
          fasilitas: String(fasilitas).trim(),
          tipe: String(tipe).trim(),
          harga: cleanHarga,
          komisi_washer: kw,
          komisi_checker: kc,
        },
      ])
      .select()
      .single();

    if (pInsertErr) {
      console.error('[API /api/price-list POST Error]:', pInsertErr);
      return NextResponse.json({ success: false, error: pInsertErr.message }, { status: 500 });
    }

    // Simpan komisi ke price_list_komisi
    let savedKomisi: PriceListKomisi[] = [];
    if (Array.isArray(komisi_list) && komisi_list.length > 0) {
      const komisiPayload = komisi_list
        .filter((k: any) => k.peran && String(k.peran).trim() !== '')
        .map((k: any) => ({
          price_list_id: newPrice.id,
          peran: String(k.peran).trim().toLowerCase(),
          komisi: Number(k.komisi) || 0,
        }));

      if (komisiPayload.length > 0) {
        const { data: kData, error: kInsertErr } = await db
          .from('price_list_komisi')
          .insert(komisiPayload)
          .select();

        if (kInsertErr) {
          console.error('[API /api/price-list POST komisi error]:', kInsertErr);
        } else {
          savedKomisi = kData as PriceListKomisi[];
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Paket harga dan komisi berhasil ditambahkan.',
      data: {
        ...newPrice,
        komisi_list: savedKomisi,
      },
    });
  } catch (err: any) {
    console.error('[API /api/price-list POST exception]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update paket price_list dan sinkronisasi price_list_komisi
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: 'Request body tidak valid.' }, { status: 400 });
    }

    const { requesting_user_id, id, kendaraan, paket, fasilitas, tipe, harga, komisi_list } = body;

    const authCheck = await verifyAccess(requesting_user_id);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: 403 });
    }

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ success: false, error: 'ID paket wajib disertakan.' }, { status: 400 });
    }

    const targetId = Number(id);
    const db = getDb();

    const priceUpdatePayload: Record<string, any> = {};
    if (kendaraan !== undefined) priceUpdatePayload.kendaraan = String(kendaraan).trim();
    if (paket !== undefined) priceUpdatePayload.paket = String(paket).trim();
    if (fasilitas !== undefined) priceUpdatePayload.fasilitas = String(fasilitas).trim();
    if (tipe !== undefined) priceUpdatePayload.tipe = String(tipe).trim();
    if (harga !== undefined) priceUpdatePayload.harga = Number(harga) || 0;

    // Update komisi_washer & komisi_checker di price_list untuk backward compatibility
    if (Array.isArray(komisi_list)) {
      const w = komisi_list.find((k: any) => k.peran?.toLowerCase() === 'washer');
      const c = komisi_list.find((k: any) => k.peran?.toLowerCase() === 'checker');
      if (w !== undefined) priceUpdatePayload.komisi_washer = Number(w.komisi) || 0;
      if (c !== undefined) priceUpdatePayload.komisi_checker = Number(c.komisi) || 0;
    }

    const { data: updatedPrice, error: pUpdateErr } = await db
      .from('price_list')
      .update(priceUpdatePayload)
      .eq('id', targetId)
      .select()
      .single();

    if (pUpdateErr) {
      console.error('[API /api/price-list PUT Error]:', pUpdateErr);
      return NextResponse.json({ success: false, error: pUpdateErr.message }, { status: 500 });
    }

    // Sinkronisasi tabel price_list_komisi:
    // Hapus record lama untuk price_list_id ini, lalu simpan role yang baru
    let savedKomisi: PriceListKomisi[] = [];
    if (Array.isArray(komisi_list)) {
      await db.from('price_list_komisi').delete().eq('price_list_id', targetId);

      const komisiPayload = komisi_list
        .filter((k: any) => k.peran && String(k.peran).trim() !== '')
        .map((k: any) => ({
          price_list_id: targetId,
          peran: String(k.peran).trim().toLowerCase(),
          komisi: Number(k.komisi) || 0,
        }));

      if (komisiPayload.length > 0) {
        const { data: kData, error: kInsertErr } = await db
          .from('price_list_komisi')
          .insert(komisiPayload)
          .select();

        if (kInsertErr) {
          console.error('[API /api/price-list PUT komisi error]:', kInsertErr);
        } else {
          savedKomisi = kData as PriceListKomisi[];
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Paket harga dan komisi berhasil diperbarui.',
      data: {
        ...updatedPrice,
        komisi_list: savedKomisi,
      },
    });
  } catch (err: any) {
    console.error('[API /api/price-list PUT exception]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Hapus paket
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    const reqUserParam = searchParams.get('requesting_user_id');

    const targetId = idParam ? parseInt(idParam, 10) : null;
    const requestingUserId = reqUserParam ? parseInt(reqUserParam, 10) : null;

    const authCheck = await verifyAccess(requestingUserId);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: 403 });
    }

    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Parameter id paket wajib disertakan.' }, { status: 400 });
    }

    const db = getDb();
    await db.from('price_list_komisi').delete().eq('price_list_id', targetId);
    const { error: deleteErr } = await db.from('price_list').delete().eq('id', targetId);

    if (deleteErr) {
      return NextResponse.json({ success: false, error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Paket layanan berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
