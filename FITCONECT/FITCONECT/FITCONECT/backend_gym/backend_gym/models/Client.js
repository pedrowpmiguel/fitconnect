import mongoose from 'mongoose';
import User from './User.js';

const clientSchema = new mongoose.Schema({
  assignedTrainer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  trainerChangeRequest: { 
    requestedTrainer: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    }, 
    reason: { type: String }, 
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending' 
    }, 
    requestedAt: { type: Date }, 
    processedAt: { type: Date }, 
    processedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    adminReason: { type: String }
  },
  membershipType: {
    type: String,
    enum: ['basic', 'premium', 'vip'],
    default: 'basic'
  },
  membershipStartDate: { type: Date },
  membershipEndDate: { type: Date },
  goals: { type: [String] },
  notes: { type: String, maxlength: 1000 }
});

// Índice para buscar clientes por trainer
clientSchema.index({ assignedTrainer: 1 });

// Método para verificar se tem trainer atribuído
clientSchema.methods.hasTrainer = function() {
  return !!this.assignedTrainer;
};

// Método para verificar se tem pedido pendente
clientSchema.methods.hasPendingRequest = function() {
  return this.trainerChangeRequest && 
         this.trainerChangeRequest.status === 'pending';
};

const Client = User.discriminator('client', clientSchema);
export default Client;
