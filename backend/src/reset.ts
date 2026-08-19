import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './utils/db';
import { seedUsers, direktorPhone, kassirPhone } from './seed';

async function main() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error('Ulanish topilmadi');

  console.log(`"${db.databaseName}" bazasi butunlay tozalanmoqda...`);
  await db.dropDatabase();
  console.log('Baza tozalandi (mahsulotlar, kategoriyalar, sotuvlar, foydalanuvchilar — hammasi o\'chirildi).');
  console.log('Tizimga kirish uchun login qayta yaratilmoqda...\n');

  await seedUsers();

  console.log('\n=== TAYYOR ===');
  console.log('Baza butunlay bo\'sh. Kategoriya va mahsulotlarni ilovadan qaytadan kiritishingiz mumkin.');
  console.log('Direktor:', direktorPhone, '/ market2024');
  console.log('Kassir:  ', kassirPhone, '/ kassir2024');
  console.log('\nDIQQAT: Ishlab chiqarishda parollarni albatta o\'zgartiring!');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
