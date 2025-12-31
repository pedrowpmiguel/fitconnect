import express from "express";
import User from "../models/User.js";
import Client from "../models/Client.js";
import Trainer from "../models/Trainer.js";
import { resetPassword } from '../controllers/userController.js';
import { validationResult } from "express-validator";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import { validateTrainerData, validateUserRegistration, validateTrainerRegisterClient } from "../middleware/validation.js";






import QRCode from "qrcode";
import mongoose from 'mongoose';

const router = express.Router();

// Middleware para validar ObjectId em params
const validateObjectIdParam = (paramName = 'id') => (req, res, next) => {
	const val = req.params[paramName];
	if (!val) return next();
	if (!mongoose.Types.ObjectId.isValid(val)) {
		return res.status(400).json({ success: false, message: 'ID inválido' });
	}
	return next();
};

router.post('/reset-password', resetPassword);

// Obter perfil do utilizador atual
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('assignedTrainer', 'firstName lastName email username');

    // Segurança extra
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Perfil obtido com sucesso',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Atualizar perfil do utilizador atual
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    
    // Campos que qualquer utilizador pode atualizar
    const commonFields = ['firstName', 'lastName', 'phone', 'profileImage', 'gender'];
    // Campos específicos de trainer
    const trainerFields = ['specialization', 'experience', 'certification', 'bio', 'hourlyRate'];
    
    // Determinar campos permitidos conforme o role
    let allowedFields = commonFields;
    if (req.user.role === 'trainer') {
      allowedFields = [...commonFields, ...trainerFields];
    }
    
    // Construir updateData apenas com campos permitidos
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Validações específicas para trainers
    if (req.user.role === 'trainer') {
      if (updateData.bio && updateData.bio.length > 500) {
        return res.status(400).json({ success: false, message: 'Bio não pode ter mais de 500 caracteres' });
      }
      if (updateData.experience !== undefined && (updateData.experience < 0 || updateData.experience > 50)) {
        return res.status(400).json({ success: false, message: 'Experiência deve ser um número entre 0 e 50' });
      }
      if (updateData.hourlyRate !== undefined && (updateData.hourlyRate < 0 || updateData.hourlyRate > 1000)) {
        return res.status(400).json({ success: false, message: 'Taxa horária deve ser um número entre 0 e 1000' });
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} já existe`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Atualizar dados específicos de Personal Trainer
router.put("/profile/trainer", authenticateToken, validateTrainerData, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const userId = req.user._id;

    // Verificar se o usuário é um trainer
    if (req.user.role !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Apenas personal trainers podem atualizar estes dados'
      });
    }

    // Campos permitidos para atualização
    const allowedFields = ['specialization', 'experience', 'certification', 'bio', 'hourlyRate'];
    const updateData = {};
    
    // Filtrar apenas os campos permitidos
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Validar bio se fornecida
    if (updateData.bio && updateData.bio.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Bio não pode ter mais de 500 caracteres'
      });
    }

    // Validar experience se fornecida
    if (updateData.experience !== undefined && (updateData.experience < 0 || updateData.experience > 50)) {
      return res.status(400).json({
        success: false,
        message: 'Experiência deve ser um número entre 0 e 50'
      });
    }

    // Validar hourlyRate se fornecida
    if (updateData.hourlyRate !== undefined && (updateData.hourlyRate < 0 || updateData.hourlyRate > 1000)) {
      return res.status(400).json({
        success: false,
        message: 'Taxa horária deve ser um número entre 0 e 1000'
      });
    }

    // Verificar se há dados para atualizar
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo válido fornecido para atualização'
      });
    }

    // Atualizar trainer usando o modelo Trainer (discriminator)
    const trainer = await Trainer.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Personal trainer não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Dados de personal trainer atualizados com sucesso',
      data: {
        trainer: trainer.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar dados de trainer:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} já existe`
      });
    }

    // Erro de validação do Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obter utilizador por ID
// router.get("/:id", validateObjectIdParam('id'), async (req, res) => {
//   try {
//     const { id } = req.params;
    
//     const user = await User.findById(id).select('-password -loginAttempts -lockUntil');
    
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'Utilizador não encontrado'
//       });
//     }

//     res.json({
//       success: true,
//       message: 'Utilizador obtido com sucesso',
//       data: {
//         user: user.getPublicProfile()
//       }
//     });

