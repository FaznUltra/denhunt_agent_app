// Shared formatters. Reused across screens.

// Naira price with thousands separators, e.g. 2500000 -> "₦2,500,000".
export const formatPrice = (n: number): string => `₦${n.toLocaleString('en-NG')}`;

// Compact payment-frequency suffix for prices, e.g. "/yr".
export const frequencyLabel = (frequency: string): string => {
  switch (frequency) {
    case 'per_annum':
      return '/yr';
    case 'per_month':
      return '/mo';
    case 'per_night':
      return '/night';
    default:
      return '';
  }
};

// Payment period word (no slash), e.g. "yr" / "mo" / "night" / "outright".
export const paymentPeriod = (frequency: string): string => {
  switch (frequency) {
    case 'per_annum':
      return 'yr';
    case 'per_month':
      return 'mo';
    case 'per_night':
      return 'night';
    case 'outright':
      return 'outright';
    default:
      return '';
  }
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "DD MMM YYYY", e.g. "05 Jun 2026".
export const formatDate = (dateString: string): string => {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '–';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// Relative date: "today" / "yesterday" / "N days ago" / "DD MMM YYYY".
export const formatRelativeDate = (dateString: string): string => {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '–';
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(dateString);
};

// Capitalize each word, replacing underscores: "self_con" -> "Self Con".
export const capitalizeWords = (value: string): string =>
  value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

// snake_case amenity DB value -> human label.
export const AMENITY_LABELS: Record<string, string> = {
  '24hr_electricity': '24hr electricity',
  prepaid_meter: 'Prepaid meter',
  generator_backup: 'Generator backup',
  solar: 'Solar power',
  borehole: 'Borehole',
  running_water: 'Running water',
  security_guard: 'Security guard',
  cctv: 'CCTV',
  gated_estate: 'Gated estate',
  swimming_pool: 'Swimming pool',
  gym: 'Gym',
  parking: 'Parking',
  fibre_internet: 'Fibre internet',
  air_conditioning: 'Air conditioning',
  boys_quarters: 'Boys quarters',
};

export const amenityLabel = (value: string): string => AMENITY_LABELS[value] ?? capitalizeWords(value);

// Mask a phone for display: keep first 4 and last 3 digits, e.g. "0801 *** 789".
export const maskPhone = (phone: string): string =>
  phone.length >= 7 ? `${phone.slice(0, 4)} *** ${phone.slice(-3)}` : phone;

// Month + year, e.g. "Jun 2026".
export const formatMonthYear = (dateString: string): string => {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '–';
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// Normalise a Nigerian phone to WhatsApp format (234XXXXXXXXXX, no +).
export const toWhatsappNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0')) return `234${digits.slice(1)}`;
  return digits;
};
