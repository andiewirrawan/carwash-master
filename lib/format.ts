/**
 * Format currency nominal with Indonesian thousand separators (dots), strictly without "Rp".
 * Example: 200000 -> "200.000", 15000 -> "15.000"
 */
export function formatNominal(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(num);
}

/**
 * Parses user formatted string (e.g. "200.000") back to a raw integer/number for DB storage.
 */
export function parseNominal(str: string | number): number {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const clean = str.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

/**
 * Format date to dd/mm/yyyy string.
 * Accepts ISO string, YYYY-MM-DD, or Date object.
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  
  try {
    let dateObj: Date;
    if (typeof dateInput === 'string') {
      // Handle YYYY-MM-DD local format properly without timezone shifts
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        const [y, m, d] = dateInput.split('-').map(Number);
        dateObj = new Date(y, m - 1, d);
      } else {
        dateObj = new Date(dateInput);
      }
    } else {
      dateObj = dateInput;
    }

    if (isNaN(dateObj.getTime())) return String(dateInput);

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

// Aliases for convenience
export const formatRupiah = formatNominal;
export const formatDateID = formatDate;

/**
 * Format date to short day/month for charts (e.g., "12/09")
 */
export function formatChartDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  try {
    let dateObj: Date;
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, d] = dateInput.split('-').map(Number);
      dateObj = new Date(y, m - 1, d);
    } else {
      dateObj = new Date(dateInput as any);
    }
    if (isNaN(dateObj.getTime())) return String(dateInput);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Format month-year display (e.g. "September 2026" or "09/2026")
 */
export function formatMonthYear(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    let dateObj: Date;
    if (typeof dateInput === 'string') {
      if (/^\d{4}-\d{2}$/.test(dateInput)) {
        const [y, m] = dateInput.split('-').map(Number);
        dateObj = new Date(y, m - 1, 1);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        const [y, m, d] = dateInput.split('-').map(Number);
        dateObj = new Date(y, m - 1, d);
      } else {
        dateObj = new Date(dateInput);
      }
    } else {
      dateObj = dateInput;
    }

    if (isNaN(dateObj.getTime())) return String(dateInput);

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Format date to input string YYYY-MM-DD (for HTML <input type="date">)
 */
export function toInputDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return new Date().toISOString().split('T')[0];
  try {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Returns Monday and Sunday for the week of the given date (Senin - Minggu)
 */
export function getMondayAndSundayOfWeek(dateInput?: string | Date): { monday: string; sunday: string } {
  let d: Date;
  if (!dateInput) {
    d = new Date();
  } else if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, day] = dateInput.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(dateInput);
  }

  const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMonday);

  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);

  return {
    monday: toInputDate(mon),
    sunday: toInputDate(sun),
  };
}

/**
 * Get Indonesian day name
 */
export function getIndonesianDayName(dateInput: string | Date): string {
  try {
    let d: Date;
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, day] = dateInput.split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(dateInput);
    }
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[d.getDay()] || '';
  } catch {
    return '';
  }
}

