import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import axios from 'axios';

function StudyMode() {
  const { enrollmentId, objectiveId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    duration: 0,
    xpEarned: 0,
    shouldSuggestQuiz: false
  });
  const [objectives, setObjectives] = useState([]);
  const [currentObjective, setCurrentObjective] = useState(null);
  
  const messagesEndRef = useRef(null);
  const sessionStartTime = useRef(Date.now());

  useEffect(() => {
    initializeStudySession();
  }, [enrollmentId, objectiveId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Update session duration every minute
    const interval = setInterval(() => {
      const duration = Math.floor((Date.now() - sessionStartTime.current) / (1000 * 60));
      setSessionStats(prev => ({ ...prev, duration }));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeStudySession = async () => {
    try {
      console.log('Initializing study session for enrollment:', enrollmentId, 'objective:', objectiveId);
      
      // Get enrollment progress to see available objectives
      const progressRes = await axios.get(`/api/enrollments/${enrollmentId}/progress`);
      console.log('Progress data:', progressRes.data);
      setObjectives(progressRes.data);
      
      // Find current objective or use first one
      const targetObjective = progressRes.data.find(obj => obj.objective_id == objectiveId) || progressRes.data[0];
      console.log('Target objective:', targetObjective);
      setCurrentObjective(targetObjective);

      // Check for active session
      const activeSessionRes = await axios.get(`/api/teaching/active-session/${enrollmentId}`);
      
      if (activeSessionRes.data.activeSession) {
        // Resume existing session
        setSessionData(activeSessionRes.data.activeSession);
        setMessages(activeSessionRes.data.recentMessages);
        sessionStartTime.current = new Date(activeSessionRes.data.activeSession.started_at).getTime();
      } else {
        // Start new session
        const sessionRes = await axios.post('/api/teaching/start-session', {
          enrollmentId: parseInt(enrollmentId),
          objectiveId: targetObjective.objective_id
        });
        
        setSessionData(sessionRes.data);
        
        // Add welcome message
        const welcomeMessage = {
          speaker: 'agent',
          message_content: `Hello ${user.name}! 👋 Let's work on: "${targetObjective.objective_text}". What would you like to learn about this topic?`,
          teaching_technique: 'welcome',
          timestamp: new Date().toISOString()
        };
        
        setMessages([welcomeMessage]);
        
        // Log the welcome message
        await axios.post('/api/teaching/add-message', {
          sessionId: sessionRes.data.sessionId,
          speaker: 'agent',
          message: welcomeMessage.message_content,
          teachingTechnique: 'welcome'
        });
      }
    } catch (error) {
      console.error('Failed to initialize study session:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert('Failed to start study session: ' + (error.response?.data?.error || error.message));
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isTyping) return;

    const userMessage = {
      speaker: 'student',
      message_content: newMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    try {
      // Log user message
      await axios.post('/api/teaching/add-message', {
        sessionId: sessionData.sessionId,
        speaker: 'student',
        message: newMessage,
        teachingTechnique: null
      });

      // Get AI response
      const aiResponse = await axios.post('/api/teaching/get-ai-response', {
        sessionId: sessionData.sessionId,
        studentMessage: newMessage,
        objectiveText: currentObjective.objective_text,
        conversationHistory: messages
      });

      const agentMessage = {
        speaker: 'agent',
        message_content: aiResponse.data.aiResponse,
        teaching_technique: aiResponse.data.teachingTechnique,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, agentMessage]);

      // Log agent message
      await axios.post('/api/teaching/add-message', {
        sessionId: sessionData.sessionId,
        speaker: 'agent',
        message: aiResponse.data.aiResponse,
        teachingTechnique: aiResponse.data.teachingTechnique
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        speaker: 'agent',
        message_content: 'Sorry, I encountered an error. Please try again.',
        teaching_technique: 'error',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const endSession = async () => {
    try {
      const duration = Math.floor((Date.now() - sessionStartTime.current) / (1000 * 60));
      const sessionQuality = messages.length > 6 ? 0.8 : 0.6; // Simple quality metric
      
      const endResult = await axios.post('/api/teaching/end-session', {
        sessionId: sessionData.sessionId,
        sessionQuality,
        topicsCovered: [currentObjective.objective_text],
        comprehensionIndicators: { messageCount: messages.length }
      });

      setSessionStats({
        duration,
        xpEarned: endResult.data.xpEarned,
        shouldSuggestQuiz: endResult.data.shouldSuggestQuiz,
        levelUp: endResult.data.levelUp,
        newLevel: endResult.data.newLevel
      });

      // Show completion modal or redirect
      if (endResult.data.shouldSuggestQuiz) {
        const takeQuiz = window.confirm(
          `Great study session! You earned ${endResult.data.xpEarned} XP${endResult.data.levelUp ? ` and reached Level ${endResult.data.newLevel}!` : ''}. Would you like to test your knowledge with a quiz?`
        );
        
        if (takeQuiz) {
          navigate(`/course/${enrollmentId}/quiz/${currentObjective.objective_id}`);
        } else {
          navigate('/dashboard');
        }
      } else {
        alert(`Session completed! You earned ${endResult.data.xpEarned} XP.`);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Failed to end session:', error);
      navigate('/dashboard');
    }
  };

  const switchObjective = async (objectiveId) => {
    if (sessionData) {
      await endSession();
    }
    navigate(`/course/${enrollmentId}/study/${objectiveId}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
        <div>Starting your study session...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>📚 Study Mode</h2>
              <p style={{ margin: 0, color: '#666' }}>
                Learning: {currentObjective?.objective_text}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.2rem', color: '#007bff' }}>
                ⏱️ {sessionStats.duration} min | 🔥 +{sessionStats.xpEarned} XP
              </div>
              <button onClick={endSession} className="btn btn-outline-secondary" style={{ marginTop: '0.5rem' }}>
                End Session
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', height: '600px' }}>
        {/* Objectives Sidebar */}
        <div className="card" style={{ width: '250px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
            <h4>Learning Objectives</h4>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {objectives.map((obj, index) => (
              <div
                key={obj.objective_id}
                onClick={() => switchObjective(obj.objective_id)}
                style={{
                  padding: '0.75rem',
                  margin: '0.25rem 0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: obj.objective_id === currentObjective?.objective_id ? '#e3f2fd' : 'white',
                  border: obj.objective_id === currentObjective?.objective_id ? '1px solid #2196f3' : '1px solid #dee2e6',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  Objective {index + 1}
                </div>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.3' }}>
                  {obj.objective_text}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem' }}>
                  <span style={{ color: '#007bff' }}>🔥 Level {obj.current_level}</span>
                  <span style={{ color: '#28a745' }}>🧠 {obj.mastery_percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Chat Header */}
          <div style={{ padding: '1rem', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ fontSize: '1.5rem' }}>🤖</div>
              <div>
                <div style={{ fontWeight: 'bold' }}>AI Tutor</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                  Ready to help you learn!
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: message.speaker === 'student' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '0.75rem 1rem',
                    borderRadius: '18px',
                    backgroundColor: message.speaker === 'student' ? '#007bff' : '#f1f3f4',
                    color: message.speaker === 'student' ? 'white' : '#333',
                    fontSize: '0.95rem',
                    lineHeight: '1.4'
                  }}
                >
                  {message.message_content}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '18px',
                  backgroundColor: '#f1f3f4',
                  color: '#666'
                }}>
                  AI Tutor is typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div style={{ padding: '1rem', borderTop: '1px solid #dee2e6' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask a question or share your thoughts..."
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '20px',
                  outline: 'none',
                  fontSize: '0.95rem'
                }}
                disabled={isTyping}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isTyping}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  opacity: (!newMessage.trim() || isTyping) ? 0.5 : 1
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudyMode;