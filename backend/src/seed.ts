import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from './utils/db';
import { User } from './models/User';
import { Product } from './models/Product';
import { Category } from './models/Category';
import mongoose from 'mongoose';

async function main() {
  await connectDB();
  console.log('MARKET uchun ma\'lumotlar bazasi to\'ldirilmoqda...');

  const direktorPhone = '+998901111111';
  const kassirPhone = '+998903333333';

  const direktor = await User.findOneAndUpdate(
    { phone: direktorPhone },
    {
      name: 'Direktor',
      phone: direktorPhone,
      password: await bcrypt.hash('market2024', 12),
      role: 'DIREKTOR',
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const kassir = await User.findOneAndUpdate(
    { phone: kassirPhone },
    {
      name: 'Kassir',
      phone: kassirPhone,
      password: await bcrypt.hash('kassir2024', 12),
      role: 'KASSIR',
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('Foydalanuvchilar yaratildi:', direktor.name, kassir.name);

  const atirCat = await Category.findOneAndUpdate(
    { name: 'Atirlar' },
    { name: 'Atirlar', icon: '🧴', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const kitobCat = await Category.findOneAndUpdate(
    { name: 'Kitoblar' },
    { name: 'Kitoblar', icon: '📖', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('Kategoriyalar yaratildi:', atirCat.name, kitobCat.name);

  const sampleProducts = [
    { name: 'Chanel No. 5', category: atirCat._id, brand: 'Chanel', costPrice: 450000, salePrice: 650000, quantity: 12, barcode: '1000000000001' },
    { name: 'Dior Sauvage', category: atirCat._id, brand: 'Dior', costPrice: 500000, salePrice: 720000, quantity: 8, barcode: '1000000000002' },
    { name: 'Versace Eros', category: atirCat._id, brand: 'Versace', costPrice: 380000, salePrice: 550000, quantity: 15, barcode: '1000000000003' },
    { name: 'Lattafa Khamrah', category: atirCat._id, brand: 'Lattafa', costPrice: 120000, salePrice: 190000, quantity: 25, barcode: '1000000000004' },
    { name: "Otkan kunlar", category: kitobCat._id, author: "Abdulla Qodiriy", costPrice: 25000, salePrice: 45000, quantity: 20, barcode: '2000000000001' },
    { name: 'Sariq devni minib', category: kitobCat._id, author: "Xudoyberdi To'xtaboyev", costPrice: 22000, salePrice: 40000, quantity: 18, barcode: '2000000000002' },
    { name: 'Atomic Habits', category: kitobCat._id, author: 'James Clear', costPrice: 35000, salePrice: 60000, quantity: 10, barcode: '2000000000003' },
    { name: 'Rich Dad Poor Dad', category: kitobCat._id, author: 'Robert Kiyosaki', costPrice: 30000, salePrice: 55000, quantity: 14, barcode: '2000000000004' },
  ];

  for (const p of sampleProducts) {
    await Product.findOneAndUpdate(
      { barcode: p.barcode },
      {
        $set: { ...p, createdBy: direktor._id, isActive: true },
        $unset: { type: '' },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log('Namuna mahsulotlar yaratildi:', sampleProducts.length);
  console.log('\n=== TAYYOR ===');
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
