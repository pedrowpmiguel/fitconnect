import mongoose from 'mongoose';
import User from './User.js';

const adminSchema = new mongoose.Schema({
  permissions: {
    type: [String],
},
  isSuperAdmin: {
    type: Boolean,
    default: false
  },
  department: {
    type: String,
    enum: ['operations', 'support', 'management', 'it'],
    default: 'operations'
  },
  lastActivityLog: [{
    action: String,
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String
  }],
  approvedTrainers: [{
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date
  }]
});

// Índices
adminSchema.index({ isSuperAdmin: 1 });
adminSchema.index({ department: 1 });

// Método para verificar permissão específica
adminSchema.methods.hasPermission = function(permission) {
  return this.isSuperAdmin || this.permissions.includes(permission);
};

// Método para adicionar log de atividade
adminSchema.methods.addActivityLog = async function(action, targetUser, details) {
  if (!this.lastActivityLog) {
    this.lastActivityLog = [];
  }
  
  this.lastActivityLog.push({
    action,
    targetUser,
    timestamp: new Date(),
    details
  });
  
  // Manter apenas os últimos 100 logs
  if (this.lastActivityLog.length > 100) {
    this.lastActivityLog = this.lastActivityLog.slice(-100);
  }
  
  await this.save();
};

// Método para registrar aprovação de trainer
adminSchema.methods.recordTrainerApproval = async function(trainerId) {
  if (!this.approvedTrainers) {
    this.approvedTrainers = [];
  }
  
  this.approvedTrainers.push({
    trainerId,
    approvedAt: new Date()
  });
  
  await this.save();
};

const Admin = User.discriminator('admin', adminSchema);
export default Admin;