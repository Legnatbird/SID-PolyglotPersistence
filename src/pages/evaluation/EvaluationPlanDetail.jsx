import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getEvaluationPlanById, 
  getCourseById, 
  updateEvaluationPlan,
  deleteEvaluationPlan,
  validateEvaluationPlanPercentages,
  getPlanCommentsByPlan,
  createPlanComment
} from '../../services/dataService';
import useAuthStore from '../../store/authStore';
import '../../styles/Pages.css';
import '../../styles/Forms.css';

export default function EvaluationPlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [plan, setPlan] = useState(null);
  const [course, setCourse] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState({ name: '', description: '', percentage: 0 });
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [percentageTotal, setPercentageTotal] = useState(0);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        const planData = await getEvaluationPlanById(id);
        if (!planData) {
          setError('Evaluation plan not found');
          return;
        }
        
        setPlan(planData);
        setActivities(planData.activities || []);
        
        const total = (planData.activities || []).reduce(
          (sum, activity) => sum + parseFloat(activity.percentage || 0), 
          0
        );
        setPercentageTotal(total);
        
        if (planData.subject_code) {
          const courseData = await getCourseById(planData.subject_code);
          setCourse(courseData);
        }
        
        const commentsData = await getPlanCommentsByPlan(id);
        setComments(commentsData);
        
      } catch (err) {
        console.error('Error fetching evaluation plan:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);
  
  const handleActivityChange = (index, field, value) => {
    const updatedActivities = [...activities];
    updatedActivities[index][field] = value;

    if (field === 'percentage') {
      const total = updatedActivities.reduce(
        (sum, activity) => sum + parseFloat(activity.percentage || 0), 
        0
      );
      setPercentageTotal(total);
    }
    
    setActivities(updatedActivities);
  };
  
  const handleAddActivity = () => {
    if (!newActivity.name || !newActivity.percentage) {
      setError('Activity name and percentage are required');
      return;
    }
    
    const updatedActivities = [
      ...activities, 
      { 
        ...newActivity, 
        id: Date.now().toString()
      }
    ];
    
    const total = updatedActivities.reduce(
      (sum, activity) => sum + parseFloat(activity.percentage || 0), 
      0
    );
    
    if (total > 100) {
      setError('Total percentage cannot exceed 100%');
      return;
    }
    
    setActivities(updatedActivities);
    setPercentageTotal(total);
    setNewActivity({ name: '', description: '', percentage: 0 });
    setError(null);
  };
  
  const handleRemoveActivity = (index) => {
    const updatedActivities = activities.filter((_, i) => i !== index);
    
    const total = updatedActivities.reduce(
      (sum, activity) => sum + parseFloat(activity.percentage || 0), 
      0
    );
    
    setActivities(updatedActivities);
    setPercentageTotal(total);
  };
  
  const handleSavePlan = async () => {
    try {
      if (!validateEvaluationPlanPercentages(activities)) {
        setError('Total percentage must equal 100%');
        return;
      }
      
      await updateEvaluationPlan(id, {
        activities,
        updated_by: user.id
      });
      
      setEditMode(false);
      setError(null);
      
      const updatedPlan = await getEvaluationPlanById(id);
      setPlan(updatedPlan);
      
    } catch (err) {
      console.error('Error updating evaluation plan:', err);
      setError(err.message);
    }
  };
  
  const handleDeletePlan = async () => {
    if (window.confirm('Are you sure you want to delete this evaluation plan?')) {
      try {
        await deleteEvaluationPlan(id);
        navigate('/evaluation-plans');
      } catch (err) {
        console.error('Error deleting evaluation plan:', err);
        setError(err.message);
      }
    }
  };
  
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await createPlanComment({
        evaluation_plan_id: id,
        student_id: user.id,
        student_name: user.user_metadata?.full_name || user.email,
        comment: newComment,
      });
      
      const commentsData = await getPlanCommentsByPlan(id);
      setComments(commentsData);
      setNewComment('');
      
    } catch (err) {
      console.error('Error adding comment:', err);
      setError(err.message);
    }
  };
  
  if (loading) return <div className="loading">Loading evaluation plan...</div>;
  if (error && !plan) return <div className="error">Error: {error}</div>;
  
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{course?.title || 'Course'} Evaluation Plan</h1>
        <div className="breadcrumbs">
          <span onClick={() => navigate('/')}>Dashboard</span> {'>'}
          <span onClick={() => navigate('/evaluation-plans')}>Evaluation Plans</span> {'>'}
          <span className="current">{course?.title || 'Plan Details'}</span>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="detail-card">
        <div className="detail-header">
          <h2>Plan Details</h2>
          <div className="action-buttons">
            {!editMode ? (
              <button className="action-button" onClick={() => setEditMode(true)}>
                Edit Plan
              </button>
            ) : (
              <>
                <button className="action-button save" onClick={handleSavePlan}>
                  Save Changes
                </button>
                <button className="action-button cancel" onClick={() => {
                  setEditMode(false);
                  setActivities(plan.activities || []);
                  setError(null);
                }}>
                  Cancel
                </button>
              </>
            )}
            {plan?.created_by === user.id && (
              <button className="action-button delete" onClick={handleDeletePlan}>
                Delete Plan
              </button>
            )}
          </div>
        </div>
        
        <div className="detail-item">
          <span className="detail-label">Course:</span>
          <span className="detail-value">{course?.title || 'Unknown Course'}</span>
        </div>
        
        <div className="detail-item">
          <span className="detail-label">Semester:</span>
          <span className="detail-value">{plan?.semester || 'Not specified'}</span>
        </div>
        
        <div className="detail-item">
          <span className="detail-label">Created By:</span>
          <span className="detail-value">
            {plan?.created_by === user.id ? 'You' : 'Another Student'}
          </span>
        </div>
        
        <div className="detail-item">
          <span className="detail-label">Last Updated:</span>
          <span className="detail-value">
            {plan?.updated_at ? new Date(plan.updated_at).toLocaleString() : 'N/A'}
          </span>
        </div>
      </div>
      
      <div className="detail-card">
        <h2>Evaluation Activities</h2>
        <div className="percentage-indicator">
          <div className="percentage-bar">
            <div 
              className="percentage-fill" 
              style={{ 
                width: `${percentageTotal}%`,
                backgroundColor: percentageTotal === 100 ? '#4caf50' : '#ff9800'
              }}
            ></div>
          </div>
          <span className={`percentage-total ${percentageTotal === 100 ? 'valid' : 'invalid'}`}>
            Total: {percentageTotal}%
          </span>
        </div>
        
        <div className="activities-list">
          {activities.length === 0 ? (
            <div className="empty-message">No activities defined yet.</div>
          ) : (
            <table className="activities-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Description</th>
                  <th>Percentage</th>
                  {editMode && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {activities.map((activity, index) => (
                  <tr key={activity.id || index}>
                    <td>
                      {editMode ? (
                        <input
                          type="text"
                          value={activity.name}
                          onChange={(e) => handleActivityChange(index, 'name', e.target.value)}
                        />
                      ) : (
                        activity.name
                      )}
                    </td>
                    <td>
                      {editMode ? (
                        <input
                          type="text"
                          value={activity.description || ''}
                          onChange={(e) => handleActivityChange(index, 'description', e.target.value)}
                        />
                      ) : (
                        activity.description || '-'
                      )}
                    </td>
                    <td>
                      {editMode ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={activity.percentage}
                          onChange={(e) => handleActivityChange(index, 'percentage', parseFloat(e.target.value))}
                        />
                      ) : (
                        `${activity.percentage}%`
                      )}
                    </td>
                    {editMode && (
                      <td>
                        <button 
                          className="action-button delete small" 
                          onClick={() => handleRemoveActivity(index)}
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {editMode && (
          <div className="add-activity-form">
            <h3>Add New Activity</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Activity Name</label>
                <input
                  type="text"
                  value={newActivity.name}
                  onChange={(e) => setNewActivity({...newActivity, name: e.target.value})}
                  placeholder="e.g., Midterm Exam"
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                  placeholder="Optional description"
                />
              </div>
              
              <div className="form-group">
                <label>Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newActivity.percentage}
                  onChange={(e) => setNewActivity({...newActivity, percentage: parseFloat(e.target.value)})}
                />
              </div>
              
              <button className="action-button" onClick={handleAddActivity}>Add Activity</button>
            </div>
          </div>
        )}
      </div>
      
      <div className="detail-card">
        <h2>Comments ({comments.length})</h2>
        
        <div className="comments-section">
          {comments.length === 0 ? (
            <div className="empty-message">No comments yet.</div>
          ) : (
            <div className="comments-list">
              {comments.map(comment => (
                <div key={comment._id} className="comment">
                  <div className="comment-header">
                    <strong>{comment.student_name}</strong>
                    <span className="comment-date">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="comment-body">{comment.comment}</div>
                </div>
              ))}
            </div>
          )}
          
          <div className="add-comment">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add your comment about this evaluation plan..."
              rows={3}
            ></textarea>
            <button className="action-button" onClick={handleAddComment}>
              Post Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
