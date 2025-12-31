# Guia Completo de Testes Postman - Backend Gym

## 📋 Índice
1. [Autenticação](#autenticação)
2. [Consulta de Treinos em Calendário](#consulta-de-treinos-em-calendário)
3. [Registro de Cumprimento Diário](#registro-de-cumprimento-diário)
4. [Dashboards](#dashboards)
5. [Notificações](#notificações)
6. [Sistema de Chat/Mensagens](#sistema-de-chatmensagens)
7. [Alertas de Trainer](#alertas-de-trainer)
8. [Gestão de Trainers (Admin)](#gestão-de-trainers-admin)
9. [Trainer Adicionar Clientes](#trainer-adicionar-clientes)

---

## 🔐 Autenticação

### 1. Registrar Cliente
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "username": "cliente1",
  "email": "cliente1@test.com",
  "password": "password123",
  "firstName": "João",
  "lastName": "Silva",
  "phone": "912345678",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "role": "client"
}
```

### 2. Registrar Trainer
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "username": "trainer1",
  "email": "trainer1@test.com",
  "password": "password123",
  "firstName": "Carlos",
  "lastName": "Santos",
  "phone": "923456789",
  "role": "trainer",
  "specialization": ["força", "resistência"],
  "experience": 5,
  "certification": ["Certificação Personal Trainer"]
}
```

### 3. Login
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "username": "cliente1",
  "password": "password123"
}
```

**Resposta:** Guardar o `token` retornado para usar nos headers das próximas requisições.

### 4. Usar Token
Todas as requisições autenticadas precisam do header:
```
Authorization: Bearer SEU_TOKEN_AQUI
```

---

## 📅 Consulta de Treinos em Calendário

### 1. Obter Calendário do Mês Atual
```http
GET http://localhost:3000/api/client/workouts/calendar
Authorization: Bearer SEU_TOKEN_CLIENTE
```

### 2. Obter Calendário de Mês Específico
```http
GET http://localhost:3000/api/client/workouts/calendar?month=12&year=2024
Authorization: Bearer SEU_TOKEN_CLIENTE
```

### 3. Obter Calendário de Período Customizado
```http
GET http://localhost:3000/api/client/workouts/calendar?startDate=2024-12-01&endDate=2024-12-31
Authorization: Bearer SEU_TOKEN_CLIENTE
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "calendar": [
      {
        "date": "2024-12-15",
        "dayOfWeek": "sunday",
        "scheduled": {
          "sessionId": "...",
          "exercises": [...]
        },
        "logs": [],
        "status": "pending"
      }
    ],
    "plan": {...}
  }
}
```

---

## ✅ Registro de Cumprimento Diário

### 1. Registrar Treino Cumprido (versão simplificada)
```http
POST http://localhost:3000/api/client/workouts/daily-status
Authorization: Bearer SEU_TOKEN_CLIENTE
Content-Type: application/json

{
  "date": "2024-12-15",
  "isCompleted": true,
  "proofImage": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

### 2. Registrar Treino NÃO Cumprido com Motivo
```http
POST http://localhost:3000/api/client/workouts/daily-status
Authorization: Bearer SEU_TOKEN_CLIENTE
Content-Type: application/json

{
  "date": "2024-12-15",
  "isCompleted": false,
  "nonCompletionReason": "falta_tempo",
  "nonCompletionNotes": "Tive uma reunião de emergência no trabalho"
}
```

**Motivos disponíveis:** `indisposição`, `falta_tempo`, `lesão`, `doença`, `outros`

### 3. Registrar Treino Completo com Detalhes
```http
POST http://localhost:3000/api/client/workouts/logs
Authorization: Bearer SEU_TOKEN_CLIENTE
Content-Type: application/json

{
  "workoutPlanId": "ID_DO_PLANO",
  "sessionId": "ID_DA_SESSAO",
  "week": 1,
  "dayOfWeek": "monday",
  "isCompleted": true,
  "actualDuration": 60,
  "difficulty": "médio",
  "energy": "alta",
  "mood": "bom",
  "painLevel": "nenhuma",
  "proofImage": "data:image/jpeg;base64,...",
  "exercises": [
    {
      "exercise": "ID_EXERCICIO",
      "sets": [
        {
          "setNumber": 1,
          "reps": 10,
          "weight": "10kg",
          "completed": true
        }
      ]
    }
  ]
}
```

### 4. Registrar Treino NÃO Cumprido (completo)
```http
POST http://localhost:3000/api/client/workouts/logs
Authorization: Bearer SEU_TOKEN_CLIENTE
Content-Type: application/json

{
  "workoutPlanId": "ID_DO_PLANO",
  "sessionId": "ID_DA_SESSAO",
  "week": 1,
  "dayOfWeek": "monday",
  "isCompleted": false,
  "nonCompletionReason": "indisposição",
  "nonCompletionNotes": "Sentindo-me mal hoje"
}
```

---

## 📊 Dashboards

### 1. Dashboard do Cliente
```http
GET http://localhost:3000/api/client/workouts/dashboard?period=6
Authorization: Bearer SEU_TOKEN_CLIENTE
```

**Parâmetros:**
- `period`: Número de meses para retornar (padrão: 6)

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalCompleted": 45,
      "totalNotCompleted": 8,
      "completionRate": 85,
      "avgWeeklyCompleted": 3,
      "avgMonthlyCompleted": 12
    },
    "charts": {
      "weekly": [
        {
          "period": "2024-W48",
          "week": 48,
          "year": 2024,
          "completed": 3,
          "notCompleted": 1
        }
      ],
      "monthly": [
        {
          "period": "2024-12",
          "month": 12,
          "year": 2024,
          "monthName": "dezembro",
          "completed": 12,
          "notCompleted": 2
        }
      ]
    }
  }
}
```

### 2. Dashboard do Trainer para Cliente Específico
```http
GET http://localhost:3000/api/workouts/clients/CLIENT_ID/dashboard?period=3
Authorization: Bearer SEU_TOKEN_TRAINER
```

---

## 🔔 Notificações

### 1. Listar Notificações do Trainer
```http
GET http://localhost:3000/api/notifications
Authorization: Bearer SEU_TOKEN_TRAINER
```

**Parâmetros:**
- `unreadOnly`: `true` ou `false` (padrão: false)
- `limit`: Número de resultados (padrão: 50)
- `page`: Página (padrão: 1)

### 2. Contagem de Notificações Não Lidas
```http
GET http://localhost:3000/api/notifications/unread-count
Authorization: Bearer SEU_TOKEN_TRAINER
```

### 3. Ver Notificação Específica (marca como lida automaticamente)
```http
GET http://localhost:3000/api/notifications/NOTIFICATION_ID
Authorization: Bearer SEU_TOKEN_TRAINER
```

### 4. Marcar Notificação como Lida
```http
PUT http://localhost:3000/api/notifications/NOTIFICATION_ID/read
Authorization: Bearer SEU_TOKEN_TRAINER
```

### 5. Marcar Todas como Lidas
```http
PUT http://localhost:3000/api/notifications/read-all
Authorization: Bearer SEU_TOKEN_TRAINER
```

### 6. Deletar Notificação
```http
DELETE http://localhost:3000/api/notifications/NOTIFICATION_ID
Authorization: Bearer SEU_TOKEN_TRAINER
```

**Nota:** Quando um cliente marca treino como não completado, o trainer recebe automaticamente uma notificação.

---

## 💬 Sistema de Chat/Mensagens

### 1. Enviar Mensagem de Chat
```http
POST http://localhost:3000/api/messages
Authorization: Bearer SEU_TOKEN
Content-Type: application/json

{
  "recipientId": "ID_DO_DESTINATARIO",
  "message": "Olá! Como está o treino?",
  "type": "chat",
  "priority": "medium"
}
```

### 2. Obter Conversa entre Dois Usuários
```http
GET http://localhost:3000/api/messages/conversation/OTHER_USER_ID?limit=50&page=1
Authorization: Bearer SEU_TOKEN
```

### 3. Listar Todas as Conversas
```http
GET http://localhost:3000/api/messages/conversations
Authorization: Bearer SEU_TOKEN
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "userId": "...",
        "firstName": "João",
        "lastName": "Silva",
        "lastMessage": {
          "message": "Olá!",
          "createdAt": "2024-12-15T10:00:00Z",
          "isRead": false
        },
        "unreadCount": 3
      }
    ]
  }
}
```

### 4. Contar Mensagens Não Lidas
```http
GET http://localhost:3000/api/messages/unread-count
Authorization: Bearer SEU_TOKEN
```

**Com filtro por remetente:**
```http
GET http://localhost:3000/api/messages/unread-count?senderId=SENDER_ID
Authorization: Bearer SEU_TOKEN
```

### 5. Marcar Mensagem como Lida
```http
PUT http://localhost:3000/api/messages/MESSAGE_ID/read
Authorization: Bearer SEU_TOKEN
```

---

## ⚠️ Alertas de Trainer

### 1. Trainer Enviar Alerta quando Cliente Faltar Treino
```http
POST http://localhost:3000/api/messages/alert/workout-missed
Authorization: Bearer SEU_TOKEN_TRAINER
Content-Type: application/json

