const THAI_YEAR_OFFSET = 543;

export function formatThaiDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const thaiYear = date.getFullYear() + THAI_YEAR_OFFSET;
  return `${day}/${month}/${thaiYear}`;
}

export function generateOrderNo(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `REYA-${y}${m}${d}-${seq}`;
}

export function generateRxNo(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `RX-${y}${m}${d}-${seq}`;
}

export function generatePatientNo(seq: number): string {
  return `PT-${String(seq).padStart(5, "0")}`;
}

export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);
}
