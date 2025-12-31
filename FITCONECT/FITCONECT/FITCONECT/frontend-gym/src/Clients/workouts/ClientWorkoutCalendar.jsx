import React, { useState, useEffect, useRef } from 'react';
import ClientLayout from '../../components/ClientLayout/ClientLayout';
import NonCompletionModal from '../../components/NonCompletionModal/NonCompletionModal';
import { workoutLogService } from '../../services/workoutLogService';
import { toast } from 'react-toastify';
import './ClientWorkoutCalendar.scss';

export default function ClientWorkoutCalendar() {
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [notes, setNotes] = useState({});
  const [completionStatus, setCompletionStatus] = useState({});
  const [workoutLogs, setWorkoutLogs] = useState({}); // { 'YYYY-MM-DD': { _id, proofImage, ... } }

  // New: selected images per date and previews
  const [selectedImages, setSelectedImages] = useState({}); // { 'YYYY-MM-DD': File[] }
  const [imagePreviews, setImagePreviews] = useState({});   // { 'YYYY-MM-DD': previewUrl[] }
  const [proofImageUploading, setProofImageUploading] = useState({}); // { 'YYYY-MM-DD': boolean }

  // Modal de não cumprimento
  const [nonCompletionModal, setNonCompletionModal] = useState({
    isOpen: false,
    logId: null,
    date: null
  });

  const isSameDay = (d1, d2) =>
    toLocalDateKey(d1) === toLocalDateKey(d2);

  const isPastDay = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    return target < today;
  };

  // Obter início do plano
  const getPlanStartDate = () => {
    if (!workoutPlan?.startDate) return null;
    const d = new Date(workoutPlan.startDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Obter fim do plano baseado na duração
  const getPlanEndDate = () => {
    const start = getPlanStartDate();
    if (!start || !workoutPlan?.totalWeeks) return null;
    const end = new Date(start);
    end.setDate(start.getDate() + workoutPlan.totalWeeks * 7 - 1);
    return end;
  }

  // Verifica se uma data está dentro do plano
  const isDateWithinPlan = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const start = getPlanStartDate();
    const end = getPlanEndDate();
    if (!start || !end) return true;
    return d >= start && d <= end;
  }




  const fileInputRefs = useRef({}); // map dateKey -> input element ref
  const proofImageInputRefs = useRef({}); // map dateKey -> proof image input element ref

  const MAX_IMAGES = 5;
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Dias da semana
  const weekDays = [
    'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'
  ];

  const dayKeyMap = {
    'Segunda-feira': 'monday',
    'Terça-feira': 'tuesday',
    'Quarta-feira': 'wednesday',
    'Quinta-feira': 'thursday',
    'Sexta-feira': 'friday',
    'Sábado': 'saturday',
    'Domingo': 'sunday'
  };

  // Utilitário: gera YYYY-MM-DD usando a data no fuso local (evita shifts por UTC)
  const toLocalDateKey = (d) => {
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Função reutilizável para buscar logs e popular completionStatus
  const fetchLogsAndSetCompletionStatus = async () => {
    if (!token) return;
    try {
      const logsRes = await fetch('/api/client/workouts/logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!logsRes.ok) {
        console.warn('Falha ao buscar logs:', logsRes.status);
        return;
      }

      const logsData = await logsRes.json();
      console.log('Logs de treinos (fetchLogs):', logsData);

      // Normalizar onde estão os logs na resposta
      const logsArray = (logsData.data && logsData.data.logs) || logsData.logs || logsData.data || [];

      const completedDates = {};
      const logsByDate = {};
      logsArray.forEach(log => {
        // Usar completedAt como campo principal da data (campo correto do WorkoutLog)
        const rawDate = log.completedAt || log.date || log.logDate || log.createdAt || log.timestamp || log.dateOnly;
        if (rawDate) {
          const dateKey = toLocalDateKey(rawDate);
          // Só marcar como concluído se isCompleted for explicitamente true
          if (log.isCompleted === true) {
            completedDates[dateKey] = true;
          }
          // Armazenar o log completo para acessar proofImage e _id (mesmo se não estiver concluído)
          // Isso permite desmarcar treinos que foram marcados como não concluídos
          logsByDate[dateKey] = {
            ...log,
            _id: log._id || log.id // Garantir que temos _id
          };
        }
      });

      console.log('Logs processados:', {
        completedDates,
        logsByDate: Object.keys(logsByDate),
        totalLogs: logsArray.length
      });

      setCompletionStatus(completedDates);
      setWorkoutLogs(logsByDate);
      console.log('Status de conclusão atualizado:', completedDates);
    } catch (err) {
      console.error('Erro ao recarregar logs:', err);
    }
  };

  // Carregar plano de treinos e histórico de conclusões
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Carregar plano de treinos
        const planRes = await fetch('/api/client/workouts/plans', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        

        if (!planRes.ok) {
          throw new Error(`HTTP ${planRes.status}`);
        }

        const planData = await planRes.json();
        console.log('Resposta completa da API (plans):', planData);

        // A API retorna { success: true, data: { plans: [...], pagination: {...} } } ou outras variações
        let activePlan = null;
        const plansArray =
          (planData && planData.data && planData.data.plans) ||
          planData.plans ||
          (planData && planData.data) ||
          [];

        if (Array.isArray(plansArray) && plansArray.length > 0) {
          activePlan = plansArray.find(p => p.isActive) || plansArray[0];
        } else if (planData && (planData._id || planData.id)) {
          activePlan = planData;
        }

        if (activePlan) {
          console.log('Plano selecionado (raw):', activePlan);
          console.log('Sessões (raw):', activePlan.sessions);

          // Se o plano não tem sessões detalhadas, buscar o plano completo
          const sessionsMissing = !activePlan.sessions || activePlan.sessions.length === 0;
          if (sessionsMissing) {
            console.warn('Sessões incompletas, buscando plano detalhado...');
            try {
              const planId = activePlan._id || activePlan.id;
              if (planId) {
                const detailRes = await fetch(`/api/client/workouts/plans/${planId}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });

                if (detailRes.ok) {
                  const detailData = await detailRes.json();
                  console.log('RAW detailData (string):', JSON.stringify(detailData, null, 2));

                  const detailPlan =
                    (detailData && detailData.data && (detailData.data.plan || detailData.data)) ||
                    detailData.plan ||
                    detailData;

                  if (detailPlan) {
                    // Normalizar sessions/exercises para diversas formas possíveis
                    detailPlan.sessions = detailPlan.sessions || detailPlan.session || detailPlan.sessionsList || [];
                    detailPlan.sessions = detailPlan.sessions.map(s => ({
                      ...s,
                      exercises: s.exercises || s.exs || s.items || []
                    }));

                    activePlan = detailPlan;
                    console.log('Plano detalhado normalizado:', activePlan);
                  }
                } else {
                  console.warn('Falha ao buscar detalhe do plano:', detailRes.status);
                }
              }
            } catch (detailError) {
              console.error('Erro ao buscar detalhes do plano:', detailError);
            }
          }

          if (!activePlan.sessions || activePlan.sessions.length === 0) {
            console.warn('Plano final NÃO tem sessions após normalização:', activePlan);
          }

          setWorkoutPlan(activePlan);

          // 2. Carregar histórico de treinos concluídos
          await fetchLogsAndSetCompletionStatus();
        } else {
          console.error('Nenhum plano encontrado');
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  // Calcular datas da semana atual
  const getWeekDates = () => {
    const dates = [];
    const startDate = new Date(currentDate);

    // Ir para o início da semana (Segunda-feira)
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i + (selectedWeek * 7));
      dates.push(date);
    }

    return dates;
  };

  // Encontrar treino para um dia específico
  const getWorkoutForDay = (dayOfWeek) => {
    if (!workoutPlan || !workoutPlan.sessions) {
      return null;
    }

    const dayKey = dayKeyMap[dayOfWeek];
    const session = workoutPlan.sessions.find(s => s.dayOfWeek === dayKey);

    if (session && session.exercises && session.exercises.length > 0) {
      return {
        ...session,
        dayName: dayOfWeek
      };
    }

    return null;
  };

  // Salvar nota para um dia específico
  const saveNote = (date, note) => {
    const dateKey = toLocalDateKey(date);
    setNotes(prev => ({ ...prev, [dateKey]: note }));
  };

  // Calcular número da semana baseado na data de início do plano
  const calculateWeekNumber = (date) => {
    if (!workoutPlan || !workoutPlan.startDate) {
      return 1;
    }

    const startDate = new Date(workoutPlan.startDate);
    startDate.setHours(0, 0, 0, 0);

    const currentDateObj = new Date(date);
    currentDateObj.setHours(0, 0, 0, 0);

    const diffTime = currentDateObj - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;

    return Math.max(1, weekNumber);
  };

  // Upload images helper (Opção A: upload separado para /api/uploads, recebe urls)
  const uploadImages = async (files) => {
    if (!files || files.length === 0) return [];

    const form = new FormData();
    for (let f of files) {
      form.append('files', f); // backend must accept 'files' array
    }

    const res = await fetch('/api/uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: form
    });

    const result = await res.json();
    if (!res.ok) {
      console.error('Erro no upload:', result);
      throw new Error(result.message || 'Erro no upload de imagens');
    }

    // Expect result.data.urls || result.data.files || result.urls
    return (result.data && (result.data.urls || result.data.files)) || result.urls || [];
  };

  // Adicione este useEffect após os outros useEffects no ClientWorkoutCalendar.jsx

  // Polling para verificar atualizações do plano a cada 30 segundos
  useEffect(() => {
    if (!token) return;

    const pollInterval = setInterval(async () => {
      try {
        const planRes = await fetch('/api/client/workouts/plans', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!planRes.ok) return;

        const planData = await planRes.json();

        const plansArray =
          (planData && planData.data && planData.data.plans) ||
          planData.plans ||
          (planData && planData.data) ||
          [];

        let activePlan = null;
        if (Array.isArray(plansArray) && plansArray.length > 0) {
          activePlan = plansArray.find(p => p.isActive) || plansArray[0];
        } else if (planData && (planData._id || planData.id)) {
          activePlan = planData;
        }

        if (activePlan) {
          // Verificar se houve mudanças no plano
          const planChanged = !workoutPlan ||
            workoutPlan._id !== activePlan._id ||
            JSON.stringify(workoutPlan.sessions) !== JSON.stringify(activePlan.sessions) ||
            workoutPlan.name !== activePlan.name ||
            workoutPlan.frequency !== activePlan.frequency;

          if (planChanged) {
            console.log('🔄 Plano atualizado detectado, recarregando...');

            // Se sessões estão incompletas, buscar detalhes
            const sessionsMissing = !activePlan.sessions || activePlan.sessions.length === 0;
            if (sessionsMissing) {
              const planId = activePlan._id || activePlan.id;
              if (planId) {
                const detailRes = await fetch(`/api/client/workouts/plans/${planId}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });

                if (detailRes.ok) {
                  const detailData = await detailRes.json();
                  const detailPlan =
                    (detailData && detailData.data && (detailData.data.plan || detailData.data)) ||
                    detailData.plan ||
                    detailData;

                  if (detailPlan) {
                    detailPlan.sessions = detailPlan.sessions || detailPlan.session || detailPlan.sessionsList || [];
                    detailPlan.sessions = detailPlan.sessions.map(s => ({
                      ...s,
                      exercises: s.exercises || s.exs || s.items || []
                    }));
                    activePlan = detailPlan;
                  }
                }
              }
            }

            setWorkoutPlan(activePlan);

            // Mostrar notificação ao utilizador
            console.log(' Plano de treino atualizado!');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar atualizações:', error);
      }
    }, 30000); // Verificar a cada 30 segundos

    return () => clearInterval(pollInterval);
  }, [token, workoutPlan]);

  // Handler para seleção de imagens e criação de previews
  const handleImageChange = (date, filesList) => {
    const dateKey = toLocalDateKey(date);
    const files = Array.from(filesList || []);
    const prevFiles = selectedImages[dateKey] || [];
    const newFiles = [];

    const previews = imagePreviews[dateKey] ? [...imagePreviews[dateKey]] : [];

    for (let f of files) {
      if (newFiles.length + prevFiles.length >= MAX_IMAGES) break;
      if (!ALLOWED_TYPES.includes(f.type)) {
        alert('Apenas JPEG, PNG ou WEBP são permitidos.');
        continue;
      }
      if (f.size > MAX_IMAGE_SIZE) {
        alert('Cada imagem deve ter no máximo 5MB.');
        continue;
      }
      newFiles.push(f);
      previews.push(URL.createObjectURL(f));
    }

    setSelectedImages(prev => ({ ...prev, [dateKey]: [...(prev[dateKey] || []), ...newFiles] }));
    setImagePreviews(prev => ({ ...prev, [dateKey]: previews }));
  };

  const removeSelectedImage = (dateKey, index) => {
    // revoke preview URL
    setImagePreviews(prev => {
      const next = { ...prev };
      if (!next[dateKey]) return prev;
      const removed = next[dateKey].splice(index, 1);
      if (removed && removed[0]) URL.revokeObjectURL(removed[0]);
      next[dateKey] = next[dateKey].slice();
      return next;
    });

    setSelectedImages(prev => {
      const next = { ...prev };
      next[dateKey] = (next[dateKey] || []).filter((_, i) => i !== index);
      return next;
    });
  };

  const openFilePicker = (date) => {
    const dateKey = toLocalDateKey(date);
    const inputEl = fileInputRefs.current[dateKey];
    if (inputEl && typeof inputEl.click === 'function') {
      inputEl.click();
    } else {
      console.warn('file input ref não encontrado para', dateKey);
    }
  };

  // Função para fazer upload de imagem de prova
  const uploadProofImage = async (date, file) => {
    const dateKey = toLocalDateKey(date);
    const workoutLog = workoutLogs[dateKey];

    if (!workoutLog || !workoutLog._id) {
      alert('Erro: Log de treino não encontrado. Por favor, marque o treino como concluído primeiro.');
      return;
    }

    if (!file) {
      alert('Por favor, selecione uma imagem.');
      return;
    }

    // Validar tipo de arquivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Apenas JPEG, PNG ou WEBP são permitidos.');
      return;
    }

    // Validar tamanho
    if (file.size > MAX_IMAGE_SIZE) {
      alert('A imagem deve ter no máximo 5MB.');
      return;
    }

    setProofImageUploading(prev => ({ ...prev, [dateKey]: true }));

    try {
      const formData = new FormData();
      formData.append('proofImage', file);

      const res = await fetch(`/api/client/workouts/logs/${workoutLog._id}/proof-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Erro ao fazer upload da imagem de prova');
      }

      // Atualizar o log local com a nova imagem de prova
      setWorkoutLogs(prev => ({
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          proofImage: result.data?.imageUrl || result.data?.workoutLog?.proofImage
        }
      }));

      alert('Imagem de prova enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload de imagem de prova:', error);
      alert(`Erro ao enviar imagem: ${error.message}`);
    } finally {
      setProofImageUploading(prev => ({ ...prev, [dateKey]: false }));
    }
  };

  const handleProofImageChange = (date, event) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadProofImage(date, file);
    }
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    event.target.value = '';
  };

  const openProofImagePicker = (date) => {
    const dateKey = toLocalDateKey(date);
    const inputEl = proofImageInputRefs.current[dateKey];
    if (inputEl && typeof inputEl.click === 'function') {
      inputEl.click();
    } else {
      console.warn('proof image input ref não encontrado para', dateKey);
    }
  };

  // Função para lidar com o submit do modal de não cumprimento
  const handleNonCompletionSubmit = async (formData) => {
    const { logId, date } = nonCompletionModal;
    const dateKey = toLocalDateKey(date);

    try {
      let response;

      if (logId) {
        // Se já existe log, atualizar usando a rota de atualização
        response = await workoutLogService.updateLogStatus(logId, {
          isCompleted: false,
          ...formData
        });
        console.log('Resposta da API ao atualizar log existente:', response);
      } else {
        // Se não existe log, criar novo log de não cumprimento usando daily-status
        const token = localStorage.getItem('token');

        // Formatar data como YYYY-MM-DD
        const dateStr = date.toISOString().split('T')[0];

        response = await fetch('/api/client/workouts/daily-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            date: dateStr,
            isCompleted: false,
            nonCompletionReason: formData.nonCompletionReason,
            nonCompletionNotes: formData.nonCompletionNotes
          })
        });

        const responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData.message || 'Erro ao criar log de não cumprimento');
        }
        response = responseData;
        console.log('Resposta da API ao criar novo log de não cumprimento:', response);
      }

      // Atualizar estado local imediatamente
      console.log('Desmarcando treino para:', dateKey, 'logId:', logId || 'novo');

      // Remover do estado de conclusão (não está mais concluído)
      setCompletionStatus(prev => {
        const updated = { ...prev };
        // Remover a entrada para este dia (não está mais concluído)
        delete updated[dateKey];
        console.log('Estado de conclusão atualizado:', updated);
        return updated;
      });

      // Recarregar logs do servidor para garantir consistência total
      await fetchLogsAndSetCompletionStatus();

      toast.success('Treino marcado como não concluído');

      // Fechar modal
      setNonCompletionModal({ isOpen: false, logId: null, date: null });
    } catch (error) {
      console.error('Erro ao marcar treino como não concluído:', error);
      toast.error(error.message || 'Erro ao atualizar status do treino');
      throw error;
    }
  };

  // Função para fechar o modal sem submeter (cancelar)
  const handleNonCompletionCancel = () => {
    // Não precisa reverter estado porque não atualizamos antes de abrir o modal
    setNonCompletionModal({ isOpen: false, logId: null, date: null });
  };

  // Alternar status de conclusão e enviar para API (inclui upload de imagens)
  const toggleCompletion = async (date) => {
    if (!workoutPlan) {
      alert('Nenhum plano de treino encontrado.');
      return;
      
    }

    const dateKey = toLocalDateKey(date);
    const isCurrentlyCompleted = completionStatus[dateKey];
    const newStatus = !isCurrentlyCompleted;

    // Se está marcando como concluído, atualizar estado local imediatamente
    // Se está desmarcando, não atualizar ainda (aguardar confirmação do modal)
    if (newStatus) {
      setCompletionStatus(prev => ({
        ...prev,
        [dateKey]: newStatus
      }));
    }

    // Enviar para API / sincronizar com o servidor
    try {
      if (newStatus) {
        // Marcar como concluído - criar log
        const dayIndex = date.getDay(); // 0 = domingo, 1 = segunda, etc.
        const weekDayIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Converter para índice do array weekDays (0 = segunda)
        const dayOfWeekName = weekDays[weekDayIndex];
        const workout = getWorkoutForDay(dayOfWeekName);

        if (!workout) {
          console.log('Nenhum treino para este dia, apenas marcando localmente');
          // Recarregar logs para garantir consistência
          await fetchLogsAndSetCompletionStatus();
          return;
        }

        const dayOfWeek = dayKeyMap[dayOfWeekName] || 'monday';
        const week = calculateWeekNumber(date);
        const workoutPlanId = workoutPlan._id || workoutPlan.id;

        if (!workoutPlanId) {
          throw new Error('ID do plano de treino não encontrado');
        }

        const exercises = workout.exercises
          .filter(ex => ex.exercise) // Filtrar exercícios sem referência
          .map(ex => {
            const exerciseId = ex.exercise?._id || ex.exercise?.id || ex.exercise;
            if (!exerciseId) return null;
            const numSets = ex.sets || 3;

            let repsValue = ex.reps;
            if (typeof repsValue === 'string') {
              const match = repsValue.match(/\d+/);
              repsValue = match ? parseInt(match[0]) : 10;
            } else if (typeof repsValue === 'number') {
              repsValue = repsValue;
            } else {
              repsValue = 10;
            }

            const setsArray = [];
            for (let i = 0; i < numSets; i++) {
              setsArray.push({
                setNumber: i + 1,
                reps: repsValue,
                weight: null,
                completed: true
              });
            }

            return {
              exercise: exerciseId,
              sets: setsArray,
              notes: ''
            };
          })
          .filter(ex => ex !== null);

        // Upload images (if any) before creating log
        const filesToUpload = selectedImages[dateKey] || [];
        let uploadedUrls = [];
        if (filesToUpload.length > 0) {
          try {
            uploadedUrls = await uploadImages(filesToUpload);
          } catch (err) {
            console.error('Erro ao fazer upload das imagens:', err);
            alert('Erro ao enviar imagens. Tenta novamente.');
            // Reverter o estado local
            setCompletionStatus(prev => ({ ...prev, [dateKey]: isCurrentlyCompleted }));
            return;
          }
        }

        const logData = {
          workoutPlanId: workoutPlanId,
          sessionId: workout._id || workout.id || null,
          week: week,
          dayOfWeek: dayOfWeek,
          // Enviar explicitamente a data em ISO e o dateOnly local para evitar ambiguidades
          date: date.toISOString(),
          dateOnly: dateKey,
          images: uploadedUrls, // URLs retornadas pelo /api/uploads
          actualDuration: 50,
          exercises: exercises,
          overallNotes: notes[dateKey] || '',
          difficulty: 'médio',
          energy: 'alta',
          mood: 'bom',
          painLevel: 'nenhuma',
          isCompleted: true
        };

        console.log('=== DEBUG LOG ===');
        console.log('Enviando log de treino:', JSON.stringify(logData, null, 2));

        const res = await fetch('/api/client/workouts/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(logData)
        });

        const result = await res.json();
        console.log('Resposta da API (POST logs):', result);

        if (!res.ok) {
          console.error('Erro HTTP:', res.status, result);
          throw new Error(result.message || `Erro HTTP ${res.status}`);
        }

        // Se API devolve o log criado, usá-lo para definir a chave de data correta
        const createdLog = (result.data && (result.data.log || result.data)) || result.log || result;
        let serverDateKey = dateKey;
        if (createdLog) {
          const rawDate = createdLog.date || createdLog.createdAt || createdLog.logDate || createdLog.dateOnly;
          if (rawDate) {
            serverDateKey = toLocalDateKey(rawDate);
          }
        }

        // Garantir que o estado local reflete o que está na BD
        setCompletionStatus(prev => ({ ...prev, [serverDateKey]: true }));

        // Armazenar o log completo para acessar proofImage e _id
        if (createdLog) {
          setWorkoutLogs(prev => ({
            ...prev,
            [serverDateKey]: createdLog
          }));
        }

        // Limpar imagens selecionadas e previews para essa data (já foram enviadas)
        setSelectedImages(prev => {
          const next = { ...prev };
          delete next[dateKey];
          return next;
        });
        setImagePreviews(prev => {
          const next = { ...prev };
          if (next[dateKey]) {
            next[dateKey].forEach(url => {
              try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
            });
          }
          delete next[dateKey];
          return next;
        });

        // Recarregar logs do servidor para garantir consistência (paginacao/respostas)
        await fetchLogsAndSetCompletionStatus();
        toast.success('Treino marcado como concluído!');
        console.log('Log salvo com sucesso e estado sincronizado.');
      } else {
        // Desmarcar como concluído - verificar se há logId e abrir modal
        const dateKey = toLocalDateKey(date);
        const workoutLog = workoutLogs[dateKey];

        if (workoutLog && workoutLog._id) {
          // Se há um log existente, abrir modal para coletar motivo
          // O estado local não foi atualizado ainda, então não precisa reverter
          setNonCompletionModal({
            isOpen: true,
            logId: workoutLog._id,
            date: date
          });
        } else {
          // Se não há log, apenas recarregar (não havia treino marcado)
          await fetchLogsAndSetCompletionStatus();
        }
      }
    } catch (error) {
      console.error('Erro ao salvar conclusão:', error);
      // Reverter estado local em caso de erro
      setCompletionStatus(prev => ({
        ...prev,
        [toLocalDateKey(date)]: isCurrentlyCompleted
      }));
      alert(`Erro ao salvar o status do treino: ${error.message}`);
    }
  };

  // Formatar data
  const formatDate = (date) => {
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).replace(' de ', ' ');
  };

  const totalWeeks = workoutPlan?.totalWeeks || 0;
  // Navegar entre semanas
  const goToPreviousWeek = () => {
    if (selectedWeek > 0) setSelectedWeek(prev => prev - 1);
  };
  
  const goToNextWeek = () => {
    if (selectedWeek < totalWeeks - 1) setSelectedWeek(prev => prev + 1);
  };

  const goToCurrentWeek = () => {
    setSelectedWeek(0);
    setCurrentDate(new Date());
  };

  // Calcular progresso da semana
  const calculateWeekProgress = () => {
    const dates = getWeekDates();
    const completed = dates.filter(date => {
      const dateKey = toLocalDateKey(date);
      return completionStatus[dateKey];
    }).length;

    return Math.round((completed / 7) * 100);
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="client-workout-calendar">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Carregando calendário de treinos...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (!workoutPlan || workoutPlan.isActive === false) {
    return (
      <ClientLayout>
        <div className="client-workout-calendar">
          <div className="no-workout-plan">
            <div className="empty-state">
              <h2>Calendário de Treinos</h2>
              {workoutPlan?.isActive === false ? (
                <p>Este plano de treino foi desativado pelo seu personal trainer.</p>
              ) : (
                <p>Nenhum plano de treino atribuído.</p>
              )}
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  const weekDates = getWeekDates();
  const weekProgress = calculateWeekProgress();

  return (
    <ClientLayout>
      <div className="client-workout-calendar">
        {/* Cabeçalho */}
        <header className="calendar-header">
          <div className="header-info">
            <h1>Calendário de Treinos</h1>
            <p className="plan-name">{workoutPlan.name}</p>
            <div className="plan-info">
              <span className="info-badge">Frequência: {workoutPlan.frequency}</span>
              <span className="info-badge">Duração: {workoutPlan.totalWeeks} semanas</span>
              <span className="info-badge">Início: {new Date(workoutPlan.startDate).toLocaleDateString('pt-PT')}</span>
            </div>
          </div>

          <div className="header-controls">
            <div className="week-navigation">
              <button
                onClick={goToPreviousWeek}
                className="nav-btn"
                disabled={getWeekDates().every(d => d < getPlanStartDate())}
              >
                ◀ Semana Anterior
              </button>

              <button
                onClick={goToNextWeek}
                className="nav-btn"
                disabled={getWeekDates().every(d => d > getPlanEndDate())}
              >
                Próxima Semana ▶
              </button>

            </div>

            <div className="progress-container">
              <div className="progress-label">
                Progresso da Semana: {weekProgress}%
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${weekProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </header>

        {/* Calendário Semanal */}
        <div className="week-calendar">
          {weekDates.map((date, index) => {
            const dayOfWeek = weekDays[index];
            const workout = getWorkoutForDay(dayOfWeek);
            const dateKey = toLocalDateKey(date);
            const isToday = isSameDay(date, new Date());
            const isPast = isPastDay(date);
            const isCompleted = completionStatus[dateKey] === true; // Garantir comparação explícita
            const dayNote = notes[dateKey] || '';
            const previews = imagePreviews[dateKey] || [];
            const workoutLog = workoutLogs[dateKey];
            const proofImage = workoutLog?.proofImage;
            const isUploadingProof = proofImageUploading[dateKey] || false;
            const isPastOrFuture = date.toDateString() !== new Date().toDateString();
            // Verificar se o treino foi desmarcado (existe log mas não está concluído)
            const isUnmarked = workoutLog && workoutLog.isCompleted === false;
            if (!isDateWithinPlan(date)) {
              return null; // não renderiza dias fora do plano
            }
            // Debug: logar estado para este dia específico
            if (workout && (isCompleted || workoutLog)) {
              console.log(`[${dateKey}] Estado:`, {
                isCompleted,
                hasLog: !!workoutLog,
                logId: workoutLog?._id || workoutLog?.id,
                logIsCompleted: workoutLog?.isCompleted,
                isUnmarked
              });
            }
            return (
              <div
                key={index}
                className={`day-card ${isToday ? 'today' : ''} ${isCompleted ? 'completed' : ''} ${isUnmarked ? 'unmarked' : ''}`}
              >
                {/* Cabeçalho do Dia */}
                <div className="day-header">
                  <div className="day-title">
                    <h3>{dayOfWeek}</h3>
                    <span className="date">{formatDate(date)}</span>
                  </div>
                  <div className="day-status">
                    {!workout ? (
                      <span className="status-disabled">
                        Dia de descanso
                      </span>
                    ) : (
                      <div className="completion-buttons-group">
                        <button
                          className="completion-btn mark-btn"
                          onClick={() => toggleCompletion(date)}
                          title={
                            isToday
                              ? 'Marcar como concluído'
                              : 'Só pode marcar como concluído no próprio dia'
                          }
                          disabled={
                            !isToday ||
                            isCompleted ||
                            isUnmarked
                          }
                        >
                          Marcar Concluído
                        </button>
                        <button
                          className="completion-btn unmark-btn"
                          onClick={() => {
                            const dateKey = toLocalDateKey(date);
                            const workoutLog = workoutLogs[dateKey];
                            const logId = workoutLog?._id || workoutLog?.id;

                            setNonCompletionModal({
                              isOpen: true,
                              logId: logId || null,
                              date: date
                            });
                          }}
                          title={
                            isPast
                              ? 'Não é possível desmarcar treinos passados'
                              : isUnmarked
                                ? 'Este treino já foi desmarcado'
                                : 'Desmarcar treino'
                          }
                          disabled={
                            isPast || isUnmarked
                          }
                        >
                          Desmarcar
                        </button>

                      </div>
                    )}
                  </div>
                </div>

                {/* Conteúdo do Dia */}
                <div className="day-content">
                  {workout ? (
                    <>
                      {/* Sessão de Treino Principal */}
                      <div className="workout-session">
                        <div className="session-header">
                          <h4>Treino de {workout.dayName.replace('-feira', '')}</h4>
                          <span className="session-count">
                            {workout.exercises.length} exercícios
                          </span>
                        </div>

                        <div className="exercises-list">
                          {workout.exercises.slice(0, 3).map((exercise, idx) => (
                            <div key={idx} className="exercise-item">
                              <span className="exercise-name">
                                {exercise.exercise?.name || `Exercício ${idx + 1}`}
                              </span>
                              <span className="exercise-details">
                                {exercise.sets} séries - {exercise.reps} repetições
                              </span>
                            </div>
                          ))}

                          {workout.exercises.length > 3 && (
                            <div className="more-exercises">
                              +{workout.exercises.length - 3} mais exercícios
                            </div>
                          )}
                        </div>

                        <div className="session-stats">
                          <div className="stat">
                            <span className="stat-label">Total Séries:</span>
                            <span className="stat-value">
                              {workout.exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0)}
                            </span>
                          </div>
                          <div className="stat">
                            <span className="stat-label">Tempo Estimado:</span>
                            <span className="stat-value">45-60 min</span>
                          </div>
                        </div>
                      </div>

                      {/* Cardio/Atividade Adicional (se houver) */}
                      {index % 3 === 0 && (
                        <div className="cardio-session">
                          <h5>Cardio Leve</h5>
                          <p>30 minutos - Passadeira</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="no-workout">
                      <p>Nenhum treino agendado para este dia.</p>
                      <p className="rest-message">Dia de descanso ou recuperação.</p>
                    </div>
                  )}

                  {/* Notas do Cliente + Upload de Imagens */}
                  <div className="day-notes">
                    <textarea
                      placeholder="Adicione notas sobre o seu treino, como peso usado, dificuldade, ou como se sentiu..."
                      value={dayNote}
                      onChange={(e) => saveNote(date, e.target.value)}
                      className="notes-textarea"
                    />

                    <div className="image-upload">
                      {/* hidden input controlled by ref */}
                      <input
                        id={`file-input-${dateKey}`}
                        ref={el => fileInputRefs.current[dateKey] = el}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageChange(date, e.target.files)}
                        style={{ display: 'none' }}
                      />
                      <button type="button" className="btn-attach-images" onClick={() => openFilePicker(date)}>
                        Anexar imagens
                      </button>

                      <div className="image-previews">
                        {previews.map((src, i) => (
                          <div key={i} className="preview-item">
                            <img src={src} alt={`preview-${i}`} />
                            <button type="button" className="btn-remove-preview" onClick={() => removeSelectedImage(dateKey, i)}>✕</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Upload de Imagem de Prova (apenas para treinos concluídos) */}
                    {isCompleted && (
                      <div className="proof-image-section">
                        <div className="proof-image-header">
                          <h5>Imagem de Prova do Treino</h5>
                          <small>Demonstre que completou o treino</small>
                        </div>

                        {proofImage ? (
                          <div className="proof-image-display">
                            <img
                              src={proofImage.startsWith('http') ? proofImage : `${proofImage}`}
                              alt="Imagem de prova do treino"
                              className="proof-image"
                            />
                            <button
                              type="button"
                              className="btn-change-proof-image"
                              onClick={() => openProofImagePicker(date)}
                              disabled={isUploadingProof}
                            >
                              {isUploadingProof ? 'A enviar...' : 'Alterar Imagem'}
                            </button>
                          </div>
                        ) : (
                          <div className="proof-image-upload">
                            <input
                              id={`proof-image-input-${dateKey}`}
                              ref={el => proofImageInputRefs.current[dateKey] = el}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => handleProofImageChange(date, e)}
                              style={{ display: 'none' }}
                            />
                            <button
                              type="button"
                              className="btn-upload-proof-image"
                              onClick={() => openProofImagePicker(date)}
                              disabled={isUploadingProof}
                            >
                              {isUploadingProof ? '⏳ A enviar...' : '📷 Enviar Imagem de Prova'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Informação de Treino Desmarcado */}
                    {isUnmarked && workoutLog && (
                      <div className="unmarked-workout-section">
                        <div className="unmarked-header">
                          <h5> Treino Desmarcado</h5>
                          <span className="unmarked-badge">Não Concluído</span>
                        </div>
                        {workoutLog.nonCompletionReason && (
                          <div className="unmarked-reason">
                            <strong>Motivo:</strong>
                            <p>{workoutLog.nonCompletionReason}</p>
                          </div>
                        )}
                        {workoutLog.nonCompletionNotes && (
                          <div className="unmarked-notes">
                            <strong>Notas:</strong>
                            <p>{workoutLog.nonCompletionNotes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {dayNote && (
                      <div className="notes-preview">
                        <small>Notas salvas automaticamente</small>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé do Dia */}
                <div className="day-footer">
                  <div className="completion-status">
                    <span className={`status-text ${isCompleted ? 'completed' : ''} ${isUnmarked ? 'unmarked' : ''}`}>
                      {isCompleted ? 'Treino Concluído' : isUnmarked ? 'Treino Desmarcado' : 'Treino Pendente'}
                    </span>
                  </div>
                  {isToday && (
                    <span className="today-badge">HOJE</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumo da Semana */}
        <div className="week-summary">
          <h3>Resumo da Semana</h3>
          <div className="summary-stats">
            <div className="summary-stat">
              <span className="stat-number">
                {weekDates.filter((date, idx) => getWorkoutForDay(weekDays[idx])).length}
              </span>
              <span className="stat-label">Dias de Treino</span>
            </div>
            <div className="summary-stat">
              <span className="stat-number">
                {weekDates.filter(date => {
                  const dateKey = toLocalDateKey(date);
                  return completionStatus[dateKey];
                }).length}
              </span>
              <span className="stat-label">Treinos Concluídos</span>
            </div>
            <div className="summary-stat">
              <span className="stat-number">
                {weekDates.reduce((total, date, idx) => {
                  const workout = getWorkoutForDay(weekDays[idx]);
                  if (workout) {
                    return total + workout.exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
                  }
                  return total;
                }, 0)}
              </span>
              <span className="stat-label">Total de Séries</span>
            </div>
            <div className="summary-stat">
              <span className="stat-number">{weekProgress}%</span>
              <span className="stat-label">Progresso Semanal</span>
            </div>
          </div>
        </div>

        {/* Legenda */}
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color today"></div>
            <span>Dia Atual</span>
          </div>
          <div className="legend-item">
            <div className="legend-color completed"></div>
            <span>Treino Concluído</span>
          </div>
          <div className="legend-item">
            <div className="legend-color workout-day"></div>
            <span>Dia com Treino</span>
          </div>
          <div className="legend-item">
            <div className="legend-color rest-day"></div>
            <span>Dia de Descanso</span>
          </div>
        </div>
        {/* Modal de Não Cumprimento */}
        <NonCompletionModal
          isOpen={nonCompletionModal.isOpen}
          onClose={handleNonCompletionCancel}
          onSubmit={handleNonCompletionSubmit}
          workoutDate={nonCompletionModal.date}
        />
      </div>
    </ClientLayout>
  );
}