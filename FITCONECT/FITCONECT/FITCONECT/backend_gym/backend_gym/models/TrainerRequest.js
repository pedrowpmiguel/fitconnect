import mongoose from 'mongoose';

const TrainerRequestSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    message: {
      type: String,
      default: ''
    },
    respondedAt: {
      type: Date,
      default: null
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Índice para evitar pedidos duplicados (um cliente só pode ter um pedido pending por PT)
TrainerRequestSchema.index({ client: 1, trainer: 1, status: 1 }, { unique: false });

export default mongoose.model('TrainerRequest', TrainerRequestSchema);
