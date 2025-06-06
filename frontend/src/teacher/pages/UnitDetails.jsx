import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function UnitDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editingObjective, setEditingObjective] = useState(null);

  useEffect(() => {
    fetchUnit();
  }, [id]);

  const fetchUnit = async () => {
    try {
      const response = await axios.get(`/api/units/${id}`);
      setUnit(response.data);
    } catch (error) {
      setError('Failed to fetch unit details');
      console.error('Error fetching unit:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUnit = async (updatedData) => {
    try {
      const response = await axios.put(`/api/units/${id}`, updatedData);
      setUnit({ ...unit, ...response.data });
      setEditing(false);
    } catch (error) {
      setError('Failed to update unit');
      console.error('Error updating unit:', error);
    }
  };

  const updateObjective = async (objectiveId, objectiveText) => {
    try {
      const response = await axios.put(`/api/objectives/${objectiveId}`, {
        objective_text: objectiveText,
        order_index: unit.objectives.find(obj => obj.id === objectiveId)?.order_index || 0
      });
      
      setUnit({
        ...unit,
        objectives: unit.objectives.map(obj => 
          obj.id === objectiveId ? response.data : obj
        )
      });
      setEditingObjective(null);
    } catch (error) {
      setError('Failed to update objective');
      console.error('Error updating objective:', error);
    }
  };

  const addObjective = async () => {
    const newObjectiveText = prompt('Enter new learning objective:');
    if (!newObjectiveText) return;

    try {
      const response = await axios.post('/api/objectives', {
        unit_id: id,
        objective_text: newObjectiveText,
        order_index: unit.objectives.length
      });

      setUnit({
        ...unit,
        objectives: [...unit.objectives, response.data]
      });
    } catch (error) {
      setError('Failed to add objective');
      console.error('Error adding objective:', error);
    }
  };

  const deleteObjective = async (objectiveId) => {
    if (!window.confirm('Are you sure you want to delete this objective?')) {
      return;
    }

    try {
      await axios.delete(`/api/objectives/${objectiveId}`);
      setUnit({
        ...unit,
        objectives: unit.objectives.filter(obj => obj.id !== objectiveId)
      });
    } catch (error) {
      setError('Failed to delete objective');
      console.error('Error deleting objective:', error);
    }
  };

  const deleteUnit = async () => {
    if (!window.confirm('Are you sure you want to delete this entire unit? This cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/units/${id}`);
      navigate('/dashboard');
    } catch (error) {
      setError('Failed to delete unit');
      console.error('Error deleting unit:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading unit details...</div>;
  }

  if (!unit) {
    return (
      <div className="card">
        <h2>Unit not found</h2>
        <Link to="/dashboard" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <Link to="/dashboard" style={{ color: '#666', textDecoration: 'none' }}>
            ← Back to Dashboard
          </Link>
        </div>
        <div>
          <button 
            onClick={() => setEditing(!editing)}
            className="btn btn-secondary"
            style={{ marginRight: '0.5rem' }}
          >
            {editing ? 'Cancel Edit' : 'Edit Unit'}
          </button>
          <button 
            onClick={deleteUnit}
            className="btn btn-secondary"
          >
            Delete Unit
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card">
        {editing ? (
          <UnitEditForm 
            unit={unit} 
            onSave={updateUnit}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <h1>{unit.name}</h1>
            {unit.description && (
              <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '1rem' }}>
                {unit.description}
              </p>
            )}
            <p style={{ color: '#888', fontSize: '0.9rem' }}>
              Created: {new Date(unit.created_at).toLocaleDateString()}
            </p>
          </>
        )}
      </div>

      <div className="card">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h2>Learning Objectives ({unit.objectives.length})</h2>
          <button onClick={addObjective} className="btn btn-primary">
            Add Objective
          </button>
        </div>

        {unit.objectives.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
            No learning objectives yet. Click "Add Objective" to get started.
          </p>
        ) : (
          <div>
            {unit.objectives.map((objective, index) => (
              <ObjectiveItem
                key={objective.id}
                objective={objective}
                index={index}
                isEditing={editingObjective === objective.id}
                onEdit={() => setEditingObjective(objective.id)}
                onSave={(text) => updateObjective(objective.id, text)}
                onCancel={() => setEditingObjective(null)}
                onDelete={() => deleteObjective(objective.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UnitEditForm({ unit, onSave, onCancel }) {
  const [name, setName] = useState(unit.name);
  const [description, setDescription] = useState(unit.description || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, description });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Unit Name</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      
      <div>
        <button type="submit" className="btn btn-primary" style={{ marginRight: '0.5rem' }}>
          Save Changes
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

function ObjectiveItem({ objective, index, isEditing, onEdit, onSave, onCancel, onDelete }) {
  const [text, setText] = useState(objective.objective_text);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim());
    }
  };

  return (
    <div style={{ 
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '1rem',
      marginBottom: '0.5rem',
      backgroundColor: isEditing ? '#f9f9f9' : 'white'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <span style={{ 
          minWidth: '2rem', 
          padding: '0.25rem 0.5rem', 
          background: '#007bff',
          color: 'white',
          borderRadius: '4px',
          fontSize: '0.9rem'
        }}>
          {index + 1}
        </span>
        
        <div style={{ flex: 1 }}>
          {isEditing ? (
            <div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ width: '100%', minHeight: '80px', marginBottom: '0.5rem' }}
              />
              <div>
                <button onClick={handleSave} className="btn btn-primary" style={{ marginRight: '0.5rem' }}>
                  Save
                </button>
                <button onClick={onCancel} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, lineHeight: '1.5' }}>
              {objective.objective_text}
            </p>
          )}
        </div>
        
        {!isEditing && (
          <div>
            <button 
              onClick={onEdit}
              className="btn btn-secondary"
              style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            >
              Edit
            </button>
            <button 
              onClick={onDelete}
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UnitDetails;