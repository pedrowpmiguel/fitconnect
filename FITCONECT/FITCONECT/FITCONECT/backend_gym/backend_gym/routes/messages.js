import express from "express";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import WorkoutLog from "../models/WorkoutLog.js";
import WorkoutPlan from "../models/WorkoutPlan.js";
import {
  validateSendMessage,
  validateWorkoutMissedAlert,
  validateConversationParams,
  validateMessageId
} from "../middleware/validation.js";
import mongoose from "mongoose";

const router = express.Router();

// Enviar mensagem
router.post("/", validateSendMessage, async (req, res) => {
  try {

    const senderId = req.user._id;
    const { recipientId, message, type = 'chat', priority = 'medium' } = req.body;

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do destinatário inválido'
      });
    }
    // Verificar se o destinatário existe
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Destinatário não encontrado'
      });
    }
    // Verificar se o destinatário está ativo
    if (!recipient.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Destinatário não está ativo'
      });
    }
  // Verificar permissões: trainer pode enviar para seus clientes, cliente pode enviar para seu trainer
    const sender = req.user; // Já vem do middleware authenticateToken
    if (sender.role === 'trainer') {
      // Trainer só pode enviar para seus clientes
      if (recipient.role !== 'client' || recipient.assignedTrainer?.toString() !== senderId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado. Este cliente não está atribuído a si.'
        });
      }
    } else if (sender.role === 'client') {
      // Cliente só pode enviar para seu trainer
      if (recipient.role !== 'trainer' || recipient._id.toString() !== sender.assignedTrainer?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado. Só pode enviar mensagens para o seu personal trainer.'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Apenas trainers e clientes podem enviar mensagens'
      });
    }

    // Criar mensagem
    const newMessage = new Message({
      sender: senderId,
      recipient: recipientId,
      message,
      type,
      priority
    });

    await newMessage.save();

    
// Popular dados para resposta
await newMessage.populate('sender', 'firstName lastName username email');
await newMessage.populate('recipient', 'firstName lastName username email');

