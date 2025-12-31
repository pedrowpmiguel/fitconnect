import React, { useState, useEffect } from 'react';
import TrainerLayout from '../components/TrainerLayout/TrainerLayout';
import './ExercisesManager.scss';

export default function ExercisesManager() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('list'); // 'list', 'create', 'edit', 'view'
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filtros e paginação
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    muscleGroups: '',
    equipment: '',
    difficulty: '',
    isActive: 'true'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalExercises: 0,
    hasNext: false,
    hasPrev: false
  });

  // Formulário de exercício
  const [exerciseForm, setExerciseForm] = useState({
    name: '',
    description: '',
    muscleGroups: [],
    equipment: [],
    difficulty: 'iniciante',
    instructions: '',
    videoUrl: '',
    imageUrl: '',
    isActive: true
  });

  // Opções para formulário - Valores correspondem aos enums do schema do backend
  const muscleGroupsOptions = [
    'peito', 'costas', 'ombros', 'bíceps', 'tríceps', 'antebraços',
    'quadríceps', 'posteriores', 'glúteos', 'panturrilhas', 'abdômen',
    'core', 'cardio', 'funcional', 'outros'
  ];

  const equipmentOptions = [
    'peso_livre', 'halteres', 'barra', 'máquina', 'cabo', 'elástico',
    'corpo_livre', 'kettlebell', 'medicine_ball', 'step', 'outros'
  ];

  const difficultyOptions = [
    { value: 'iniciante', label: 'Iniciante' },
    { value: 'intermediário', label: 'Intermediário' },
    { value: 'avançado', label: 'Avançado' }
  ];

  const token = localStorage.getItem('token');

  // Função helper para formatar labels
  const formatLabel = (value) => {
    return value
      .charAt(0).toUpperCase() + value.slice(1)
      .replace(/_/g, ' ')
      .replace(/í/g, 'í')
      .replace(/ú/g, 'ú')
      .replace(/ó/g, 'ó')
      .replace(/é/g, 'é')
      .replace(/á/g, 'á');
  };

  // Carregar exercícios
  useEffect(() => {
    if (view === 'list') {
      loadExercises();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filters.page, filters.search, filters.muscleGroups, filters.equipment, filters.difficulty, filters.isActive]);

  const loadExercises = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      queryParams.append('page', filters.page);
      queryParams.append('limit', filters.limit);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.muscleGroups) queryParams.append('muscleGroups', filters.muscleGroups);
      if (filters.equipment) queryParams.append('equipment', filters.equipment);
      if (filters.difficulty) queryParams.append('difficulty', filters.difficulty);
      if (filters.isActive !== '') queryParams.append('isActive', filters.isActive);

      const res = await fetch(`/api/workouts/exercises?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao carregar exercícios');
      }

      if (data.success) {
        const loadedExercises = data.data.exercises || [];
        setExercises(loadedExercises);
        setPagination(data.data.pagination || {});
        
        // Log para debug - verificar valores usados nos exercícios existentes
        if (loadedExercises.length > 0) {
          console.log('Exemplo de exercício carregado:', {
            difficulty: loadedExercises[0].difficulty,
            muscleGroups: loadedExercises[0].muscleGroups,
            equipment: loadedExercises[0].equipment
          });
        }
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar exercícios');
      console.error('Erro ao carregar exercícios:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar meus exercícios
  const loadMyExercises = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      queryParams.append('page', filters.page);
      queryParams.append('limit', filters.limit);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.muscleGroups) queryParams.append('muscleGroups', filters.muscleGroups);
      if (filters.equipment) queryParams.append('equipment', filters.equipment);
      if (filters.difficulty) queryParams.append('difficulty', filters.difficulty);
      if (filters.isActive !== '') queryParams.append('isActive', filters.isActive);

      const res = await fetch(`/api/workouts/exercises/my-exercises?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao carregar exercícios');
      }

      if (data.success) {
        setExercises(data.data.exercises || []);
        setPagination(data.data.pagination || {});
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar exercícios');
      console.error('Erro ao carregar exercícios:', err);
    } finally {
      setLoading(false);
    }
  };

  // Resetar formulário
  const resetForm = () => {
    setExerciseForm({
      name: '',
      description: '',
      muscleGroups: [],
      equipment: [],
      difficulty: 'iniciante',
      instructions: '',
      videoUrl: '',
      imageUrl: '',
      isActive: true
    });
    setSelectedExercise(null);
  };

  // Abrir formulário de criação
  const handleCreate = () => {
    resetForm();
    setView('create');
  };

  // Abrir formulário de edição
  const handleEdit = (exercise) => {
    setSelectedExercise(exercise);
    setExerciseForm({
      name: exercise.name || '',
      description: exercise.description || '',
      muscleGroups: Array.isArray(exercise.muscleGroups) ? exercise.muscleGroups : [],
      equipment: Array.isArray(exercise.equipment) ? exercise.equipment : [],
      difficulty: exercise.difficulty || 'iniciante',
      instructions: exercise.instructions || '',
      videoUrl: exercise.videoUrl || '',
      imageUrl: exercise.imageUrl || '',
      isActive: exercise.isActive !== undefined ? exercise.isActive : true
    });
    setView('edit');
  };

  // Visualizar exercício
  const handleView = async (exerciseId) => {
    try {
      const res = await fetch(`/api/workouts/exercises/${exerciseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.success) {
        setSelectedExercise(data.data.exercise);
        setView('view');
      } else {
        alert(data.message || 'Erro ao carregar exercício');
      }
    } catch (err) {
      alert('Erro ao carregar exercício');
      console.error(err);
    }
  };

  // Salvar exercício (criar ou atualizar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = view === 'create' 
        ? '/api/workouts/exercises'
        : `/api/workouts/exercises/${selectedExercise._id}`;
      
      const method = view === 'create' ? 'POST' : 'PUT';

      // Preparar dados para envio - remover imageUrl se for base64
      const formData = { ...exerciseForm };
      
      // Se imageUrl for base64 (começa com data:), não enviar ou remover
      if (formData.imageUrl && formData.imageUrl.startsWith('data:')) {
        // Não enviar imageUrl se for base64 - o backend espera URL válida
        delete formData.imageUrl;
      }
      
      // Validar que pelo menos um grupo muscular foi selecionado
      if (!formData.muscleGroups || formData.muscleGroups.length === 0) {
        setError('Selecione pelo menos um grupo muscular');
        setSubmitting(false);
        return;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        // Se houver erros de validação detalhados, mostrá-los
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map(err => {
            if (typeof err === 'string') return err;
            return err.message || `${err.field}: ${err.message || 'valor inválido'}`;
          }).join('\n');
          throw new Error(errorMessages || data.message || `Erro ao ${view === 'create' ? 'criar' : 'atualizar'} exercício`);
        }
        throw new Error(data.message || `Erro ao ${view === 'create' ? 'criar' : 'atualizar'} exercício`);
      }

      if (data.success) {
        alert(`Exercício ${view === 'create' ? 'criado' : 'atualizado'} com sucesso!`);
        setView('list');
        resetForm();
        loadExercises();
      }
    } catch (err) {
      const errorMessage = err.message || `Erro ao ${view === 'create' ? 'criar' : 'atualizar'} exercício`;
      setError(errorMessage);
      console.error('Erro ao salvar exercício:', err);
      
      // Mostrar alerta também para garantir que o usuário veja o erro
      alert(`Erro: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Atualizar filtros
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Resetar para primeira página ao filtrar
    }));
  };

  // Toggle de grupos musculares
  const toggleMuscleGroup = (group) => {
    setExerciseForm(prev => ({
      ...prev,
      muscleGroups: prev.muscleGroups.includes(group)
        ? prev.muscleGroups.filter(g => g !== group)
        : [...prev.muscleGroups, group]
    }));
  };

  // Toggle de equipamentos
  const toggleEquipment = (equip) => {
    setExerciseForm(prev => ({
      ...prev,
      equipment: prev.equipment.includes(equip)
        ? prev.equipment.filter(e => e !== equip)
        : [...prev.equipment, equip]
    }));
  };

  // Mudar página
  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  return (
    <TrainerLayout>
      <div className="exercises-manager">
        <div className="exercises-header">
          <h1>Gerenciar Exercícios</h1>
          <div className="header-actions">
            <button 
              className="btn btn-primary"
              onClick={() => setView('list')}
              style={{ display: view === 'list' ? 'none' : 'inline-block' }}
            >
              ← Voltar
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleCreate}
              style={{ display: view === 'list' ? 'inline-block' : 'none' }}
            >
              + Novo Exercício
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Lista de Exercícios */}
        {view === 'list' && (
          <div className="exercises-list-view">
            {/* Filtros */}
            <div className="filters-section">
              <div className="filter-group">
                <label>Pesquisar</label>
                <input
                  type="text"
                  placeholder="Nome ou descrição..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label>Grupos Musculares</label>
                <select
                  value={filters.muscleGroups}
                  onChange={(e) => handleFilterChange('muscleGroups', e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos</option>
                  {muscleGroupsOptions.map(group => (
                    <option key={group} value={group}>
                      {formatLabel(group)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Equipamento</label>
                <select
                  value={filters.equipment}
                  onChange={(e) => handleFilterChange('equipment', e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos</option>
                  {equipmentOptions.map(equip => (
                    <option key={equip} value={equip}>
                      {formatLabel(equip)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Dificuldade</label>
                <select
                  value={filters.difficulty}
                  onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todas</option>
                  {difficultyOptions.map(diff => (
                    <option key={diff.value} value={diff.value}>
                      {diff.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filters.isActive}
                  onChange={(e) => handleFilterChange('isActive', e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos</option>
                  <option value="true">Ativos</option>
                  <option value="false">Inativos</option>
                </select>
              </div>
            </div>

            {/* Lista */}
            {loading ? (
              <div className="loading">Carregando exercícios...</div>
            ) : exercises.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum exercício encontrado.</p>
                <button className="btn btn-primary" onClick={handleCreate}>
                  Criar Primeiro Exercício
                </button>
              </div>
            ) : (
              <>
                <div className="exercises-grid">
                  {exercises.map(exercise => (
                    <div key={exercise._id} className="exercise-card">
                      <div className="exercise-card-header">
                        <h3>{exercise.name}</h3>
                        <span className={`status-badge ${exercise.isActive ? 'active' : 'inactive'}`}>
                          {exercise.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      
                      {exercise.description && (
                        <p className="exercise-description">
                          {exercise.description.length > 100 
                            ? `${exercise.description.substring(0, 100)}...` 
                            : exercise.description}
                        </p>
                      )}

                      <div className="exercise-tags">
                        {exercise.muscleGroups && exercise.muscleGroups.slice(0, 3).map(group => (
                          <span key={group} className="tag">{formatLabel(group)}</span>
                        ))}
                        {exercise.difficulty && (
                          <span className="tag difficulty">{formatLabel(exercise.difficulty)}</span>
                        )}
                      </div>

                      <div className="exercise-actions">
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleView(exercise._id)}
                        >
                          Ver
                        </button>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => handleEdit(exercise)}
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginação */}
                {pagination.totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="btn btn-sm"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrev}
                    >
                      Anterior
                    </button>
                    <span>
                      Página {pagination.currentPage} de {pagination.totalPages}
                    </span>
                    <button
                      className="btn btn-sm"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNext}
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Formulário de Criação/Edição */}
        {(view === 'create' || view === 'edit') && (
          <div className="exercise-form-view">
            <h2>{view === 'create' ? 'Criar Novo Exercício' : 'Editar Exercício'}</h2>

            <form onSubmit={handleSubmit} className="exercise-form">
              <div className="form-group">
                <label>Nome do Exercício *</label>
                <input
                  type="text"
                  value={exerciseForm.name}
                  onChange={(e) => setExerciseForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={exerciseForm.description}
                  onChange={(e) => setExerciseForm(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label>Grupos Musculares *</label>
                <div className="checkbox-group">
                  {muscleGroupsOptions.map(group => (
                    <label key={group} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={exerciseForm.muscleGroups.includes(group)}
                        onChange={() => toggleMuscleGroup(group)}
                      />
                      <span>{formatLabel(group)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Equipamento</label>
                <div className="checkbox-group">
                  {equipmentOptions.map(equip => (
                    <label key={equip} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={exerciseForm.equipment.includes(equip)}
                        onChange={() => toggleEquipment(equip)}
                      />
                      <span>{formatLabel(equip)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Dificuldade *</label>
                <select
                  value={exerciseForm.difficulty}
                  onChange={(e) => setExerciseForm(prev => ({ ...prev, difficulty: e.target.value }))}
                  required
                  className="form-select"
                >
                  {difficultyOptions.map(diff => (
                    <option key={diff.value} value={diff.value}>
                      {diff.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Instruções</label>
                <textarea
                  value={exerciseForm.instructions}
                  onChange={(e) => setExerciseForm(prev => ({ ...prev, instructions: e.target.value }))}
                  rows="5"
                  placeholder="Instruções detalhadas de como realizar o exercício..."
                  className="form-textarea"
                  maxLength={1000}
                />
                <small>{exerciseForm.instructions.length}/1000 caracteres</small>
              </div>

              <div className="form-group">
                <label>URL do Vídeo</label>
                <input
                  type="url"
                  value={exerciseForm.videoUrl}
                  onChange={(e) => setExerciseForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="form-input"
                />
                <small>Link para vídeo de demonstração (YouTube, Vimeo, etc.)</small>
              </div>

              <div className="form-group">
                <label>URL da Imagem</label>
                <input
                  type="url"
                  value={exerciseForm.imageUrl}
                  onChange={(e) => setExerciseForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                  className="form-input"
                />
                <small>Link para imagem do exercício (deve começar com http:// ou https://). Imagens base64 não são suportadas.</small>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exerciseForm.isActive}
                    onChange={(e) => setExerciseForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  <span>Exercício ativo</span>
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setView('list');
                    resetForm();
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Salvando...' : (view === 'create' ? 'Criar' : 'Atualizar')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Visualização de Exercício */}
        {view === 'view' && selectedExercise && (
          <div className="exercise-view">
            <div className="exercise-view-header">
              <h2>{selectedExercise.name}</h2>
              <div className="view-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => handleEdit(selectedExercise)}
                >
                  Editar
                </button>
              </div>
            </div>

            <div className="exercise-view-content">
              {selectedExercise.imageUrl && (
                <div className="exercise-image">
                  <img src={selectedExercise.imageUrl} alt={selectedExercise.name} />
                </div>
              )}

              {selectedExercise.description && (
                <div className="exercise-section">
                  <h3>Descrição</h3>
                  <p>{selectedExercise.description}</p>
                </div>
              )}

              <div className="exercise-section">
                <h3>Informações</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Grupos Musculares:</strong>
                    <div className="tags">
                      {selectedExercise.muscleGroups && selectedExercise.muscleGroups.map(group => (
                        <span key={group} className="tag">{formatLabel(group)}</span>
                      ))}
                    </div>
                  </div>
                  <div className="info-item">
                    <strong>Equipamento:</strong>
                    <div className="tags">
                      {selectedExercise.equipment && selectedExercise.equipment.length > 0 ? (
                        selectedExercise.equipment.map(equip => (
                          <span key={equip} className="tag">{formatLabel(equip)}</span>
                        ))
                      ) : (
                        <span className="tag">Nenhum</span>
                      )}
                    </div>
                  </div>
                  <div className="info-item">
                    <strong>Dificuldade:</strong>
                    <span className="tag difficulty">{formatLabel(selectedExercise.difficulty)}</span>
                  </div>
                  <div className="info-item">
                    <strong>Status:</strong>
                    <span className={`status-badge ${selectedExercise.isActive ? 'active' : 'inactive'}`}>
                      {selectedExercise.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedExercise.instructions && (
                <div className="exercise-section">
                  <h3>Instruções</h3>
                  <div className="instructions-content">
                    {selectedExercise.instructions.split('\n').map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                </div>
              )}

              {selectedExercise.videoUrl && (
                <div className="exercise-section">
                  <h3>Vídeo de Demonstração</h3>
                  <div className="video-container">
                    <a 
                      href={selectedExercise.videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="video-link"
                    >
                      {selectedExercise.videoUrl}
                    </a>
                  </div>
                </div>
              )}

              {selectedExercise.createdBy && (
                <div className="exercise-section">
                  <h3>Criado por</h3>
                  <p>
                    {selectedExercise.createdBy.firstName} {selectedExercise.createdBy.lastName}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </TrainerLayout>
  );
}

