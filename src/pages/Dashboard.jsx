import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { 
  getStudentCoursesByStudent, 
  getStudentGradesBySemester,
  calculateFinalGrade,
  getEvaluationPlansByCourse,
  resetAndReseedDemoData
} from '../services/dataService';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSemester, setCurrentSemester] = useState('2024-1');
  const [courses, setCourses] = useState([]);
  const [courseGrades, setCourseGrades] = useState({});
  const [overallAverage, setOverallAverage] = useState(null);
  const [upcomingEvaluations, setUpcomingEvaluations] = useState([]);
  
  const studentCode = user?.user_metadata?.student_code || '';

  const handleResetData = () => {
    try {
      resetAndReseedDemoData();
      window.location.reload();
    } catch (err) {
      console.error('Error resetting data:', err);
      setError('Failed to reset data: ' + err.message);
    }
  };
  
  useEffect(() => {
    console.log("Current user:", user);
    console.log("Student code:", studentCode);
    
    async function fetchDashboardData() {
      if (!user || !studentCode) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        setUpcomingEvaluations([]);
        
        console.log(`Fetching courses for student ${studentCode} and semester ${currentSemester}`);
        const studentCourses = await getStudentCoursesByStudent(studentCode, currentSemester);
        console.log("Student courses:", studentCourses);
        setCourses(studentCourses);
        
        if (studentCourses.length === 0) {
          console.log("No courses found for this student and semester");
          setLoading(false);
          return;
        }

        const semesterGradesData = await getStudentGradesBySemester(studentCode, currentSemester);

        const gradesByCourse = {};
        let totalGradePoints = 0;
        let coursesWithGrades = 0;
        
        if (Array.isArray(semesterGradesData)) {
          await Promise.all(studentCourses.map(async (course) => {
            const plans = await getEvaluationPlansByCourse(course.subject_code, currentSemester);
            
            const latestPlan = plans.length > 0 
              ? plans.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]
              : null;
              
            const courseGrades = semesterGradesData.filter(grade => 
              grade.subject_code === course.subject_code
            );
            
            let gradeInfo = { currentGrade: 0, completedPercentage: 0, hasData: false };
            
            if (latestPlan && courseGrades.length > 0) {
              gradeInfo = calculateFinalGrade(latestPlan.activities, courseGrades);
              gradeInfo.hasData = true;
              
              totalGradePoints += gradeInfo.currentGrade;
              coursesWithGrades++;
              
              if (latestPlan.activities) {
                const gradedActivityIds = courseGrades.map(g => g.activity_id);
                const ungradedActivities = latestPlan.activities.filter(
                  activity => !gradedActivityIds.includes(activity.id)
                );
                
                if (ungradedActivities.length > 0) {
                  setUpcomingEvaluations(prev => [
                    ...prev,
                    ...ungradedActivities.map(activity => ({
                      course: course.subject_name || 'Unknown Course',
                      courseId: course.subject_code,
                      activity: activity.name,
                      percentage: activity.percentage
                    }))
                  ]);
                }
              }
            }
            
            gradesByCourse[course.subject_code] = {
              ...gradeInfo,
              courseName: course.subject_name || 'Unknown Course',
              courseId: course.subject_code
            };
          }));
        } else {
          await Promise.all(studentCourses.map(async (course) => {
            const gradeObj = Array.isArray(semesterGradesData) ? null : 
              semesterGradesData.find(g => g.subject_code === course.subject_code);
            
            if (gradeObj && gradeObj.calculated_grade !== undefined) {
              const gradeValue = parseFloat(gradeObj.calculated_grade);
              gradesByCourse[course.subject_code] = {
                currentGrade: gradeValue,
                completedPercentage: 100, // Assume 100% if we have calculated grade
                hasData: true,
                courseName: gradeObj.subject_name || course.subject_name || 'Unknown Course',
                courseId: course.subject_code
              };
              
              totalGradePoints += gradeValue;
              coursesWithGrades++;
            } else {
              const plans = await getEvaluationPlansByCourse(course.subject_code, currentSemester);
              const latestPlan = plans.length > 0 
                ? plans.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]
                : null;
              
              gradesByCourse[course.subject_code] = {
                currentGrade: 0,
                completedPercentage: 0,
                hasData: false,
                courseName: course.subject_name || 'Unknown Course',
                courseId: course.subject_code
              };

              if (latestPlan && latestPlan.activities) {
                setUpcomingEvaluations(prev => [
                  ...prev,
                  ...latestPlan.activities.map(activity => ({
                    course: course.subject_name || 'Unknown Course',
                    courseId: course.subject_code,
                    activity: activity.name,
                    percentage: activity.percentage
                  }))
                ]);
              }
            }
          }));
        }
        
        setCourseGrades(gradesByCourse);
        
        if (coursesWithGrades > 0) {
          setOverallAverage(totalGradePoints / coursesWithGrades);
        }
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, [user, currentSemester, studentCode]);
  
  return (
    <div className="dashboard">
      <p className="welcome-message">
        Welcome, {user?.user_metadata?.full_name || 'Student'} 
        {studentCode && <span className="student-code">({studentCode})</span>}
      </p>

      {user?.user_metadata?.is_admin && (
        <div className="debug-controls">
          <button onClick={handleResetData} className="debug-button">
            Reset & Reseed Demo Data
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-indicator">Loading your academic information...</div>
      ) : error ? (
        <div className="error-message">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()} className="action-button">
            Try Again
          </button>
        </div>
      ) : (
        <div className="dashboard-sections">
          <div className="dashboard-section">
            <h2>Semester Overview</h2>
            <div className="dashboard-cards">
              <div className="dashboard-card">
                <h3>Current Semester</h3>
                <p>{currentSemester}</p>
                <p>Enrolled in {courses.length} courses</p>
              </div>
              
              {overallAverage !== null && (
                <div className="dashboard-card">
                  <h3>Overall Average</h3>
                  <p className={`grade ${overallAverage >= 3.0 ? 'passing' : 'failing'}`}>
                    {overallAverage.toFixed(2)}
                  </p>
                  <p>{overallAverage >= 3.0 ? 'Good standing' : 'Needs improvement'}</p>
                </div>
              )}
              
              <div className="dashboard-card" onClick={() => navigate('/semester-report')}>
                <h3>Semester Report</h3>
                <p>View detailed semester performance</p>
                <p className="card-action">View Report →</p>
              </div>
            </div>
          </div>
          
          <div className="dashboard-section">
            <h2>My Courses</h2>
            {courses.length === 0 ? (
              <div className="empty-message">
                <p>You're not enrolled in any courses for {currentSemester}.</p>
                {user?.user_metadata?.is_admin && (
                  <button onClick={handleResetData} className="action-button">
                    Reset Demo Data
                  </button>
                )}
              </div>
            ) : (
              <div className="dashboard-cards">
                {Object.values(courseGrades).map(course => (
                  <div 
                    key={course.courseId} 
                    className="dashboard-card"
                    onClick={() => navigate(`/my-grades?course=${course.courseId}&semester=${currentSemester}`)}
                  >
                    <h3>{course.courseName}</h3>
                    {course.hasData ? (
                      <>
                        <p className={`grade ${course.currentGrade >= 3.0 ? 'passing' : 'failing'}`}>
                          {course.currentGrade.toFixed(2)}
                        </p>
                        <div className="course-progress">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${course.completedPercentage}%` }}
                            ></div>
                          </div>
                          <p>{course.completedPercentage}% completed</p>
                        </div>
                      </>
                    ) : (
                      <p>No grades recorded yet</p>
                    )}
                    <p className="card-action">Manage Grades →</p>
                  </div>
                ))}
                
                <div 
                  className="dashboard-card add-card"
                  onClick={() => navigate('/my-courses')}
                >
                  <h3>Add Course</h3>
                  <p>Enroll in a new course</p>
                  <p className="card-action">Add Course →</p>
                </div>
              </div>
            )}
          </div>
          
          {upcomingEvaluations.length > 0 && (
            <div className="dashboard-section">
              <h2>Upcoming Evaluations</h2>
              <div className="upcoming-list">
                {upcomingEvaluations.slice(0, 5).map((item, index) => (
                  <div 
                    key={index} 
                    className="upcoming-item"
                    onClick={() => navigate(`/my-grades?course=${item.courseId}&semester=${currentSemester}`)}
                  >
                    <div className="upcoming-info">
                      <h3>{item.activity}</h3>
                      <p>{item.course}</p>
                    </div>
                    <div className="upcoming-weight">
                      {item.percentage}%
                    </div>
                  </div>
                ))}
                
                {upcomingEvaluations.length > 5 && (
                  <div className="view-all">
                    <button 
                      className="action-button"
                      onClick={() => navigate('/my-grades')}
                    >
                      View All Evaluations
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="dashboard-section">
            <h2>Quick Actions</h2>
            <div className="dashboard-cards">
              <div 
                className="dashboard-card"
                onClick={() => navigate('/my-grades')}
              >
                <h3>My Grades</h3>
                <p>View and manage your grades</p>
                <p className="card-action">Go to Grades →</p>
              </div>
              
              <div 
                className="dashboard-card"
                onClick={() => navigate('/evaluation-plans')}
              >
                <h3>Evaluation Plans</h3>
                <p>View course evaluation plans</p>
                <p className="card-action">View Plans →</p>
              </div>
              
              <div 
                className="dashboard-card"
                onClick={() => navigate('/semester-report')}
              >
                <h3>Academic Report</h3>
                <p>View your academic performance</p>
                <p className="card-action">View Report →</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
