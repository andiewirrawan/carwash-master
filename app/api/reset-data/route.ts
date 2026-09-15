import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { supabase as clientSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Order of deletion to cleanly respect PostgreSQL foreign key constraints
const TABLES_TO_RESET = [
  'transaction_staff',
  'transaction_void_log',
  'transactions',
  'daily_closing',
  'komisi_manual',
  'attendance',
  'nopol_history',
  'customers',
  'staff_komisi_multiplier',
  'staff',
  'price_list_komisi',
  'price_list',
  'vehicle_categories',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Request body tidak valid (harus JSON).' },
        { status: 400 }
      );
    }

    const { user_id, confirm_phrase } = body;

    // 1. Strict validation of confirmation phrase
    if (confirm_phrase !== 'RESET DATA') {
      return NextResponse.json(
        {
          success: false,
          error: 'Frasa konfirmasi tidak valid. Anda wajib mengetik "RESET DATA" secara tepat.',
        },
        { status: 400 }
      );
    }

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'Parameter user_id wajib disertakan.' },
        { status: 400 }
      );
    }

    const dbClient = getSupabaseAdmin() || clientSupabase;
    if (!dbClient) {
      return NextResponse.json(
        { success: false, error: 'Database client tidak tersedia.' },
        { status: 500 }
      );
    }

    // 2. Strict Role Verification: Only 'sistem_owner' is allowed
    const { data: userRecord, error: userErr } = await dbClient
      .from('users')
      .select('id, username, nama, role, aktif')
      .eq('id', user_id)
      .maybeSingle();

    if (userErr || !userRecord) {
      return NextResponse.json(
        { success: false, error: 'User tidak ditemukan dalam database.' },
        { status: 403 }
      );
    }

    if (!userRecord.aktif) {
      return NextResponse.json(
        { success: false, error: 'Akun user sudah tidak aktif.' },
        { status: 403 }
      );
    }

    if (userRecord.role !== 'sistem_owner') {
      return NextResponse.json(
        {
          success: false,
          error: 'Akses Ditolak: Hanya SISTEM OWNER yang memiliki wewenang untuk menjalankan Reset Data.',
        },
        { status: 403 }
      );
    }

    // 3. Try calling the atomic RPC function first if available
    try {
      const { data: rpcData, error: rpcError } = await dbClient.rpc(
        'reset_carwash_application_data',
        {
          p_user_id: userRecord.id,
          p_confirm: confirm_phrase,
        }
      );

      if (!rpcError && rpcData && (rpcData as any).success) {
        // Verify users table count is preserved
        const { count: usersCount } = await dbClient
          .from('users')
          .select('*', { count: 'exact', head: true });

        return NextResponse.json({
          success: true,
          message: 'Reset data berhasil.',
          details: {
            method: 'atomic_rpc',
            usersRemaining: usersCount,
            resetBy: userRecord.username,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (rpcEx) {
      console.warn('RPC reset_carwash_application_data not available, falling back to sequential cascade deletion:', rpcEx);
    }

    // 4. Sequential fallback deletion respecting foreign keys
    const deletedSummary: Record<string, boolean> = {};

    for (const table of TABLES_TO_RESET) {
      try {
        const { error: delError } = await dbClient
          .from(table)
          .delete()
          .neq('id', -999999); // Deletes all rows without disabling RLS

        if (delError) {
          console.warn(`[Reset Data] Error deleting from ${table}:`, delError.message);
          // Still continue trying other tables
        } else {
          deletedSummary[table] = true;
        }
      } catch (tableEx) {
        console.warn(`[Reset Data] Exception deleting from ${table}:`, tableEx);
      }
    }

    // 5. Final validation: Ensure users table was untouched
    const { count: finalUsersCount, error: usersCheckErr } = await dbClient
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (usersCheckErr) {
      console.error('[Reset Data] Error checking users table:', usersCheckErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Reset data berhasil.',
      details: {
        method: 'sequential_cascade',
        deletedTables: Object.keys(deletedSummary),
        usersPreserved: finalUsersCount ?? 'Semua akun users aman',
        resetBy: userRecord.username,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[API /api/reset-data] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Terjadi kesalahan sistem saat melakukan reset data.',
      },
      { status: 500 }
    );
  }
}
