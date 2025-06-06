import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Upload() {
  const [file, setFile] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [unitName, setUnitName] = useState('');
  const [unitDescription, setUnitDescription] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please select a PDF or Word document');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const processFile = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setProcessing(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setObjectives(response.data.objectives);
      setProcessed(true);
      setUnitName(`${file.name.split('.')[0]} Unit`);
    } catch (error) {
      setError(error.response?.data?.error || 'Error processing file');
      console.error('Error processing file:', error);
    } finally {
      setProcessing(false);
    }
  };

  const updateObjective = (index, newText) => {
    const updated = [...objectives];
    updated[index] = newText;
    setObjectives(updated);
  };

  const addObjective = () => {
    setObjectives([...objectives, '']);
  };

  const removeObjective = (index) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const saveUnit = async () => {
    if (!unitName.trim()) {
      setError('Please enter a unit name');
      return;
    }

    if (objectives.filter(obj => obj.trim()).length === 0) {
      setError('Please add at least one learning objective');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await axios.post('/api/units', {
        name: unitName.trim(),
        description: unitDescription.trim(),
        objectives: objectives.filter(obj => obj.trim())
      });

      navigate(`/units/${response.data.id}`);
    } catch (error) {
      setError(error.response?.data?.error || 'Error saving unit');
      console.error('Error saving unit:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Upload Curriculum</h1>

      {error && <div className="error">{error}</div>}

      {!processed ? (
        <div className="card">
          <h3>Step 1: Upload Document</h3>
          <p>Upload a PDF or Word document containing your curriculum content.</p>
          
          <div className="form-group">
            <label htmlFor="file">Select File</label>
            <input
              type="file"
              id="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
            />
            {file && (
              <p style={{ marginTop: '0.5rem', color: '#666' }}>
                Selected: {file.name}
              </p>
            )}
          </div>

          <button 
            onClick={processFile}
            className="btn btn-primary"
            disabled={!file || processing}
          >
            {processing ? 'Processing...' : 'Process Document'}
          </button>

          {processing && (
            <div style={{ marginTop: '1rem', color: '#666' }}>
              <p>Processing your document with AI...</p>
              <p>This may take a few moments.</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="card">
            <h3>Step 2: Review & Edit Learning Objectives</h3>
            <p>AI has generated learning objectives from your curriculum. Review and edit them as needed.</p>
            
            <div className="form-group">
              <label htmlFor="unitName">Unit Name</label>
              <input
                type="text"
                id="unitName"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="Enter unit name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="unitDescription">Unit Description (Optional)</label>
              <textarea
                id="unitDescription"
                value={unitDescription}
                onChange={(e) => setUnitDescription(e.target.value)}
                placeholder="Enter unit description"
              />
            </div>

            <h4>Learning Objectives:</h4>
            {objectives.map((objective, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                marginBottom: '0.5rem',
                alignItems: 'flex-start'
              }}>
                <span style={{ 
                  minWidth: '2rem', 
                  padding: '0.5rem', 
                  background: '#f0f0f0',
                  textAlign: 'center',
                  borderRadius: '4px'
                }}>
                  {index + 1}
                </span>
                <textarea
                  value={objective}
                  onChange={(e) => updateObjective(index, e.target.value)}
                  style={{ flex: 1, minHeight: '60px' }}
                  placeholder="Enter learning objective"
                />
                <button
                  onClick={() => removeObjective(index)}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem' }}
                >
                  ×
                </button>
              </div>
            ))}

            <div style={{ margin: '1rem 0' }}>
              <button onClick={addObjective} className="btn btn-secondary">
                Add Objective
              </button>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginTop: '2rem' 
            }}>
              <button
                onClick={saveUnit}
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Unit'}
              </button>
              <button
                onClick={() => {
                  setProcessed(false);
                  setObjectives([]);
                  setFile(null);
                }}
                className="btn btn-secondary"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Upload;