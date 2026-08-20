import { FastifyInstance } from 'fastify';
import { Sale } from '../models/Sale';
import { Product } from '../models/Product';
import { requireRole } from '../middleware/auth';

export async function reportsRoutes(app: FastifyInstance) {
  app.get('/dashboard', { preHandler: [requireRole('DIREKTOR')] }, async (request) => {
    const query = request.query as { period?: string };
    const period = query.period || 'month';

    const now = new Date();
    const startDate = new Date();

    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'year') {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
    }

    const sales = await Sale.find({ createdAt: { $gte: startDate }, status: 'COMPLETED' }).populate(
      'kassir',
      'name'
    );

    const productCostMap = new Map<string, number>();
    const products = await Product.find({}, 'costPrice');
    for (const p of products) productCostMap.set(p.id, p.costPrice);

    // Value of everything currently sitting in stock (active products only)
    const stockProducts = await Product.find({ isActive: true }, 'quantity costPrice salePrice');
    let stockValueCost = 0;
    let stockValueSale = 0;
    for (const p of stockProducts) {
      stockValueCost += p.quantity * p.costPrice;
      stockValueSale += p.quantity * p.salePrice;
    }

    const totalRevenue = sales.reduce((sum, s) => sum + s.finalAmount, 0);
    const totalCost = sales.reduce((sum, sale) => {
      return (
        sum +
        sale.items.reduce((s, item) => s + (productCostMap.get(item.product.toString()) || 0) * item.quantity, 0)
      );
    }, 0);
    const grossProfit = totalRevenue - totalCost;

    // Top products
    const productStats = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const key = item.product.toString();
        const existing = productStats.get(key) || { name: item.name, quantity: 0, revenue: 0, profit: 0 };
        const cost = (productCostMap.get(key) || 0) * item.quantity;
        existing.quantity += item.quantity;
        existing.revenue += item.totalPrice;
        existing.profit += item.totalPrice - cost;
        productStats.set(key, existing);
      }
    }
    const topProducts = Array.from(productStats.entries())
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Sales by cashier
    const kassirStats = new Map<string, { name: string; count: number; revenue: number }>();
    for (const sale of sales) {
      const kassir = sale.kassir as unknown as { id: string; name: string };
      const existing = kassirStats.get(kassir.id) || { name: kassir.name, count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += sale.finalAmount;
      kassirStats.set(kassir.id, existing);
    }

    // Daily chart data (last 30 days)
    const chartData: Record<string, { date: string; revenue: number; profit: number; count: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      chartData[key] = { date: key, revenue: 0, profit: 0, count: 0 };
    }
    for (const sale of sales) {
      const key = sale.createdAt.toISOString().split('T')[0];
      if (chartData[key]) {
        const saleCost = sale.items.reduce(
          (s, item) => s + (productCostMap.get(item.product.toString()) || 0) * item.quantity,
          0
        );
        chartData[key].revenue += sale.finalAmount;
        chartData[key].profit += sale.finalAmount - saleCost;
        chartData[key].count += 1;
      }
    }

    // Low stock alerts
    const lowStock = await Product.find({
      isActive: true,
      $expr: { $lte: ['$quantity', '$minAlert'] },
    }).sort({ quantity: 1 });

    return {
      summary: {
        totalRevenue,
        totalCost,
        grossProfit,
        salesCount: sales.length,
        stockValueCost,
        stockValueSale,
      },
      topProducts,
      kassirStats: Array.from(kassirStats.values()),
      chartData: Object.values(chartData),
      lowStock,
    };
  });
}
