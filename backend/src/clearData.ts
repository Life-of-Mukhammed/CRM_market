import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './utils/db';
import { Product } from './models/Product';
import { Sale } from './models/Sale';

async function main() {
  await connectDB();

  const [products, sales] = await Promise.all([
    Product.deleteMany({}),
    Sale.deleteMany({}),
  ]);

  console.log(`O'chirildi: ${products.deletedCount} ta mahsulot, ${sales.deletedCount} ta sotuv tarixi.`);
  console.log("Foydalanuvchilar va kategoriyalar tegilmadi.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
