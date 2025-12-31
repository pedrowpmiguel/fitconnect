import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import socketService from '../services/socket';
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer
} from "recharts";
import ClientLayout from "../components/ClientLayout/ClientLayout";
import "./Dashboard.scss";

export default function ClientDashboard() {



  // Configurar listeners de Socket.IO
  useEffect(() => {
    // Listener para alertas do trainer
    const handleTrainerAlert = (data) => {
      console.log('⚠️ Alerta do trainer:', data);

      toast.warning(
        <div>
          <strong>Alerta do seu Personal Trainer</strong>
          <p>{data.message}</p>
        </div>,
        {
          autoClose: 10000,
          onClick: () => {
            navigate('/chat');
          }
        }
      );
    };

    // Listener para novas mensagens
    const handleNewMessage = (data) => {
      console.log('📨 Nova mensagem:', data);

      toast.info(
        <div>
          <strong>Nova mensagem</strong>
          <p>{data.sender.name}</p>
          <small>{data.message.substring(0, 50)}...</small>
        </div>,
        {
          autoClose: 6000
        }
      );
    };

    // Registrar listeners
    socketService.on('trainer_alert', handleTrainerAlert);
    socketService.on('new_message', handleNewMessage);

    // Cleanup
    return () => {
      socketService.off('trainer_alert');
      socketService.off('new_message');
    };
  }, []);

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [backendStats, setBackendStats] = useState(null); // resposta do /api/client/workouts/stats
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [error, setError] = useState(null);

  // --- ESTADOS PARA A TROCA DE TREINADOR ---
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [availableTrainers, setAvailableTrainers] = useState([]); // Sempre inicia como array []
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);


  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchData();
    loadTrainers();

  }, []);

  const fetchData = async () => {
    try {
      if (!token) {
        navigate("/login");
        return;
      }

      // Pedimos os endpoints necessários em paralelo
      const [dashRes, statsRes, workoutsRes] = await Promise.all([
        axios.get("/api/client/workouts/dashboard", { headers: { Authorization: `Bearer ${token}` } })
          .catch(() => ({ data: { data: null } })),
        axios.get("/api/client/workouts/stats", { headers: { Authorization: `Bearer ${token}` } })
          .catch(() => ({ data: { data: null } })),
        axios.get("/api/client/workouts/logs?limit=5", { headers: { Authorization: `Bearer ${token}` } })
          .catch(() => ({ data: { data: { logs: [] } } }))
      ]);

      setDashboard(dashRes.data?.data || null);
      setBackendStats(statsRes.data?.data || null);
      setRecentWorkouts(workoutsRes.data?.data?.logs || []);
    } catch (err) {
      console.error("Erro ao carregar dashboard", err);
      setError("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  // --- CORREÇÃO PARA O ERRO .MAP() ---
  const loadTrainers = async () => {
    try {
      const res = await axios.get("/api/users/trainers", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data && res.data.success) {
        const trainersData = res.data.data?.trainers || res.data.data || [];
        setAvailableTrainers(Array.isArray(trainersData) ? trainersData : []);
      } else {
        setAvailableTrainers([]);
      }
    } catch (err) {
      console.error("Erro ao carregar lista de PTs", err);
      setAvailableTrainers([]); // Mantém como array para não quebrar o layout
    }
  };

  const handleTrainerChangeRequest = async (e) => {
    e.preventDefault();
    if (!selectedTrainerId) return alert("Selecione um treinador.");

    setSubmittingRequest(true);
    try {
      const payload = {
        requestedTrainerId: selectedTrainerId,
        reason: requestReason
      };
      await axios.post("/api/users/client/request-trainer-change", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Pedido enviado com sucesso!");
      setShowChangeRequest(false);
      setSelectedTrainerId("");
      setRequestReason("");
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao solicitar troca.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("pt-PT") : "-");


  // Renderiza o resumo vindo do backend (/stats)
  const renderStatsSummary = () => {
    if (!backendStats) return <span style={{ color: "#6b7280" }}>—</span>;

    const {
      totalPlans,
      activePlans,
      totalWorkouts,
      completedWorkouts,
      completionRate,
      avgDuration,
      lastWorkout
    } = backendStats;

    return (
      <div style={{ fontSize: "0.9rem", lineHeight: 1.4 }}>
        <div><strong>Planos:</strong> {activePlans ?? "—"} / {totalPlans ?? "—"}</div>
        <div><strong>Treinos:</strong> {completedWorkouts ?? "—"} / {totalWorkouts ?? "—"}</div>
        <div><strong>Sucesso:</strong> {completionRate != null ? `${completionRate}%` : "—"}</div>
        <div><strong>Duração média:</strong> {avgDuration != null ? `${avgDuration} min` : "—"}</div>
        <div><strong>Último treino:</strong> {lastWorkout ? formatDate(lastWorkout) : "—"}</div>
      </div>
    );
  };

  if (loading) return <ClientLayout><div className="loader">A carregar...</div></ClientLayout>;
  if (error) return <ClientLayout><div className="error">{error}</div></ClientLayout>;

  // Mantemos compatibilidade com o antigo dashboard (se existir)
  const { plan, statistics, charts } = dashboard || {};
  const { totalCompleted = 0, completionRate = 0 } = statistics || {};
  const { weekly = [], monthly = [] } = charts || [];

  return (
    <ClientLayout>
      <div className="client-dashboard-container">

        <div
          className="dashboard-header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <h1 className="dashboard-title">Dashboard do Cliente</h1>
          <button
            className="btn-toggle-request"
            onClick={() => setShowChangeRequest(!showChangeRequest)}
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              backgroundColor: "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: "4px"
            }}
          >
            {showChangeRequest ? "Fechar" : "Escolher Treinador"}
          </button>
        </div>

        {showChangeRequest && (
          <div
            className="request-card"
            style={{
              padding: "20px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              marginBottom: "20px",
              backgroundColor: "#f9f9f9"
            }}
          >
            <h3>Solicitar Novo Treinador</h3>
            <form onSubmit={handleTrainerChangeRequest}>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", fontWeight: "bold" }}>Selecione o Treinador:</label>
                <select
                  style={{ width: "100%", padding: "10px", marginTop: "5px" }}
                  value={selectedTrainerId}
                  onChange={(e) => setSelectedTrainerId(e.target.value)}
                  required
                >
                  <option value="">-- Escolha um PT da lista --</option>
                  {Array.isArray(availableTrainers) && availableTrainers.length > 0 ? (
                    availableTrainers.map((pt) => (
                      <option key={pt._id || pt.id} value={pt._id || pt.id}>
                        {pt.firstName || pt.name} {pt.lastName || ""}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      Nenhum treinador disponível
                    </option>
                  )}
                </select>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", fontWeight: "bold" }}>Motivo da Escolha:</label>
                <textarea
                  style={{ width: "100%", padding: "10px", marginTop: "5px", minHeight: "80px" }}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Explique o motivo (ex: horários, especialização...)"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submittingRequest}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                {submittingRequest ? "A enviar..." : "Confirmar Pedido"}
              </button>
            </form>
          </div>
        )}

        {/* --- RESTO DA DASHBOARD --- */}
        <div
          className="plan-card"
          style={{
            padding: "20px",
            background: " var(--bg-card)",
            borderRadius: "10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            marginBottom: "20px"
          }}
        >
          {plan ? (
            <>
              <h2>{plan.name}</h2>
              <p>
                Semana{" "}
                {plan.currentWeek ?? "—"} de {plan.totalWeeks ?? "—"}
              </p>
            </>
          ) : (
            <p>Nenhum plano ativo.</p>
          )}
        </div>

        <div className="charts-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div className="chart-card" style={{ background: " var(--bg-card)", padding: "15px", borderRadius: "10px" }}>
            <h3>Semanal</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card" style={{ background: " var(--bg-card)", padding: "15px", borderRadius: "10px" }}>
            <h3>Estatísticas Totais</h3>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", paddingTop: "20px", flexWrap: "wrap" }}>
              <div style={{ textAlign: "center", minWidth: "120px" }}>
                <span style={{ fontSize: "2rem", display: "block", color: "#6366f1" }}>{totalCompleted}</span>
                <small>Completos</small>
              </div>
              <div style={{ textAlign: "center", minWidth: "120px" }}>
                <span style={{ fontSize: "2rem", display: "block", color: "#10b981" }}>{completionRate}%</span>
                <small>Sucesso</small>
              </div>

              {/* Card de resumo do backend (colocado dentro do mesmo cartão de estatísticas) */}
              <div style={{ flex: 1, minWidth: "220px", borderLeft: "1px solid #eee", paddingLeft: "16px" }}>
                <h4 style={{ margin: "0 0 8px 0" }}>Resumo</h4>
                {renderStatsSummary()}
              </div>
            </div>
          </div>
        </div>

        <div className="recent-workouts-section" style={{ marginTop: "30px" }}>
          <h3>Treinos Recentes</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
                <th style={{ padding: "10px" }}>Data</th>
                <th>Plano</th>
                <th>Duração</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentWorkouts.length === 0 ? (
                <tr>
                  <td style={{ padding: "10px" }} colSpan={4}>
                    Sem treinos recentes
                  </td>
                </tr>
              ) : (
                recentWorkouts.map((workout) => {
                  const isCompleted = workout.isCompleted !== false;
                  const workoutDate = workout.completedAt || workout.date || workout.createdAt;

                  return (
                    <tr key={workout._id || workout.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "10px" }}>{formatDate(workoutDate)}</td>
                      <td>{workout.workoutPlan?.name || "Treino"}</td>
                      <td>{workout.actualDuration ?? workout.duration ?? "-"} min</td>
                      <td>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "0.8rem",
                            background: isCompleted ? "#dcfce7" : "#fee2e2",
                            color: isCompleted ? "#166534" : "#991b1b"
                          }}
                        >
                          {isCompleted ? "Concluído" : "Não Concluído"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </ClientLayout>
  );
}