import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI aniqlanmagan. .env faylini tekshiring.');
  }

  mongoose.connection.on('connected', () => console.log('MongoDB ulanish muvaffaqiyatli'));
  mongoose.connection.on('error', (err) => console.error('MongoDB xatolik:', err));

  await mongoose.connect(uri);
}
