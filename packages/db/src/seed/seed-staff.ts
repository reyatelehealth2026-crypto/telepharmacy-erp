import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import { staff } from "../schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const staffData = [
  {
    email: "admin@reya.com",
    password: "Admin@reya2024!",
    title: "mr" as const,
    firstName: "ผู้ดูแล",
    lastName: "ระบบ",
    role: "super_admin" as const,
    isActive: true,
  },
  {
    email: "pharmacist@re-ya.com",
    password: "Pharm@reya2024!",
    title: "miss" as const,
    firstName: "สมหญิง",
    lastName: "เภสัชสกุล",
    role: "pharmacist" as const,
    licenseNo: "PH12345",
    isActive: true,
  },
  {
    email: "staff@re-ya.com",
    password: "Staff@reya2024!",
    title: "mr" as const,
    firstName: "สมชาย",
    lastName: "พนักงานสกุล",
    role: "customer_service" as const,
    isActive: true,
  },
];

async function seedStaff() {
  console.log("Seeding staff accounts...");
  let count = 0;

  for (const member of staffData) {
    const { password, ...rest } = member;
    const passwordHash = await bcrypt.hash(password, 10);

    await db
      .insert(staff)
      .values({ ...rest, passwordHash })
      .onConflictDoNothing();

    count++;
    console.log(`  ✓ ${rest.email} (${rest.role})`);
  }

  console.log(`✅ Staff seed complete — ${count} accounts`);
}

seedStaff()
  .catch(console.error)
  .finally(() => client.end());
