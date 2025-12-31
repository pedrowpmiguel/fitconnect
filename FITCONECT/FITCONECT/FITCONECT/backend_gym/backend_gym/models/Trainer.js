import mongoose from 'mongoose';
import User from './User.js';

const trainerSchema = new mongoose.Schema({
  specialization: { 
    type: [String],
    default: []
  },
  experience: { 
    type: Number, 
    min: 0,
    default: 0
  },
  certification: { 
    type: [String],
    default: []
  },
  bio: { 
    type: String, 
    maxlength: [500, 'Bio não pode ter mais de 500 caracteres'] 
  },
  hourlyRate: { 
    type: Number, 
    min: 0 
  },
  isApproved: { 
    type: Boolean, 
    default: false 
  },
  approvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  approvedAt: { type: Date },
  availability: {
    type: Map,
    of: [{
      start: String,
      end: String
    }],
    default: {}
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  clients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

// Índices
trainerSchema.index({ isApproved: 1 });
trainerSchema.index({ specialization: 1 });
trainerSchema.index({ rating: -1 });

// Método para calcular número de clientes
trainerSchema.methods.getClientCount = function() {
  return this.clients ? this.clients.length : 0;
};

// Método para verificar se está aprovado
trainerSchema.methods.isTrainerApproved = function() {
  return this.isApproved === true;
};

// Método para adicionar cliente
trainerSchema.methods.addClient = async function(clientId) {
  if (!this.clients.includes(clientId)) {
    this.clients.push(clientId);
    await this.save();
  }
};

// Método para remover cliente
trainerSchema.methods.removeClient = async function(clientId) {
  this.clients = this.clients.filter(id => id.toString() !== clientId.toString());
  await this.save();
};

const Trainer = User.discriminator('trainer', trainerSchema);
export default Trainer;
