import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Expense } from '../models/Expense';
import { requireRole } from '../middleware/auth';

const ExpenseCategories = ['ARENDA', 'KOMMUNAL', 'OYLIK', 'TRANSPORT', 'BOSHQA'] as const;

const expenseSchema = z.object({
  title: z.string().min(1),
  category: z.enum(ExpenseCategories),
  amount: z.number().min(0),
  note: z.string().optional(),
  date: z.string().optional(),
});

export async function expensesRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [requireRole('DIREKTOR')] }, async (request) => {
    const query = request.query as {
      startDate?: string;
      endDate?: string;
      category?: string;
      page?: string;
      limit?: string;
    };
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '50'), 200);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.category) where.category = query.category;
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) (where.date as Record<string, Date>).$gte = new Date(query.startDate);
      if (query.endDate) (where.date as Record<string, Date>).$lte = new Date(query.endDate);
    }

    const [expenses, total, totalAmountAgg] = await Promise.all([
      Expense.find(where).populate('createdBy', 'name').sort({ date: -1 }).skip(skip).limit(limit),
      Expense.countDocuments(where),
      Expense.aggregate([{ $match: where }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
    ]);

    return { expenses, total, page, limit, totalAmount: totalAmountAgg[0]?.sum || 0 };
  });

  app.post('/', { preHandler: [requireRole('DIREKTOR')] }, async (request, reply) => {
    const parsed = expenseSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Нотўғри маълумот' });
    const data = parsed.data;

    const expense = await Expense.create({
      title: data.title,
      category: data.category,
      amount: data.amount,
      note: data.note,
      date: data.date ? new Date(data.date) : new Date(),
      createdBy: request.user.userId,
    });
    return expense;
  });

  app.put('/:id', { preHandler: [requireRole('DIREKTOR')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = expenseSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Нотўғри маълумот' });

    const { date, ...rest } = parsed.data;
    const update: Record<string, unknown> = { ...rest };
    if (date) update.date = new Date(date);

    const expense = await Expense.findByIdAndUpdate(id, update, { new: true });
    if (!expense) return reply.status(404).send({ error: 'Харажат топилмади' });
    return expense;
  });

  app.delete('/:id', { preHandler: [requireRole('DIREKTOR')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) return reply.status(404).send({ error: 'Харажат топилмади' });
    return { message: 'Харажат ўчирилди' };
  });
}
