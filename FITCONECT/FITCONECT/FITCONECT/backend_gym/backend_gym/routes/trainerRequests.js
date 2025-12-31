import express from 'express';
import TrainerRequest from '../models/TrainerRequest.js';
import User from '../models/User.js';

const router = express.Router();

// Cliente faz pedido para um PT
router.post('/request/:trainerId', async (req, res) => {
  try {
    const clientId = req.user._id;
    const { trainerId } = req.params;
    const { message } = req.body;

    // Verificar se o PT existe e se é realmente um PT
    const trainer = await User.findById(trainerId);
    if (!trainer || trainer.role !== 'trainer') {
      return res.status(404).json({
        success: false,
        message: 'Personal Trainer não encontrado'
      });
    }

    // Verificar se já existe um pedido pending do cliente para este PT
    const existingPendingRequest = await TrainerRequest.findOne({
      client: clientId,
      trainer: trainerId,
      status: 'pending'
    });

    if (existingPendingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Já tem um pedido pendente para este Personal Trainer'
      });
    }

    // Se há um pedido anterior (rejeitado ou aceito), podemos permitir um novo pedido
    // Verificar se há um pedido aceito ativo com outro PT
    const activeRequest = await TrainerRequest.findOne({
      client: clientId,
      status: 'accepted'
    });

    // Se o pedido ativo é para outro PT, será substituído quando este for aceito
    // Isso é permitido pois o cliente pode mudar de PT

    // Criar novo pedido
    const newRequest = new TrainerRequest({
      client: clientId,
      trainer: trainerId,
      message: message || '',
      status: 'pending'
    });

    await newRequest.save();
    await newRequest.populate('client', 'firstName lastName username email');
    await newRequest.populate('trainer', 'firstName lastName username email');

    res.status(201).json({
      success: true,
      message: 'Pedido enviado com sucesso',
      data: newRequest
    });

  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PT listar todos os pedidos pendentes
router.get('/my-requests', async (req, res) => {
  try {
    const trainerId = req.user._id;

    const requests = await TrainerRequest.find({ trainer: trainerId })
      .populate('client', 'firstName lastName username email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Pedidos obtidos com sucesso',
      data: {
        requests,
        pending: requests.filter(r => r.status === 'pending').length,
        accepted: requests.filter(r => r.status === 'accepted').length,
        rejected: requests.filter(r => r.status === 'rejected').length
      }
    });

  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Cliente listar seus pedidos
router.get('/my-trainer-requests', async (req, res) => {
  try {
    const clientId = req.user._id;

    const requests = await TrainerRequest.find({ client: clientId })
      .populate('trainer', 'firstName lastName username email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Pedidos obtidos com sucesso',
      data: requests
    });

  } catch (error) {
    console.error('Erro ao listar pedidos do cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PT aceitar pedido
router.put('/accept/:requestId', async (req, res) => {
  try {
    const trainerId = req.user._id;
    const { requestId } = req.params;

    const request = await TrainerRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }

    // Verificar se o PT é o destinatário do pedido
    if (request.trainer.toString() !== trainerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Este pedido já foi respondido'
      });
    }

    // Atualizar pedido
    request.status = 'accepted';
    request.respondedAt = new Date();
    request.respondedBy = trainerId;
    await request.save();

    // Atualizar assignedTrainer do cliente
    await User.findByIdAndUpdate(request.client, {
      assignedTrainer: trainerId
    });

    await request.populate('client', 'firstName lastName username email');
    await request.populate('trainer', 'firstName lastName username email');

    res.json({
      success: true,
      message: 'Pedido aceito com sucesso',
      data: request
    });

  } catch (error) {
    console.error('Erro ao aceitar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PT rejeitar pedido
router.put('/reject/:requestId', async (req, res) => {
  try {
    const trainerId = req.user._id;
    const { requestId } = req.params;
    const { reason } = req.body;

    const request = await TrainerRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }

    // Verificar se o PT é o destinatário do pedido
    if (request.trainer.toString() !== trainerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Este pedido já foi respondido'
      });
    }

    // Atualizar pedido
    request.status = 'rejected';
    request.message = reason || '';
    request.respondedAt = new Date();
    request.respondedBy = trainerId;
    await request.save();

    await request.populate('client', 'firstName lastName username email');
    await request.populate('trainer', 'firstName lastName username email');

    res.json({
      success: true,
      message: 'Pedido rejeitado',
      data: request
    });

  } catch (error) {
    console.error('Erro ao rejeitar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
