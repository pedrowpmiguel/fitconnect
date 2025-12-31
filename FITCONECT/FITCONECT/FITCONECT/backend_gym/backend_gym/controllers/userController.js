import * as userService from '../services/userService.js';
import User from '../models/User.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/* Minimal Express-style handlers (assume async error middleware or try/catch in router) */
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token e senha são obrigatórios' });
    }

    // Hash do token recebido
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Procurar usuário com token válido e não expirado
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Token inválido ou expirado' });
    }

    // Atualizar senha
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Limpar token e expiração
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ success: true, message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('Erro no reset de senha:', error);
    res.status(500).json({ success: false, message: 'Erro ao redefinir senha' });
  }
};

export async function postRequestTrainerChange(req, res) {
    // req.params.id = clientId, req.body.requestedTrainer, req.body.reason
    const client = await userService.requestTrainerChange(req.params.id, req.body.requestedTrainer, req.body.reason);
    return res.status(200).json({ success: true, client: client.getPublicProfile() });
}

export async function postProcessTrainerChange(req, res) {
    // req.params.id = clientId, req.body.action = 'approve'|'reject', req.user.id = processorId
    const client = await userService.processTrainerChangeRequest(req.params.id, req.body.action, req.user.id);
    return res.status(200).json({ success: true, client: client.getPublicProfile() });
}

export async function postAssignTrainer(req, res) {
    // req.params.id = clientId, req.body.trainerId, req.user.id = adminId
    const client = await userService.assignTrainerToClient(req.params.id, req.body.trainerId, req.user.id);
    return res.status(200).json({ success: true, client: client.getPublicProfile() });
}

export async function postApproveTrainer(req, res) {
    // req.params.id = trainerId, req.user.id = adminId
    const trainer = await userService.approveTrainer(req.params.id, req.user.id);
    return res.status(200).json({ success: true, trainer: trainer.getPublicProfile() });
}

