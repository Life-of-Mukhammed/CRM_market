import { Schema, model, Document, Types } from 'mongoose';

export type PaymentType = 'NAQD' | 'KARTA' | 'ARALASH';
export type SaleStatus = 'COMPLETED' | 'CANCELLED';

export interface ISaleItem {
  product: Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface ISale extends Document {
  saleNumber: string;
  kassir: Types.ObjectId;
  items: ISaleItem[];
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentType: PaymentType;
  status: SaleStatus;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const saleItemSchema = new Schema<ISaleItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleSchema = new Schema<ISale>(
  {
    saleNumber: { type: String, required: true, unique: true },
    kassir: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [saleItemSchema], required: true, validate: (v: ISaleItem[]) => v.length > 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    finalAmount: { type: Number, required: true, min: 0 },
    paymentType: { type: String, enum: ['NAQD', 'KARTA', 'ARALASH'], required: true },
    status: { type: String, enum: ['COMPLETED', 'CANCELLED'], default: 'COMPLETED' },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

saleSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Sale = model<ISale>('Sale', saleSchema);
