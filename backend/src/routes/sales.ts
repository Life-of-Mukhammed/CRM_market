import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Sale, ISaleItem } from '../models/Sale';
import { Product } from '../models/Product';
import { authenticate } from '../middleware/auth';

const PaymentTypes = ['NAQD', 'KARTA', 'ARALASH'] as const;

const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(0.01),
});

const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1),
  discount: z.number().min(0).default(0),
  paymentType: z.enum(PaymentTypes),
  note: z.string().optional(),
});

function generateSaleNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const time = Date.now().toString().slice(-6);
  return `IMP${y}${m}${d}-${time}`;
}

export async function salesRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = createSaleSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Нотўғри маълумот" });
    const data = parsed.data;

    const session = await mongoose.startSession();
    try {
      let sale;
      await session.withTransaction(async () => {
        const items: ISaleItem[] = [];
        let totalAmount = 0;

        for (const item of data.items) {
          const product = await Product.findById(item.productId).session(session);
          if (!product || !product.isActive) {
            throw new Error(`Маҳсулот топилмади: ${item.productId}`);
          }
          if (product.quantity < item.quantity) {
            throw new Error(`"${product.name}" учун омборда етарли маҳсулот йўқ`);
          }

          const totalPrice = product.salePrice * item.quantity;
          totalAmount += totalPrice;
          items.push({
            product: product._id,
            name: product.name,
            quantity: item.quantity,
            unitPrice: product.salePrice,
            discount: 0,
            totalPrice,
          });

          product.quantity -= item.quantity;
          await product.save({ session });
        }

        const finalAmount = Math.max(0, totalAmount - data.discount);

        const created = await Sale.create(
          [
            {
              saleNumber: generateSaleNumber(),
              kassir: request.user.userId,
              items,
              totalAmount,
              discount: data.discount,
              finalAmount,
              paymentType: data.paymentType,
              note: data.note,
            },
          ],
          { session }
        );
        sale = created[0];
      });

      return sale;
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message || 'Сотувни яратиб бўлмади' });
    } finally {
      await session.endSession();
    }
  });

  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const query = request.query as {
      kassirId?: string;
      startDate?: string;
      endDate?: string;
      page?: string;
      limit?: string;
    };
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (request.user.role === 'KASSIR') {
      where.kassir = request.user.userId;
    } else if (query.kassirId) {
      where.kassir = query.kassirId;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) (where.createdAt as Record<string, Date>).$gte = new Date(query.startDate);
      if (query.endDate) (where.createdAt as Record<string, Date>).$lte = new Date(query.endDate);
    }

    const [sales, total] = await Promise.all([
      Sale.find(where)
        .populate('kassir', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Sale.countDocuments(where),
    ]);

    return { sales, total, page, limit };
  });

  app.get('/today', { preHandler: [authenticate] }, async (request) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: Record<string, unknown> = {
      createdAt: { $gte: today, $lt: tomorrow },
      status: 'COMPLETED',
    };
    if (request.user.role === 'KASSIR') where.kassir = request.user.userId;

    const sales = await Sale.find(where).sort({ createdAt: -1 });

    const revenue = sales.reduce((sum, s) => sum + s.finalAmount, 0);
    const count = sales.length;

    return { sales, stats: { count, revenue } };
  });

  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const sale = await Sale.findById(id);
    if (!sale) return reply.status(404).send({ error: 'Сотув топилмади' });

    if (request.user.role === 'KASSIR' && sale.kassir.toString() !== request.user.userId) {
      return reply.status(403).send({ error: "Рухсат йўқ" });
    }

    await sale.populate('kassir', 'name');
    return sale;
  });
}