// Emitir notificação em tempo real (após salvar)
try {
  const io = req.app.get('io');
  io.to(`user:${recipientId}`).emit('new_message', {
    messageId: newMessage._id,
    sender: {
      id: senderId,
      name: `${sender.firstName} ${sender.lastName}`
    },
    message: message,
    type: type,
    priority: priority,
    createdAt: newMessage.createdAt
  });
  console.log('Mensagem emitida via Socket.IO para:', recipientId);
} catch (socketError) {
  console.error('Erro ao emitir mensagem via Socket:', socketError);
}
   


    res.status(201).json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      data: { message: newMessage }
    });

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Enviar alerta quando cliente faltar treino
router.post("/alert/workout-missed", validateWorkoutMissedAlert, async (req, res) => {
  try {
    const trainerId = req.user._id;
    const { clientId, workoutLogId, message, priority = 'high' } = req.body;

    // Validar ObjectIds
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do cliente inválido'
      });
    }

    if (workoutLogId && !mongoose.Types.ObjectId.isValid(workoutLogId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do workout log inválido'
      });
    }

    // Verificar se o trainer está aprovado
    const trainer = req.user; // Já vem do middleware authenticateToken
    if (trainer.role !== 'trainer' || !trainer.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Apenas personal trainers aprovados podem enviar alertas'
      });
    }

    // Verificar se o cliente está atribuído ao trainer
    const client = await User.findById(clientId);
    if (!client || client.role !== 'client') {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }

    if (client.assignedTrainer?.toString() !== trainerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Este cliente não está atribuído a si'
      });
    }

    // Buscar workout log se fornecido
    let workoutLog = null;
    let workoutPlan = null;
    if (workoutLogId) {
      workoutLog = await WorkoutLog.findById(workoutLogId);
      if (workoutLog) {
        workoutPlan = await WorkoutPlan.findById(workoutLog.workoutPlan);
      }
    }

    // Criar mensagem de alerta
    const alertMessage = new Message({
      sender: trainerId,
      recipient: clientId,
      message: message || 'Faltou ao treino agendado. Por favor, entre em contacto para discutirmos.',
      type: 'alert',
      alertType: 'workout_missed',
      relatedWorkoutLog: workoutLogId,
      relatedWorkoutPlan: workoutPlan?._id,
      priority
    });

    await alertMessage.save();

    // Popular dados
    await alertMessage.populate('sender', 'firstName lastName username email');
    await alertMessage.populate('recipient', 'firstName lastName username email');

    // Criar notificação para o cliente
    try {
      const trainerName = `${trainer.firstName} ${trainer.lastName}`;
      await Notification.create({
        recipient: clientId,
        type: 'message',
        title: 'Alerta do Personal Trainer',
        message: `${trainerName} enviou-lhe um alerta sobre um treino não cumprido`,
        priority: priority === 'urgent' ? 'urgent' : 'high',
        relatedData: {
          workoutLog: workoutLogId,
          workoutPlan: workoutPlan?._id,
          client: clientId
        },
        actionUrl: `/messages/${trainerId}`,
        actionLabel: 'Ver mensagem'
      });
    } catch (notifError) {
      console.error('Erro ao criar notificação de alerta:', notifError);
    }

    // Emitir notificação em tempo real para o cliente via Socket.IO
    try {
      const io = req.app.get('io');
      io.to(`user:${clientId}`).emit('workout_missed', {
        messageId: alertMessage._id,
        trainer: {
          id: trainerId,
          name: `${trainer.firstName} ${trainer.lastName}`
        },
        clientId: clientId,
        clientName: `${client.firstName} ${client.lastName}`,
        reason: message || 'Faltou ao treino agendado',
        relatedWorkoutLog: workoutLogId,
        relatedWorkoutPlan: workoutPlan?._id,
        createdAt: alertMessage.createdAt
      });
      console.log('Alerta emitido via Socket.IO para:', clientId);
      // Also emit legacy 'trainer_alert' event for clients listening to that event
      try {
        io.to(`user:${clientId}`).emit('trainer_alert', {
          messageId: alertMessage._id,
          message: alertMessage.message,
          trainerName: `${trainer.firstName} ${trainer.lastName}`,
          relatedWorkoutLog: workoutLogId
        });
      } catch (legacyErr) {
        console.error('Erro ao emitir trainer_alert legacy:', legacyErr);
      }
    } catch (socketError) {
      console.error('Erro ao emitir alerta via Socket:', socketError);
    }

    res.status(201).json({
      success: true,
      message: 'Alerta enviado com sucesso',
      data: { message: alertMessage }
    });

  } catch (error) {
    console.error('Erro ao enviar alerta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obter conversa entre dois usuários
router.get("/conversation/:otherUserId", validateConversationParams, async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do utilizador inválido'
      });
    }

    // Verificar se pode acessar esta conversa
    const user = req.user; // Já vem do middleware authenticateToken
    const otherUser = await User.findById(otherUserId);

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    // Verificar permissões
    if (user.role === 'trainer') {
      if (otherUser.role !== 'client' || otherUser.assignedTrainer?.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }
    } else if (user.role === 'client') {
      if (otherUser.role !== 'trainer' || otherUser._id.toString() !== user.assignedTrainer?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }
    }

    // Buscar mensagens
    const messages = await Message.getConversation(userId, otherUserId, parseInt(limit), skip);
    const total = await Message.countDocuments({
      $or: [
        { sender: userId, recipient: otherUserId },
        { sender: otherUserId, recipient: userId }
      ]
    });

    // Marcar mensagens como lidas
    await Message.updateMany(
      { sender: otherUserId, recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({
      success: true,
      message: 'Conversa obtida com sucesso',
      data: {
        messages: messages.reverse(), // Reverter para ordem cronológica
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalMessages: total,
          hasNext: skip + messages.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter conversa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Listar conversas (lista de pessoas com quem há mensagens)
router.get("/conversations", async (req, res) => {
  try {
    const userId = req.user._id;

    // Converter userId para ObjectId para agregação
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Buscar todas as conversas únicas
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userObjectId },
            { recipient: userObjectId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userObjectId] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipient', userObjectId] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          username: '$user.username',
          email: '$user.email',
          lastMessage: {
            message: '$lastMessage.message',
            type: '$lastMessage.type',
            createdAt: '$lastMessage.createdAt',
            isRead: '$lastMessage.isRead'
          },
          unreadCount: 1
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json({
      success: true,
      message: 'Conversas obtidas com sucesso',
      data: { conversations }
    });

  } catch (error) {
    console.error('Erro ao obter conversas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Contar mensagens não lidas
router.get("/unread-count", async (req, res) => {
  try {
    const userId = req.user._id;
    const { senderId } = req.query;

    // Validar senderId se fornecido
    if (senderId && !mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do remetente inválido'
      });
    }

    const unreadCount = await Message.getUnreadCount(userId, senderId || null);

    res.json({
      success: true,
      message: 'Contagem de mensagens não lidas obtida com sucesso',
      data: { unreadCount }
    });

  } catch (error) {
    console.error('Erro ao obter contagem de mensagens não lidas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obter informações do contato (trainer para client, client para trainer)
router.get("/contact", async (req, res) => {
  try {
    const userId = req.user._id;
    const user = req.user;

    let contact = null;

    if (user.role === 'client') {
      // Cliente busca seu trainer
      if (user.assignedTrainer) {
        contact = await User.findById(user.assignedTrainer)
          .select('firstName lastName username email profileImage role isActive');

        if (!contact) {
          return res.status(404).json({
            success: false,
            message: 'Personal trainer não encontrado'
          });
        }
      } else {
        return res.status(404).json({
          success: false,
          message: 'Não tem um personal trainer atribuído'
        });
      }
    } else if (user.role === 'trainer') {
      // Trainer busca seus clientes - retorna lista de clientes
      const clients = await User.find({
        role: 'client',
        assignedTrainer: userId,
        isActive: true
      })
        .select('firstName lastName username email profileImage role isActive')
        .sort({ firstName: 1, lastName: 1 });

      return res.json({
        success: true,
        message: 'Clientes obtidos com sucesso',
        data: {
          contacts: clients,
          contactType: 'clients'
        }
      });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Apenas trainers e clientes podem usar esta funcionalidade'
      });
    }

    // Para clientes, retorna o trainer único
    res.json({
      success: true,
      message: 'Contacto obtido com sucesso',
      data: {
        contact,
        contactType: 'trainer'
      }
    });

  } catch (error) {
    console.error('Erro ao obter contacto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Marcar mensagem como lida
router.put("/:id/read", validateMessageId, async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID da mensagem inválido'
      });
    }

    const message = await Message.findOne({
      _id: id,
      recipient: userId
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mensagem não encontrada'
      });
    }

    await message.markAsRead();

    res.json({
      success: true,
      message: 'Mensagem marcada como lida',
      data: { message }
    });

  } catch (error) {
    console.error('Erro ao marcar mensagem como lida:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

