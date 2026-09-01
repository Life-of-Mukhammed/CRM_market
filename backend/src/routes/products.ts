import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { authenticate, requireRole } from '../middleware/auth';

const categoryLookupStage = {
  $lookup: {
    from: 'categories',
    localField: 'category',
    foreignField: '_id',
    as: 'category',
    pipeline: [{ $project: { name: 1, icon: 1 } }],
  },
};

// Mirrors the shape Product's toJSON transform + populate('category', 'name icon')
// used to produce, but for raw aggregation output (which skips Mongoose's
// document transforms since it returns plain objects).
function serializeProduct(doc: Record<string, any>) {
  const { _id, __v, category, ...rest } = doc;
  return {
    ...rest,
    id: _id,
    category: category ? { id: category._id, name: category.name, icon: category.icon } : undefined,
  };
}

const productSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  brand: z.string().optional(),
  author: z.string().optional(),
  barcode: z.string().optional(),
  image: z.string().optional(),
  description: z.string().optional(),
  costPrice: z.number().min(0),
  salePrice: z.number().min(0),
  quantity: z.number().min(0).optional(),
  minAlert: z.number().min(0).optional(),
  unit: z.string().default('дона'),
});

export async function productRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const query = request.query as {
      search?: string;
      category?: string;
      page?: string;
      limit?: string;
    };
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '50'), 200);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isActive: true };
    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      where.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { barcode: { $regex: escaped, $options: 'i' } },
      ];
    }
    // Aggregation's $match does its own BSON matching and, unlike Mongoose's
    // query casting, won't coerce a string into the ObjectId the `category`
    // field is actually stored as — so this must be cast explicitly or the
    // filter silently matches nothing.
    if (query.category && mongoose.Types.ObjectId.isValid(query.category)) {
      where.category = new mongoose.Types.ObjectId(query.category);
    }

    // A single aggregation (data page + total count + category lookup) instead
    // of three separate round trips to the DB — on a remote cluster each round
    // trip costs hundreds of ms, so this is the difference between one network
    // hop and three for every product list/search request.
    const [result] = await Product.aggregate([
      { $match: where },
      { $sort: { name: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }, categoryLookupStage, { $unwind: '$category' }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const products = (result?.data || []).map(serializeProduct);
    const total = result?.totalCount[0]?.count || 0;

    return { products, total, page, limit };
  });

  app.get('/barcode/:barcode', { preHandler: [authenticate] }, async (request, reply) => {
    const { barcode } = request.params as { barcode: string };
    const code = barcode.trim();

    // EAN-13 codes are just a UPC-A code with a leading 0. Different
    // cameras/decoders (native BarcodeDetector vs the ZXing JS fallback used
    // on iOS Safari) aren't consistent about which form they report for the
    // same physical barcode, so a product saved under one form must still
    // resolve when scanned as the other.
    const candidates = new Set([code]);
    if (/^0\d{12}$/.test(code)) candidates.add(code.slice(1));
    if (/^\d{12}$/.test(code)) candidates.add(`0${code}`);

    const [product] = await Product.aggregate([
      { $match: { barcode: { $in: Array.from(candidates) }, isActive: true } },
      { $limit: 1 },
      categoryLookupStage,
      { $unwind: '$category' },
    ]);
    if (!product) return reply.status(404).send({ error: 'Бундай штрих-кодли товар мавжуд эмас' });
    return serializeProduct(product);
  });

  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!mongoose.Types.ObjectId.isValid(id)) return reply.status(404).send({ error: 'Маҳсулот топилмади' });

    const [product] = await Product.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      categoryLookupStage,
      { $unwind: '$category' },
    ]);
    if (!product) return reply.status(404).send({ error: 'Маҳсулот топилмади' });
    return serializeProduct(product);
  });

  app.post('/', { preHandler: [requireRole('DIREKTOR')] }, async (request, reply) => {
    const parsed = productSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Нотўғри маълумот" });

    try {
      const product = await Product.create({
        ...parsed.data,
        createdBy: request.user.userId,
      });
      await product.populate('category', 'name icon');
      return product;
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        return reply.status(409).send({ error: 'Бу штрих-код аллақачон мавжуд' });
      }
      throw err;
    }
  });

  app.put('/:id', { preHandler: [requireRole('DIREKTOR')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = productSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Нотўғри маълумот" });

    const product = await Product.findByIdAndUpdate(id, parsed.data, { new: true }).populate(
      'category',
      'name icon'
    );
    if (!product) return reply.status(404).send({ error: 'Маҳсулот топилмади' });
    return product;
  });

  app.delete('/:id', { preHandler: [requireRole('DIREKTOR')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!product) return reply.status(404).send({ error: 'Маҳсулот топилмади' });
    return { message: "Маҳсулот ўчирилди" };
  });
}
