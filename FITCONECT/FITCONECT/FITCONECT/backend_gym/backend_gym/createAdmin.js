import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function createAdmin() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fitconect');
    console.log('✅ Conectado ao MongoDB');

    // Forçar criar novo admin (ou redefinir se existir)
    await User.deleteMany({ role: 'admin' });
    console.log('🗑️ Admin anterior removido');

    // Criar novo admin
    const admin = new User({
      username: 'admin',
      email: 'admin@fitconect.com',
      password: 'Admin@123456',
      firstName: 'Admin',
      lastName: 'FITCONECT',
      role: 'admin',
      phone: '912345678',
      isActive: true,
      isVerified: true
    });

    await admin.save();
    console.log('✅ Admin criado com sucesso!');
    console.log('📧 Email: admin@fitconect.com');
    console.log('🔑 Senha: Admin@123456');
    console.log('👤 Username: admin');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createAdmin();