{
  "clientId": "ID_DO_CLIENTE",
  "workoutLogId": "ID_DO_WORKOUT_LOG",
  "message": "Notei que faltou ao treino de ontem. Vamos conversar sobre isso?",
  "priority": "high"
}
```

**Nota:** O `workoutLogId` é opcional. O `priority` pode ser: `low`, `medium`, `high`, `urgent`.

---

## 👨‍💼 Gestão de Trainers (Admin)

### 1. Admin Criar Trainer
```http
POST http://localhost:3000/api/users/admin/trainers
Authorization: Bearer SEU_TOKEN_ADMIN
Content-Type: application/json

{
  "username": "novotrainer",
  "email": "novotrainer@test.com",
  "password": "password123",
  "firstName": "Pedro",
  "lastName": "Costa",
  "phone": "934567890",
  "dateOfBirth": "1985-05-15",
  "gender": "male",
  "specialization": ["força", "condicionamento"],
  "experience": 8,
  "certification": ["Certificação Internacional"],
  "bio": "Personal trainer com 8 anos de experiência",
  "hourlyRate": 60,
  "isApproved": true
}
```

### 2. Admin Atualizar Trainer
```http
PUT http://localhost:3000/api/users/admin/trainers/TRAINER_ID
Authorization: Bearer SEU_TOKEN_ADMIN
Content-Type: application/json

