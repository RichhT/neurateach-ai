import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import axios from 'axios';

function QuizMode() {
  const { enrollmentId, objectiveId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [quizSession, setQuizSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [results, setResults] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [currentObjective, setCurrentObjective] = useState(null);
  const [showObjectiveSelection, setShowObjectiveSelection] = useState(false);

  useEffect(() => {
    initializeQuiz();
  }, [enrollmentId, objectiveId]);

  useEffect(() => {
    if (timeRemaining > 0 && !quizCompleted) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && quizSession && !quizCompleted) {
      // Auto-submit when time runs out
      completeQuiz();
    }
  }, [timeRemaining, quizCompleted, quizSession]);

  const initializeQuiz = async () => {
    try {
      console.log('Initializing quiz for enrollment:', enrollmentId, 'objective:', objectiveId);
      
      // Get enrollment progress
      const progressRes = await axios.get(`/api/enrollments/${enrollmentId}/progress`);
      console.log('Progress data:', progressRes.data);
      setObjectives(progressRes.data);
      
      // Find current objective
      if (objectiveId) {
        const targetObjective = progressRes.data.find(obj => obj.objective_id == objectiveId);
        if (targetObjective) {
          console.log('Target objective:', targetObjective);
          setCurrentObjective(targetObjective);
        } else {
          console.error('Objective not found:', objectiveId);
          alert('Objective not found');
          navigate('/dashboard');
          return;
        }
      } else {
        // No specific objective provided - show selection screen
        console.log('No objective specified, showing selection screen');
        setShowObjectiveSelection(true);
        setLoading(false);
        return;
      }

      // Start quiz session
      const quizRes = await axios.post('/api/assessment/start-quiz', {
        enrollmentId: parseInt(enrollmentId),
        objectiveId: currentObjective.objective_id,
        questionCount: 5
      });

      setQuizSession(quizRes.data);
      setQuestions(quizRes.data.questions);
      setTimeRemaining(quizRes.data.timeLimit * 60); // Convert minutes to seconds
      
    } catch (error) {
      console.error('Failed to initialize quiz:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert('Failed to start quiz: ' + (error.response?.data?.error || error.message));
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!selectedAnswer) {
      alert('Please select an answer');
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const startTime = answers[currentQuestion.id]?.startTime || Date.now();
    const timeTaken = Math.round((Date.now() - startTime) / 1000);

    try {
      const response = await axios.post('/api/assessment/submit-answer', {
        quizSessionId: quizSession.quizSessionId,
        questionId: currentQuestion.id,
        answer: selectedAnswer,
        timeTaken,
        confidenceLevel
      });

      // Store answer locally
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: {
          answer: selectedAnswer,
          confidence: confidenceLevel,
          timeTaken,
          isCorrect: response.data.isCorrect,
          correctAnswer: response.data.correctAnswer,
          explanation: response.data.explanation,
          startTime
        }
      }));

      // Move to next question or complete quiz
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer('');
        setConfidenceLevel(3);
        
        // Set start time for next question
        setAnswers(prev => ({
          ...prev,
          [questions[currentQuestionIndex + 1].id]: {
            ...prev[questions[currentQuestionIndex + 1].id],
            startTime: Date.now()
          }
        }));
      } else {
        completeQuiz();
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      alert('Failed to submit answer');
    }
  };

  const completeQuiz = async () => {
    try {
      const response = await axios.post('/api/assessment/complete-quiz', {
        quizSessionId: quizSession.quizSessionId
      });

      setResults(response.data.quizResults);
      setQuizCompleted(true);
    } catch (error) {
      console.error('Failed to complete quiz:', error);
      alert('Failed to complete quiz');
    }
  };

  const startQuizWithObjective = async (selectedObjective) => {
    try {
      setLoading(true);
      setCurrentObjective(selectedObjective);
      setShowObjectiveSelection(false);

      // Start quiz session
      const quizRes = await axios.post('/api/assessment/start-quiz', {
        enrollmentId: parseInt(enrollmentId),
        objectiveId: selectedObjective.objective_id,
        questionCount: 5
      });

      setQuizSession(quizRes.data);
      setQuestions(quizRes.data.questions);
      setTimeRemaining(quizRes.data.timeLimit * 60); // Convert minutes to seconds
      
    } catch (error) {
      console.error('Failed to start quiz:', error);
      alert('Failed to start quiz: ' + (error.response?.data?.error || error.message));
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceText = (level) => {
    const levels = ['Very Uncertain', 'Uncertain', 'Somewhat Sure', 'Sure', 'Very Sure'];
    return levels[level - 1];
  };

  // Set start time for first question
  useEffect(() => {
    if (questions.length > 0 && !answers[questions[0].id]) {
      setAnswers(prev => ({
        ...prev,
        [questions[0].id]: { startTime: Date.now() }
      }));
    }
  }, [questions]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
        <div>Preparing your quiz...</div>
      </div>
    );
  }

  // Show objective selection screen
  if (showObjectiveSelection) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div className="card">
          <div style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <h2>🎯 Choose Learning Objective</h2>
              <p style={{ color: '#666', margin: 0 }}>
                Select which objective you'd like to quiz on:
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {objectives.map((objective, index) => {
                const masteryColor = objective.mastery_score >= 0.8 ? '#28a745' : 
                                   objective.mastery_score >= 0.6 ? '#ffc107' : '#dc3545';
                
                return (
                  <div 
                    key={objective.objective_id}
                    onClick={() => startQuizWithObjective(objective)}
                    className="card"
                    style={{
                      padding: '1.5rem',
                      cursor: 'pointer',
                      border: '2px solid #dee2e6',
                      transition: 'all 0.2s ease',
                      ':hover': { borderColor: '#007bff' }
                    }}
                    onMouseEnter={(e) => e.target.style.borderColor = '#007bff'}
                    onMouseLeave={(e) => e.target.style.borderColor = '#dee2e6'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                          Objective {index + 1}
                        </div>
                        <div style={{ color: '#333', marginBottom: '0.5rem' }}>
                          {objective.objective_text}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>
                          Quiz attempts: {objective.quiz_attempts_count || 0}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold',
                          color: masteryColor,
                          marginBottom: '0.25rem'
                        }}>
                          {Math.round((objective.mastery_score || 0) * 100)}%
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                          Mastery
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button 
                onClick={() => navigate('/dashboard')}
                className="btn btn-secondary"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizCompleted && results) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div className="card">
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>🎯 Quiz Complete!</h2>
            
            {/* Results Summary */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '1rem',
              margin: '2rem 0'
            }}>
              <div className="card" style={{ padding: '1rem', backgroundColor: '#f8f9fa' }}>
                <div style={{ fontSize: '2rem', color: '#007bff' }}>{results.scorePercentage}%</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Score</div>
              </div>
              <div className="card" style={{ padding: '1rem', backgroundColor: '#f8f9fa' }}>
                <div style={{ fontSize: '2rem', color: '#28a745' }}>{results.correctAnswers}/{results.totalQuestions}</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Correct</div>
              </div>
              <div className="card" style={{ padding: '1rem', backgroundColor: '#f8f9fa' }}>
                <div style={{ fontSize: '2rem', color: results.masteryChange > 0 ? '#28a745' : '#dc3545' }}>
                  {results.newMastery}%
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  Mastery {results.masteryChange > 0 ? '↗' : results.masteryChange < 0 ? '↘' : '→'}
                </div>
              </div>
            </div>

            {/* Improvement Message */}
            <div style={{ 
              padding: '1rem', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '8px',
              marginBottom: '2rem'
            }}>
              <p style={{ margin: 0, fontSize: '1.1rem' }}>
                {results.improvementMessage}
              </p>
            </div>

            {/* Question Review */}
            <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
              <h3>Question Review</h3>
              {questions.map((question, index) => {
                const answer = answers[question.id];
                return (
                  <div key={question.id} className="card" style={{ 
                    margin: '1rem 0', 
                    padding: '1rem',
                    borderLeft: `4px solid ${answer.isCorrect ? '#28a745' : '#dc3545'}`
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      Question {index + 1}: {answer.isCorrect ? '✅' : '❌'}
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>{question.question_text}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      Your answer: <strong>{answer.answer}</strong> | 
                      Correct answer: <strong>{answer.correctAnswer}</strong>
                    </div>
                    {answer.explanation && (
                      <div style={{ 
                        marginTop: '0.5rem', 
                        padding: '0.5rem', 
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                      }}>
                        💡 {answer.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={() => navigate('/dashboard')}
                className="btn btn-primary"
              >
                Back to Dashboard
              </button>
              <button 
                onClick={() => navigate(`/course/${enrollmentId}/study/${currentObjective.objective_id}`)}
                className="btn btn-outline-primary"
              >
                Study More
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="btn btn-outline-secondary"
              >
                Retake Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  
  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
      {/* Quiz Header */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>🎯 Mastery Quiz</h2>
              <p style={{ margin: 0, color: '#666' }}>
                {currentObjective?.objective_text}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                fontSize: '1.2rem', 
                color: timeRemaining < 60 ? '#dc3545' : '#007bff',
                fontWeight: 'bold'
              }}>
                ⏱️ {formatTime(timeRemaining)}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ 
          height: '8px', 
          backgroundColor: '#e9ecef', 
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            height: '100%', 
            backgroundColor: '#007bff', 
            width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
            transition: 'width 0.3s ease'
          }}></div>
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <div className="card">
          <div style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>
              {currentQuestion.question_text}
            </h3>

            {/* Answer Options */}
            <div style={{ marginBottom: '2rem' }}>
              {Object.entries(currentQuestion.options).map(([key, value]) => (
                <div 
                  key={key}
                  onClick={() => setSelectedAnswer(key)}
                  style={{
                    padding: '1rem',
                    margin: '0.5rem 0',
                    border: `2px solid ${selectedAnswer === key ? '#007bff' : '#dee2e6'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: selectedAnswer === key ? '#e3f2fd' : 'white',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%',
                      backgroundColor: selectedAnswer === key ? '#007bff' : 'white',
                      border: `2px solid ${selectedAnswer === key ? '#007bff' : '#dee2e6'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}>
                      {selectedAnswer === key && '✓'}
                    </div>
                    <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>{key})</span>
                    <span>{value}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Confidence Level */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                How confident are you in your answer?
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={confidenceLevel}
                  onChange={(e) => setConfidenceLevel(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ 
                  minWidth: '120px',
                  fontSize: '0.9rem',
                  color: '#666'
                }}>
                  {getConfidenceText(confidenceLevel)}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={submitAnswer}
                disabled={!selectedAnswer}
                className="btn btn-primary"
                style={{ 
                  padding: '0.75rem 2rem',
                  fontSize: '1.1rem',
                  opacity: !selectedAnswer ? 0.5 : 1
                }}
              >
                {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Complete Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizMode;