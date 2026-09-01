import { Schema, model, Document, Types } from 'mongoose';

export type ExpenseCategory = 'ARENDA' | 'KOMMUNAL' | 'OYLIK' | 'TRANSPORT' | 'BOSHQA';

export interface IExpense extends Document {
  title: string;
  category: ExpenseCategory;
  amount: number;
  note?: string;
  date: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['ARENDA', 'KOMMUNAL', 'OYLIK', 'TRANSPORT', 'BOSHQA'],
      required: true,
      default: 'BOSHQA',
    },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true },
    date: { type: Date, required: true, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

expenseSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Expense = model<IExpense>('Expense', expenseSchema);