{
  "specialization": ["força", "resistência", "perda_peso"],
  "experience": 10,
  "hourlyRate": 70,
  "bio": "Personal trainer experiente atualizado",
  "isApproved": true
}
```

### 3. Admin Deletar Trainer
```http
DELETE http://localhost:3000/api/users/admin/trainers/TRAINER_ID
Authorization: Bearer SEU_TOKEN_ADMIN
```

**Nota:** Não permite deletar se trainer tem clientes atribuídos.

### 4. Admin Aprovar/Rejeitar Trainer
```http
PUT http://localhost:3000/api/users/trainer/TRAINER_ID/approve
Authorization: Bearer SEU_TOKEN_ADMIN
Content-Type: application/json

{
  "isApproved": true,
  "reason": "Aprovado após verificação de certificações"
}
```

---

## 👥 Trainer Adicionar Clientes

### 1. Trainer Criar Cliente
```http
POST http://localhost:3000/api/users/trainer/clients
Authorization: Bearer SEU_TOKEN_TRAINER_APROVADO
Content-Type: application/json

{
  "username": "novocliente",
  "email": "novocliente@test.com",
  "password": "password123",
  "firstName": "Ana",
  "lastName": "Ferreira",
  "phone": "945678901",
  "dateOfBirth": "1992-03-20",
  "gender": "female"
}
```

**Nota:** O cliente é automaticamente atribuído ao trainer que o criou.

---

## 📝 Fluxo Completo de Teste

### Fluxo 1: Cliente Registra Treino Não Cumprido → Trainer Recebe Notificação

1. **Cliente marca treino como não completado:**
```http
POST http://localhost:3000/api/client/workouts/daily-status
Authorization: Bearer TOKEN_CLIENTE
Content-Type: application/json

{
  "isCompleted": false,
  "nonCompletionReason": "falta_tempo"
}
```

2. **Trainer verifica notificações:**
```http
GET http://localhost:3000/api/notifications/unread-count
Authorization: Bearer TOKEN_TRAINER
```

3. **Trainer envia alerta ao cliente:**
```http
POST http://localhost:3000/api/messages/alert/workout-missed
Authorization: Bearer TOKEN_TRAINER
Content-Type: application/json