//   } catch (error) {
//     console.error('Erro ao obter utilizador:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Erro interno do servidor',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// Listar utilizadores (com filtros e paginação)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Construir filtros
    const filters = {};
    
    if (req.query.role) {
      filters.role = req.query.role;
    }
    
    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }
    
    if (req.query.isApproved !== undefined) {
      filters.isApproved = req.query.isApproved === 'true';
    }
    
    if (req.query.search) {
      filters.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { username: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Construir query
    const query = User.find(filters)
      .select('-password -loginAttempts -lockUntil')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Executar query e contar total
    const [users, total] = await Promise.all([
      query.exec(),
      User.countDocuments(filters)
    ]);

    res.json({
      success: true,
      message: 'Utilizadores obtidos com sucesso',
      data: {
        users: users.map(user => user.getPublicProfile()),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter utilizadores:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Listar personal trainers
router.get("/trainers", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const filters = { role: 'trainer' };
    
    if (req.query.isApproved !== undefined) {
      filters.isApproved = req.query.isApproved === 'true';
    }
    
    if (req.query.search) {
      filters.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { username: { $regex: req.query.search, $options: 'i' } },
        { specialization: { $in: [new RegExp(req.query.search, 'i')] } }
      ];
    }

    const query = User.find(filters)
      .select('-password -loginAttempts -lockUntil')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const [trainers, total] = await Promise.all([
      query.exec(),
      User.countDocuments(filters)
    ]);

    res.json({
      success: true,
      message: 'Personal trainers obtidos com sucesso',
      data: {
        trainers: trainers.map(trainer => trainer.getPublicProfile()),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalTrainers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter personal trainers:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Listar clientes de um personal trainer
router.get("/trainer/clients", authenticateToken, async (req, res) => {
  try {
    const trainerId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const filters = { 
      role: 'client',
      assignedTrainer: trainerId
    };
    
    if (req.query.search) {
      filters.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { username: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const query = User.find(filters)
      .select('-password -loginAttempts -lockUntil')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const [clients, total] = await Promise.all([
      query.exec(),
      User.countDocuments(filters)
    ]);

    res.json({
      success: true,
      message: 'Clientes obtidos com sucesso',
      data: {
        clients: clients.map(client => client.getPublicProfile()),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalClients: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Atribuir cliente a personal trainer
router.post("/trainer/assign-client", async (req, res) => {
  try {
    const { clientId, trainerId } = req.body;

    // Verificar se cliente existe
    const client = await User.findById(clientId);
    if (!client || client.role !== 'client') {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }

    // Verificar se trainer existe e está aprovado
    const trainer = await User.findById(trainerId);
    if (!trainer || trainer.role !== 'trainer' || !trainer.isApproved) {
      return res.status(404).json({
        success: false,
        message: 'Personal trainer não encontrado ou não aprovado'
      });
    }

    // Atribuir cliente ao trainer
    client.assignedTrainer = trainerId;
    await client.save();

    res.json({
      success: true,
      message: 'Cliente atribuído ao personal trainer com sucesso',
      data: {
        client: client.getPublicProfile(),
        trainer: trainer.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Erro ao atribuir cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Solicitar mudança de personal trainer
router.post("/client/request-trainer-change", authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const { requestedTrainerId, reason } = req.body;
    const clientId = req.user._id;

    // Verificar se cliente já tem um pedido pendente
    const client = await User.findById(clientId);
    if (client.trainerChangeRequest && 
        client.trainerChangeRequest.status === 'pending' && 
        client.trainerChangeRequest.requestedTrainer) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um pedido de mudança de trainer pendente'
      });
    }

    // Verificar se novo trainer existe e está aprovado
    const newTrainer = await User.findById(requestedTrainerId);
    if (!newTrainer || newTrainer.role !== 'trainer' || !newTrainer.isApproved) {
      return res.status(404).json({
        success: false,
        message: 'Personal trainer não encontrado ou não aprovado'
      });
    }

    // Criar pedido de mudança
    client.trainerChangeRequest = {
      requestedTrainer: requestedTrainerId,
      reason,
      status: 'pending',
      requestedAt: new Date()
    };

    await client.save();

    res.json({
      success: true,
      message: 'Pedido de mudança de trainer enviado com sucesso',
      data: {
        request: client.trainerChangeRequest
      }
    });

  } catch (error) {
    console.error('Erro ao solicitar mudança de trainer:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Aprovar/rejeitar personal trainer (apenas admin)
router.put("/trainer/:id/approve", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { isApproved, reason } = req.body;
    const adminId = req.user._id;

    const trainer = await User.findById(id);
    if (!trainer || trainer.role !== 'trainer') {
      return res.status(404).json({
        success: false,
        message: 'Personal trainer não encontrado'
      });
    }

    trainer.isApproved = isApproved;
    trainer.approvedBy = adminId;
    trainer.approvedAt = new Date();

    await trainer.save();

    res.json({
      success: true,
      message: `Personal trainer ${isApproved ? 'aprovado' : 'rejeitado'} com sucesso`,
      data: {
        trainer: trainer.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Erro ao aprovar trainer:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Processar pedidos de mudança de trainer (apenas admin)
router.get("/admin/trainer-change-requests", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Buscar apenas clientes com pedidos pendentes
    const filters = {
      role: 'client',
      'trainerChangeRequest.status': 'pending',
      'trainerChangeRequest': { $exists: true, $ne: null }
    };

    const query = User.find(filters)
      .populate('trainerChangeRequest.requestedTrainer', 'firstName lastName username email')
      .populate('assignedTrainer', 'firstName lastName username email')
      .select('-password -loginAttempts -lockUntil')
      .sort({ 'trainerChangeRequest.requestedAt': -1 })
      .skip(skip)
      .limit(limit);

    const [requests, total] = await Promise.all([
      query.exec(),
      User.countDocuments(filters)
    ]);

    // Filtrar apenas os que realmente têm pedido pendente
    const validRequests = requests.filter(request => 
      request.trainerChangeRequest && 
      request.trainerChangeRequest.status === 'pending'
    );

    res.json({
      success: true,
      message: 'Pedidos de mudança obtidos com sucesso',
      data: {
        requests: validRequests.map(request => ({
          clientId: request._id,
          client: request.getPublicProfile(),
          currentTrainer: request.assignedTrainer,
          requestedTrainer: request.trainerChangeRequest.requestedTrainer,
          reason: request.trainerChangeRequest.reason,
          requestedAt: request.trainerChangeRequest.requestedAt
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRequests: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter pedidos de mudança:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obter pedido de mudança de trainer específico (apenas admin)
router.get("/admin/trainer-change/:clientId", authenticateToken, requireAdmin, validateObjectIdParam('clientId'), async (req, res) => {
  try {
    const { clientId } = req.params;

    // Buscar cliente com populate
    const client = await User.findById(clientId)
      .populate('trainerChangeRequest.requestedTrainer', 'firstName lastName username email')
      .populate('assignedTrainer', 'firstName lastName username email');

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }

    if (client.role !== 'client') {
      return res.status(400).json({
        success: false,
        message: 'O utilizador não é um cliente'
      });
    }

    if (!client.trainerChangeRequest || !client.trainerChangeRequest.status) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum pedido de mudança encontrado para este cliente'
      });
    }

    res.json({
      success: true,
      message: 'Pedido de mudança obtido com sucesso',
      data: {
        clientId: client._id,
        client: client.getPublicProfile(),
        request: {
          status: client.trainerChangeRequest.status,
          requestedTrainer: client.trainerChangeRequest.requestedTrainer,
          currentTrainer: client.assignedTrainer,
          reason: client.trainerChangeRequest.reason,
          adminReason: client.trainerChangeRequest.adminReason,
          requestedAt: client.trainerChangeRequest.requestedAt,
          processedAt: client.trainerChangeRequest.processedAt,
          processedBy: client.trainerChangeRequest.processedBy
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter pedido de mudança:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Aprovar/rejeitar pedido de mudança de trainer (apenas admin)
router.put("/admin/trainer-change/:clientId", authenticateToken, requireAdmin, validateObjectIdParam('clientId'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const { clientId } = req.params;
    const { approved, reason } = req.body;
    const adminId = req.user._id;

    // Validar que approved é um boolean
    if (typeof approved !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'O campo "approved" deve ser um boolean (true/false)'
      });
    }

    // Buscar cliente com populate
    const client = await User.findById(clientId)
      .populate('trainerChangeRequest.requestedTrainer', 'firstName lastName username email')
      .populate('assignedTrainer', 'firstName lastName username email');

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }

    if (client.role !== 'client') {
      return res.status(400).json({
        success: false,
        message: 'O utilizador não é um cliente'
      });
    }

    if (!client.trainerChangeRequest || !client.trainerChangeRequest.status) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum pedido de mudança encontrado para este cliente'
      });
    }

    if (client.trainerChangeRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Este pedido já foi processado. Status atual: ${client.trainerChangeRequest.status}`
      });
    }

    // Verificar se o trainer solicitado ainda existe e está aprovado
    if (approved) {
      const requestedTrainer = await User.findById(client.trainerChangeRequest.requestedTrainer);
      if (!requestedTrainer || requestedTrainer.role !== 'trainer' || !requestedTrainer.isApproved) {
        return res.status(404).json({
          success: false,
          message: 'Personal trainer solicitado não encontrado ou não está aprovado'
        });
      }

      // Aprovar mudança - atribuir novo trainer
      client.assignedTrainer = client.trainerChangeRequest.requestedTrainer;
    }

    // Atualizar status do pedido
    client.trainerChangeRequest.status = approved ? 'approved' : 'rejected';
    client.trainerChangeRequest.processedAt = new Date();
    client.trainerChangeRequest.processedBy = adminId;
    if (reason) {
      client.trainerChangeRequest.adminReason = reason;
    }

    await client.save();

    // Buscar dados atualizados
    await client.populate('trainerChangeRequest.requestedTrainer', 'firstName lastName username email');
    await client.populate('assignedTrainer', 'firstName lastName username email');

    res.json({
      success: true,
      message: `Pedido de mudança ${approved ? 'aprovado' : 'rejeitado'} com sucesso`,
      data: {
        client: client.getPublicProfile(),
        request: {
          status: client.trainerChangeRequest.status,
          requestedTrainer: client.trainerChangeRequest.requestedTrainer,
          currentTrainer: client.assignedTrainer,
          reason: client.trainerChangeRequest.reason,
          adminReason: client.trainerChangeRequest.adminReason,
          requestedAt: client.trainerChangeRequest.requestedAt,
          processedAt: client.trainerChangeRequest.processedAt
        }
      }
    });

  } catch (error) {
    console.error('Erro ao processar pedido de mudança:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Criar personal trainer (apenas admin)
router.post("/admin/trainers", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const adminId = req.user._id;
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      specialization,
      experience,
      certification,
      bio,
      hourlyRate,
      isApproved = false
    } = req.body;

    // Verificar se username ou email já existem
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.username === username ? 'Username já existe' : 'Email já existe'
      });
    }

    // Criar trainer
    const trainer = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      role: 'trainer',
      specialization: specialization || [],
      experience: experience || 0,
      certification: certification || [],
      bio,
      hourlyRate,
      isApproved,
      approvedBy: isApproved ? adminId : null,
      approvedAt: isApproved ? new Date() : null
    });

    await trainer.save();

    res.status(201).json({
      success: true,
      message: 'Personal trainer criado com sucesso',
      data: {
        trainer: trainer.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Erro ao criar trainer:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} já existe`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Atualizar personal trainer (apenas admin)
router.put("/admin/trainers/:id", authenticateToken, requireAdmin, validateObjectIdParam('id'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const adminId = req.user._id;
    const { id } = req.params;
    const updateData = req.body;

    // Verificar se trainer existe
    const trainer = await User.findById(id);
    if (!trainer || trainer.role !== 'trainer') {
      return res.status(404).json({
        success: false,
        message: 'Personal trainer não encontrado'
      });
    }

    // Remover campos que não devem ser atualizados diretamente
    delete updateData.password;
    delete updateData.role;
    delete updateData.loginAttempts;
    delete updateData.lockUntil;

    // Se está aprovando/rejeitando, atualizar campos de aprovação
    if (updateData.isApproved !== undefined) {
      updateData.approvedBy = updateData.isApproved ? adminId : null;
      updateData.approvedAt = updateData.isApproved ? new Date() : null;
    }

    // Atualizar trainer
    Object.assign(trainer, updateData);
    await trainer.save();

    res.json({
      success: true,
      message: 'Personal trainer atualizado com sucesso',
      data: {
        trainer: trainer.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar trainer:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} já existe`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Deletar personal trainer (apenas admin)
router.delete("/admin/trainers/:id", authenticateToken, requireAdmin, validateObjectIdParam('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const trainer = await User.findById(id);
    if (!trainer || trainer.role !== 'trainer') {
      return res.status(404).json({
        success: false,
        message: 'Personal trainer não encontrado'
      });
    }

    // Verificar se trainer tem clientes atribuídos
    const clientsCount = await User.countDocuments({ assignedTrainer: id });
    if (clientsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Não é possível deletar o trainer. Ele tem ${clientsCount} cliente(s) atribuído(s). Reatribua os clientes primeiro.`
      });
    }

    // Deletar trainer
    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Personal trainer deletado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar trainer:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Trainer registar cliente
router.post("/trainer/clients", authenticateToken, validateTrainerRegisterClient, async (req, res) => {
  try {
    const trainerId = req.user._id;
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      membershipType,
      goals
    } = req.body;

    // Verificar se trainer está aprovado
    const trainer = await Trainer.findById(trainerId);
    if (!trainer || trainer.role !== 'trainer' || !trainer.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Apenas personal trainers aprovados podem registar clientes'
      });
    }

    // Verificar se username ou email já existem
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email já registado' : 'Username já existe'
      });
    }

    // Criar cliente com trainer atribuído
    const client = await Client.create({
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      role: 'client',
      assignedTrainer: trainerId,
      membershipType: membershipType || 'basic',
      membershipStartDate: new Date(),
      goals: goals || []
    });

    // Gerar QR Code
    let qrCodeUrl = null;
    try {
      const qrData = JSON.stringify({
        userId: client._id,
        username: client.username,
        timestamp: Date.now()
      });

      qrCodeUrl = await QRCode.toDataURL(qrData);
      client.qrCode = qrCodeUrl;
      await client.save();
      console.log('QR Code gerado com sucesso para cliente:', client.username);
    } catch (qrError) {
      console.error('Erro ao gerar QR Code:', qrError);
      // Não falhar o request se o QR Code falhar
    }

    // Adicionar cliente à lista de clientes do trainer
    try {
      await trainer.addClient(client._id);
    } catch (addClientError) {
      console.error('Erro ao adicionar cliente ao trainer:', addClientError);
      // Não falhar o request se isso falhar
    }

    res.status(201).json({
      success: true,
      message: 'Cliente registado com sucesso',
      data: {
        client: client.getPublicProfile(),
        qrCode: qrCodeUrl,
        trainer: {
          id: trainer._id,
          name: `${trainer.firstName} ${trainer.lastName}`
        }
      }
    });

  } catch (error) {
    console.error('Erro ao registar cliente:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} já existe`
      });
    }

    // Erros de validação do Mongoose
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(error.errors).forEach(field => {
        validationErrors[field] = error.errors[field].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Desativar/ativar utilizador (apenas admin)
router.put("/admin/user/:id/toggle-status", authenticateToken, requireAdmin, validateObjectIdParam('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilizador não encontrado' });
    }

    // Alterna o estado automaticamente
    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `Utilizador ${user.isActive ? 'ativado' : 'desativado'} com sucesso`,
      data: { user: user.getPublicProfile() }
    });

  } catch (error) {
    console.error('Erro ao alterar status do utilizador:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obter dados de um utilizador específico (apenas admin)
router.get("/admin/user/:id", authenticateToken, requireAdmin, validateObjectIdParam('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password -loginAttempts -lockUntil');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Utilizador obtido com sucesso',
      data: { user: user.getPublicProfile() }
    });

  } catch (error) {
    console.error('Erro ao obter utilizador:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Deletar user (cliente ou trainer) - apenas admin
router.delete("/admin/user/:id", authenticateToken, requireAdmin, validateObjectIdParam('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    // Se for trainer, verificar se tem clientes atribuídos
    if (user.role === 'trainer') {
      const clientsCount = await User.countDocuments({ assignedTrainer: id });
      if (clientsCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Não é possível deletar este trainer. Ele tem ${clientsCount} cliente(s) atribuído(s). Reatribua os clientes primeiro.`
        });
      }
    }

    // Deletar user
    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Utilizador eliminado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar user:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Reintroduzimos a rota dinâmica no final, protegida pelo middleware de ObjectId:
router.get("/:id", validateObjectIdParam('id'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password -loginAttempts -lockUntil');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Utilizador obtido com sucesso',
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Erro ao obter utilizador:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
