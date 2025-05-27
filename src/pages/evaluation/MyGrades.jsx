import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getStudentCoursesByStudent,
  getEvaluationPlansByCourse,
  getStudentGradesByPlan,
  getCourseById,
  createStudentGrade,
  updateStudentGrade
} from '../../services/dataService';
import useAuthStore from '../../store/authStore';
import '../../styles/Pages.css';

export default function MyGrades() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const studentCode = user?.user_metadata?.student_code;
  
  const [selectedSemester, setSelectedSemester] = useState('2024-1');
  const [studentCourses, setStudentCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [evaluationPlan, setEvaluationPlan] = useState(null);
  const [courseDetails, setCourseDetails] = useState(null);
  const [studentGrades, setStudentGrades] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gradeUpdates, setGradeUpdates] = useState({});
  
  useEffect(() => {
    async function fetchStudentCourses() {
      if (!studentCode) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const courses = await getStudentCoursesByStudent(studentCode, selectedSemester);
        setStudentCourses(courses);
        
        setSelectedCourse(null);
        setEvaluationPlan(null);
        setCourseDetails(null);
        setStudentGrades([]);
        
      } catch (err) {
        console.error('Error fetching student courses:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStudentCourses();
  }, [studentCode, selectedSemester]);
  
  useEffect(() => {
    async function fetchCourseData() {
      if (!selectedCourse || !studentCode) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const course = await getCourseById(selectedCourse.subject_code);
        setCourseDetails(course);
        
        const plans = await getEvaluationPlansByCourse(
          selectedCourse.subject_code, 
          selectedSemester
        );
        
        if (plans.length === 0) {
          setEvaluationPlan(null);
          setError('No evaluation plan found for this course');
          return;
        }

        const latestPlan = plans.sort((a, b) => 
          new Date(b.updated_at) - new Date(a.updated_at)
        )[0];
        
        setEvaluationPlan(latestPlan);
        
        const gradesData = await getStudentGradesByPlan(latestPlan._id, studentCode);
        
        let gradesArray = [];
        
        if (gradesData && Array.isArray(gradesData.grades)) {
          gradesArray = gradesData.grades;
        } else if (Array.isArray(gradesData)) {
          if (gradesData.length > 0 && gradesData[0].grades) {
            gradesArray = gradesData[0].grades;
          } else {
            gradesArray = gradesData;
          }
        } else {
          console.warn('Unexpected grade data format:', gradesData);
          gradesArray = [];
        }
        
        setStudentGrades(gradesArray);
        
        const updates = {};
        latestPlan.activities.forEach(activity => {
          const existingGrade = gradesArray.find(g => g.activity_id === activity._id);
          
          if (existingGrade) {
            updates[activity._id] = existingGrade.grade;
          } else {
            updates[activity._id] = '';
          }
        });
        
        setGradeUpdates(updates);
        
      } catch (err) {
        console.error('Error fetching course data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchCourseData();
  }, [selectedCourse, selectedSemester, studentCode]);
  
  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
  };
  
  const handleGradeChange = (activityId, value) => {
    setGradeUpdates(prev => ({
      ...prev,
      [activityId]: value
    }));
  };
  
  const handleSaveGrade = async (activity) => {
    try {
      const gradeValue = parseFloat(gradeUpdates[activity._id]);
      
      if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 5) {
        setError('Grade must be a number between 0 and 5');
        return;
      }
      
      const existingGrade = studentGrades.find(g => g.activity_id === activity._id);
      
      if (existingGrade) {
        const gradeId = existingGrade._id || existingGrade.id;
        
        await updateStudentGrade(gradeId, {
          grade: gradeValue,
          comments: existingGrade.comments || '',
          updated_at: new Date().toISOString()
        });
        
      } else {
        await createStudentGrade({
          evaluation_plan_id: evaluationPlan._id,
          subject_code: selectedCourse.subject_code,
          subject_name: selectedCourse.subject_name,
          student_id: studentCode,
          activity_id: activity._id,
          activity_name: activity.name,
          grade: gradeValue,
          comments: '',
          semester: selectedSemester,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      }
      
      const updatedGradesData = await getStudentGradesByPlan(evaluationPlan._id, studentCode);
      
      let updatedGradesArray = [];
      
      if (updatedGradesData && Array.isArray(updatedGradesData.grades)) {
        updatedGradesArray = updatedGradesData.grades;
      } else if (Array.isArray(updatedGradesData)) {
        if (updatedGradesData.length > 0 && updatedGradesData[0].grades) {
          updatedGradesArray = updatedGradesData[0].grades;
        } else {
          updatedGradesArray = updatedGradesData;
        }
      } else {
        console.warn('Unexpected grade data format:', updatedGradesData);
        updatedGradesArray = [];
      }
      
      setStudentGrades(updatedGradesArray);

      const newUpdates = { ...gradeUpdates };
      newUpdates[activity._id] = gradeValue.toString();
      setGradeUpdates(newUpdates);
      
      setError(null);
      
    } catch (err) {
      console.error('Error saving grade:', err);
      setError(err.message);
    }
  };
  
  const calculateGradeFromActivities = () => {
    if (!evaluationPlan || !evaluationPlan.activities || !studentGrades || studentGrades.length === 0) {
      return null;
    }
    
    console.log("Calculating grade from activities:", { 
      evaluationPlan, 
      studentGrades 
    });
    
    let totalGradePoints = 0;
    let totalPercentageWithGrades = 0;
    const totalPlanPercentage = evaluationPlan.activities.reduce(
      (sum, activity) => sum + parseFloat(activity.percentage || 0), 0
    );
    
    evaluationPlan.activities.forEach(activity => {
      const activityId = activity._id || activity.id;
      console.log(`Looking for grade for activity ${activityId} (${activity.name})`);
      
      const existingGrade = studentGrades.find(g => g.activity_id === activityId);
      
      if (existingGrade) {
        console.log(`Found grade for ${activity.name}:`, existingGrade);
        const grade = parseFloat(existingGrade.grade);
        const percentage = parseFloat(activity.percentage);
        
        if (!isNaN(grade) && !isNaN(percentage)) {
          totalGradePoints += (grade * percentage) / 100;
          totalPercentageWithGrades += percentage;
        }
      } else {
        console.log(`No grade found for activity ${activityId} (${activity.name})`);
      }
    });
    
    const finalGrade = totalPercentageWithGrades > 0 ? totalGradePoints : 0;
    const completionPercentage = totalPlanPercentage > 0 ?
      (totalPercentageWithGrades / totalPlanPercentage) * 100 : 0;
    
    console.log("Final calculation:", {
      finalGrade,
      completionPercentage,
      totalGradePoints,
      totalPercentageWithGrades,
      totalPlanPercentage
    });
    
    return {
      currentGrade: finalGrade,
      completedPercentage: completionPercentage
    };
  };

  const currentGrade = evaluationPlan && studentGrades.length > 0
    ? calculateGradeFromActivities()
    : null;
  
  const semesters = ['2023-1', '2023-2', '2024-1', '2024-2'];
  
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Grades</h1>
        <div className="breadcrumbs">
          <span onClick={() => navigate('/')}>Dashboard</span> {'>'}
          <span className="current">My Grades</span>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {!studentCode ? (
        <div className="unauthorized-message">
          <h2>Student Information Missing</h2>
          <p>Your student code is required to access your grades.</p>
          <p>Please update your profile to include your student code.</p>
        </div>
      ) : (
        <>
          <div className="semester-selector">
            <label htmlFor="semester-select">Select Semester:</label>
            <select 
              id="semester-select" 
              value={selectedSemester} 
              onChange={(e) => setSelectedSemester(e.target.value)}
            >
              {semesters.map(sem => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>
          
          <div className="grades-layout">
            <div className="courses-sidebar">
              <h2>My Courses</h2>
              {loading && !selectedCourse ? (
                <div className="loading-indicator">Loading courses...</div>
              ) : studentCourses.length === 0 ? (
                <div className="empty-message">
                  No courses found for this semester.
                </div>
              ) : (
                <ul className="courses-list">
                  {studentCourses.map(course => (
                    <li 
                      key={course._id} 
                      className={selectedCourse?._id === course._id ? 'selected' : ''}
                      onClick={() => handleCourseSelect(course)}
                    >
                      {course.subject_name || `Course ID: ${course.subject_code}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="grades-content">
              {!selectedCourse ? (
                <div className="course-prompt">
                  <h2>Select a course to view and manage your grades</h2>
                  {studentCourses.length === 0 && !loading && (
                    <div className="action-prompt">
                      <p>You don't have any courses for this semester.</p>
                      <button 
                        className="action-button"
                        onClick={() => navigate('/my-courses')}
                      >
                        Add Courses
                      </button>
                    </div>
                  )}
                </div>
              ) : loading ? (
                <div className="loading-indicator">Loading course data...</div>
              ) : !evaluationPlan ? (
                <div className="no-plan">
                  <h2>{selectedCourse.subject_name || courseDetails?.title || 'Course'}</h2>
                  <p>No evaluation plan has been created for this course yet.</p>
                  <button 
                    className="action-button"
                    onClick={() => navigate(`/evaluation-plans/new?course=${selectedCourse.subject_code}&semester=${selectedSemester}`)}
                  >
                    Create Evaluation Plan
                  </button>
                </div>
              ) : (
                <div className="course-grades">
                  <h2>{selectedCourse.subject_name || courseDetails?.title || 'Course'}</h2>
                  
                  {currentGrade && (
                    <div className="current-grade-summary">
                      <div className="current-grade">
                        <span className="grade-label">Current Grade:</span>
                        <span className="grade-value">{currentGrade.currentGrade.toFixed(2)}</span>
                      </div>
                      <div className="completed-percentage">
                        <span className="percentage-label">Completed:</span>
                        <span className="percentage-value">{currentGrade.completedPercentage}%</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="activities-grades">
                    <h3>Activities and Grades</h3>
                    <table className="grades-table">
                      <thead>
                        <tr>
                          <th>Activity</th>
                          <th>Description</th>
                          <th>Percentage</th>
                          <th>My Grade</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evaluationPlan.activities.map((activity, index) => {
                          const existingGrade = studentGrades.find(g => g.activity_id === activity._id);
                          return (
                            <tr key={`activity-${activity._id || index}`}>
                              <td>{activity.name}</td>
                              <td>{activity.description || '-'}</td>
                              <td>{activity.percentage}%</td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  max="5"
                                  step="0.1"
                                  value={gradeUpdates[activity._id] || ''}
                                  onChange={(e) => handleGradeChange(activity._id, e.target.value)}
                                  placeholder="0.0 - 5.0"
                                />
                                {existingGrade && existingGrade.updated_at && (
                                  <div className="grade-timestamp">
                                    Last updated: {new Date(existingGrade.updated_at).toLocaleDateString()}
                                  </div>
                                )}
                              </td>
                              <td>
                                <button 
                                  className="action-button small"
                                  onClick={() => handleSaveGrade(activity)}
                                >
                                  {existingGrade ? 'Update' : 'Save'}
                                </button>
                                {existingGrade && existingGrade.comments && (
                                  <div className="grade-comment">
                                    {existingGrade.comments}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="plan-details">
                    <button 
                      className="action-button"
                      onClick={() => navigate(`/evaluation-plans/${evaluationPlan._id}`)}
                    >
                      View Complete Evaluation Plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