{
  "clientId": "ID_CLIENTE",
  "message": "Notei que faltou ao treino. Podemos conversar?",
  "priority": "high"
}
```

### Fluxo 2: Consultar Dashboard e Calendário

1. **Cliente consulta calendário:**
```http
GET http://localhost:3000/api/client/workouts/calendar?month=12&year=2024
Authorization: Bearer TOKEN_CLIENTE
```

2. **Cliente consulta dashboard:**
```http
GET http://localhost:3000/api/client/workouts/dashboard?period=6
Authorization: Bearer TOKEN_CLIENTE
```

3. **Trainer consulta dashboard do cliente:**
```http
GET http://localhost:3000/api/workouts/clients/CLIENT_ID/dashboard?period=3
Authorization: Bearer TOKEN_TRAINER
```

### Fluxo 3: Chat entre Trainer e Cliente

1. **Cliente envia mensagem:**
```http
POST http://localhost:3000/api/messages
Authorization: Bearer TOKEN_CLIENTE
Content-Type: application/json

{
  "recipientId": "ID_TRAINER",
  "message": "Olá! Tenho uma dúvida sobre o treino de hoje.",
  "type": "chat"
}
```

2. **Trainer verifica mensagens não lidas:**
```http
GET http://localhost:3000/api/messages/unread-count
Authorization: Bearer TOKEN_TRAINER
```

3. **Trainer abre conversa:**
```http
GET http://localhost:3000/api/messages/conversation/ID_CLIENTE
Authorization: Bearer TOKEN_TRAINER
```

---

## 🔍 Variáveis de Ambiente Postman

Crie variáveis no Postman para facilitar:
- `base_url`: `http://localhost:3000`
- `token_cliente`: Token do cliente após login
- `token_trainer`: Token do trainer após login
- `token_admin`: Token do admin após login
- `client_id`: ID do cliente
- `trainer_id`: ID do trainer

**Exemplo de uso:**
```http
GET {{base_url}}/api/client/workouts/calendar
Authorization: Bearer {{token_cliente}}
```

---

## ✅ Checklist de Testes

### Funcionalidades Básicas
- [ ] Registrar cliente e fazer login
- [ ] Registrar trainer e fazer login
- [ ] Cliente consulta calendário de treinos
- [ ] Cliente registra treino completado
- [ ] Cliente registra treino não completado com motivo

### Dashboards
- [ ] Cliente consulta seu dashboard
- [ ] Trainer consulta dashboard de cliente
- [ ] Verificar gráficos semanais e mensais

### Notificações
- [ ] Trainer recebe notificação quando cliente não completa treino
- [ ] Trainer lista notificações
- [ ] Trainer marca notificação como lida
- [ ] Trainer marca todas como lidas

### Chat/Mensagens
- [ ] Cliente envia mensagem para trainer
- [ ] Trainer envia mensagem para cliente
- [ ] Listar conversas
- [ ] Ver mensagens não lidas
- [ ] Trainer envia alerta quando cliente faltar

### Gestão Admin
- [ ] Admin cria trainer
- [ ] Admin atualiza trainer
- [ ] Admin deleta trainer (sem clientes)
- [ ] Admin aprova/rejeita trainer

### Gestão Trainer
- [ ] Trainer aprovado cria cliente
- [ ] Trainer lista seus clientes

---

## 📌 Notas Importantes

1. **Ordem de Teste:**
   - Primeiro criar usuários (cliente, trainer, admin)
   - Admin aprovar trainer
   - Trainer criar plano de treino para cliente
   - Depois testar funcionalidades de treino

2. **IDs Necessários:**
   - IDs de usuários são retornados após criação
   - IDs de planos e sessões são retornados quando trainer cria plano
   - Guarde esses IDs para usar nos testes

3. **Tokens:**
   - Tokens expiram em 7 dias (configurável via JWT_EXPIRE)
   - Se receber 401, faça login novamente

4. **Erros Comuns:**
   - 401: Token inválido ou expirado → Fazer login
   - 403: Sem permissão → Verificar role do usuário
   - 404: Recurso não encontrado → Verificar IDs
   - 400: Dados inválidos → Verificar formato do JSON

---

## 🚀 Quick Start

1. **Iniciar servidor:**
   ```bash
   npm start
   # ou
   npm run dev
   ```

2. **Criar usuários base:**
   - Registrar admin (via código ou diretamente no banco)
   - Registrar trainer
   - Admin aprovar trainer
   - Trainer criar cliente
   - Trainer criar plano de treino

3. **Testar funcionalidades:**
   - Seguir o checklist acima
   - Usar os exemplos de requisições fornecidos

---

**Boa sorte com os testes! 🎉**

