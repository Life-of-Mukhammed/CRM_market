import { Schema, model, Document } from 'mongoose';

export type UserRole = 'DIREKTOR' | 'KASSIR';

export interface IUser extends Document {
  name: string;
  phone: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['DIREKTOR', 'KASSIR'], required: true, default: 'KASSIR' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

export const User = model<IUser>('User', userSchema);
