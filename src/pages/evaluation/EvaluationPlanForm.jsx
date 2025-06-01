import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  getCourses, 
  createEvaluationPlan, 
  validateEvaluationPlanPercentages 
} from '../../services/dataService';
import useAuthStore from '../../store/authStore';
import '../../styles/Pages.css';
import '../../styles/Forms.css';

export default function EvaluationPlanForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(searchParams.get('course') || '');
  const [selectedSemester, setSelectedSemester] = useState(searchParams.get('semester') || '2024-1');
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState({ name: '', description: '', percentage: 0 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [percentageTotal, setPercentageTotal] = useState(0);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const coursesData = await getCourses();
        setCourses(coursesData);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses: ' + err.message);
      }
    }

    fetchCourses();
  }, []);

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
        _id: Date.now().toString(),
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCourse) {
      setError('Please select a course');
      return;
    }
    
    if (!selectedSemester) {
      setError('Please select a semester');
      return;
    }
    
    if (activities.length === 0) {
      setError('Please add at least one activity');
      return;
    }
    
    if (!validateEvaluationPlanPercentages(activities)) {
      setError('Total percentage must equal 100%');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Find the selected course data more robustly
      const selectedCourseData = courses.find(c => 
        c._id === selectedCourse || 
        c.code === selectedCourse ||
        c._id === selectedCourse.toString() ||
        c.code === selectedCourse.toString()
      );
      
      console.log('Selected course value:', selectedCourse);
      console.log('Available courses:', courses);
      console.log('Found course data:', selectedCourseData);
      
      if (!selectedCourseData) {
        setError('Selected course not found. Please select a valid course.');
        return;
      }
      
      const planData = {
        subject_code: selectedCourseData.code,
        subject_name: selectedCourseData.title,
        semester: selectedSemester,
        created_by: user?.user_metadata?.student_code || user?.id,
        professor_id: user?.user_metadata?.student_code || user?.id,
        professor_name: user?.user_metadata?.full_name || `Student ${user?.user_metadata?.student_code || user?.id}`,
        activities: activities.map(activity => ({
          _id: activity._id || activity.id,
          name: activity.name,
          description: activity.description || '',
          percentage: parseFloat(activity.percentage)
        }))
      };
      
      console.log('Submitting plan data:', planData);
      
      const result = await createEvaluationPlan(planData);
      
      setSuccess(`Evaluation plan created successfully! ${result.auto_enrolled ? 'You have been automatically enrolled in this course.' : ''}`);
      
      // Navigate after a short delay to show success message
      setTimeout(() => {
        navigate('/evaluation-plans');
      }, 2000);
      
    } catch (err) {
      console.error('Error creating evaluation plan:', err);
      setError('Failed to create evaluation plan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const semesters = ['2023-1', '2023-2', '2024-1', '2024-2'];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Create Evaluation Plan</h1>
        <div className="breadcrumbs">
          <span onClick={() => navigate('/')}>Dashboard</span> {'>'}
          <span onClick={() => navigate('/evaluation-plans')}>Evaluation Plans</span> {'>'}
          <span className="current">New Plan</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="form-container">
        <div className="detail-card">
          <h2>Plan Information</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="course-select">Course *</label>
              <select
                id="course-select"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                required
              >
                <option value="">Select a course</option>
                {courses.map(course => (
                  <option key={course._id || course.code} value={course.code}>
                    {course.title} ({course.code})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="semester-select">Semester *</label>
              <select
                id="semester-select"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                required
              >
                {semesters.map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
            </div>
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

          {activities.length > 0 && (
            <table className="activities-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Description</th>
                  <th>Percentage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity, index) => (
                  <tr key={activity._id || activity.id || index}>
                    <td>
                      <input
                        type="text"
                        value={activity.name}
                        onChange={(e) => handleActivityChange(index, 'name', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={activity.description || ''}
                        onChange={(e) => handleActivityChange(index, 'description', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={activity.percentage}
                        onChange={(e) => handleActivityChange(index, 'percentage', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </td>
                    <td>
                      <button 
                        type="button"
                        className="action-button delete small" 
                        onClick={() => handleRemoveActivity(index)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {percentageTotal < 100 && (
            <div className="add-activity-form">
              <h3>Add Activity</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Activity Name *</label>
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
                  <label>Percentage (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newActivity.percentage}
                    onChange={(e) => setNewActivity({...newActivity, percentage: parseFloat(e.target.value) || 0})}
                  />
                </div>
                
                <button 
                  type="button" 
                  className="action-button" 
                  onClick={handleAddActivity}
                >
                  Add Activity
                </button>
              </div>
            </div>
          )}

          {percentageTotal === 100 && (
            <div className="completion-message">
              <p>✓ Evaluation plan is complete (100%). You can modify existing activities above if needed.</p>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="action-button cancel" 
            onClick={() => navigate('/evaluation-plans')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="action-button save" 
            disabled={loading || percentageTotal !== 100}
          >
            {loading ? 'Creating...' : 'Create Plan'}
          </button>
        </div>
      </form>
    </div>
  );
}
