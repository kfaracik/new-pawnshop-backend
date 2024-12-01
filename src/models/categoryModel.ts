import mongoose, { Schema, Document } from 'mongoose';

interface ICategory extends Document {
  name: string;
}

const categorySchema = new Schema<ICategory>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
}, {
  timestamps: true,
});

const Category = mongoose.model<ICategory>('Category', categorySchema);

export { Category, ICategory };
