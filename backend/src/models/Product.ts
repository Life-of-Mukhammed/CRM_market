import { Schema, model, Document, Types } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  category: Types.ObjectId;
  brand?: string;
  author?: string;
  barcode?: string;
  image?: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  quantity: number;
  minAlert: number;
  unit: string;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: String, trim: true },
    author: { type: String, trim: true },
    barcode: { type: String, trim: true, unique: true, sparse: true },
    image: { type: String, trim: true },
    description: { type: String, trim: true },
    costPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 0, min: 0 },
    minAlert: { type: Number, default: 3 },
    unit: { type: String, default: 'дона' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text' });
// Every list query filters on isActive and sorts by name (or filters by
// category too) — without these, Mongo does a full collection scan plus an
// in-memory sort on every request, which gets slower as the catalog grows.
productSchema.index({ isActive: 1, name: 1 });
productSchema.index({ isActive: 1, category: 1, name: 1 });

productSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Product = model<IProduct>('Product', productSchema);
