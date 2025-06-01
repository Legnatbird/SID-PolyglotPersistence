import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getStudentGradesBySemester,
  getStudentCoursesByStudent,
  getCourseById,
  resetAndReseedDemoData,
  getEvaluationPlansByCourse
} from '../../services/dataService';
import useAuthStore from '../../store/authStore';
import '../../styles/Pages.css';

export default function SemesterReport() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const studentCode = user?.user_metadata?.student_code || '';
  
  const [selectedSemester, setSelectedSemester] = useState('2024-1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [semesterGrades, setSemesterGrades] = useState([]);
  const [overallAverage, setOverallAverage] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  
  const requestCacheRef = useRef({});

  const cachedRequest = useCallback(async (key, requestFn) => {
    if (requestCacheRef.current[key]) {
      return requestCacheRef.current[key];
    }
    
    try {
      const result = await requestFn();
      requestCacheRef.current[key] = result;
      return result;
    } catch (error) {
      console.error(`Error in cached request ${key}:`, error);
      throw error;
    }
  }, []);
  
  const handleResetData = useCallback(() => {
    try {
      resetAndReseedDemoData();
      requestCacheRef.current = {};
      window.location.reload();
    } catch (err) {
      console.error('Error resetting data:', err);
      setError('Failed to reset data: ' + err.message);
    }
  }, []);
  
  const fetchCourseDetailsAndPlans = useCallback(async (courses, semester) => {
    const courseDetailsMap = {};
    const evaluationPlansMap = {};
    
    const batchSize = 5;
    let promises = [];
    
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];

      const detailsKey = `course-${course.subject_code}`;
      promises.push(
        cachedRequest(detailsKey, () => getCourseById(course.subject_code))
          .then(details => {
            courseDetailsMap[course.subject_code] = details;
          })
      );
      
      const plansKey = `plans-${course.subject_code}-${semester}`;
      promises.push(
        cachedRequest(plansKey, () => getEvaluationPlansByCourse(course.subject_code, semester))
          .then(plans => {
            if (plans && plans.length > 0) {
              const latestPlan = plans.sort((a, b) => 
                new Date(b.updated_at) - new Date(a.updated_at)
              )[0];
              evaluationPlansMap[course.subject_code] = latestPlan;
            }
          })
      );
      
      if (promises.length >= batchSize || i === courses.length - 1) {
        await Promise.all(promises);
        promises = [];
      }
    }
    
    return { courseDetailsMap, evaluationPlansMap };
  }, [cachedRequest]);
  
  const processGrades = useCallback((courses, gradesData, courseDetailsMap, evaluationPlansMap) => {
    const courseGrades = {};
    courses.forEach(course => {
      courseGrades[course.subject_code] = {
        courseId: course.subject_code,
        courseName: courseDetailsMap[course.subject_code]?.title || course.subject_name || 'Unknown Course',
        grades: [],
        finalGrade: 0,
        totalPercentage: 0,
        evaluationPlan: evaluationPlansMap[course.subject_code] || null
      };
    });
    
    let validGradeSum = 0;
    let validGradeCount = 0;

    if (Array.isArray(gradesData)) {
      gradesData.forEach(grade => {
        const courseId = grade.subject_code;
        if (courseGrades[courseId]) {
          courseGrades[courseId].grades.push(grade);
        }
      });
      
      Object.values(courseGrades).forEach(course => {
        if (course.evaluationPlan && course.evaluationPlan.activities && course.grades.length > 0) {
          let weightedSum = 0;
          let totalPercentageWithGrades = 0;
          const totalPlanPercentage = course.evaluationPlan.activities.reduce(
            (sum, activity) => sum + parseFloat(activity.percentage || 0), 0
          );
          
          course.evaluationPlan.activities.forEach(activity => {
            const activityId = activity._id;
            
            const grade = course.grades.find(g => g.activity_id === activityId);
            
            if (grade) {
              const gradeValue = parseFloat(grade.grade);
              const percentage = parseFloat(activity.percentage || 0);
              
              if (!isNaN(gradeValue) && !isNaN(percentage)) {
                weightedSum += gradeValue * (percentage / 100);
                totalPercentageWithGrades += percentage;
              }
            }
          });
          
          course.finalGrade = weightedSum;
          
          course.totalPercentage = totalPlanPercentage > 0 ?
            Math.min((totalPercentageWithGrades / totalPlanPercentage) * 100, 100) : 0;
          
          if (course.finalGrade > 0) {
            validGradeSum += course.finalGrade;
            validGradeCount++;
          }
        }
      });
    }

    const overallAvg = validGradeCount > 0 ? validGradeSum / validGradeCount : null;
    
    return { courseGrades: Object.values(courseGrades), overallAverage: overallAvg };
  }, []);
  
  useEffect(() => {
    if (!user || !studentCode) {
      setLoading(false);
      setSemesterGrades([]);
      setOverallAverage(null);
      return;
    }
    
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    setSemesterGrades([]);
    setOverallAverage(null);
    
    async function fetchSemesterData() {
      try {
        const coursesKey = `courses-${studentCode}-${selectedSemester}`;
        const gradesKey = `grades-${studentCode}-${selectedSemester}`;
        
        const courses = await cachedRequest(coursesKey, () => 
          getStudentCoursesByStudent(studentCode, selectedSemester)
        );
        
        if (!isMounted) return;
        
        setDebugInfo(prev => ({
          ...prev,
          studentId: studentCode,
          semester: selectedSemester,
          courseCount: courses.length,
          courses: courses
        }));
        
        if (courses.length === 0) {
          setSemesterGrades([]);
          setOverallAverage(null);
          setLoading(false);
          return;
        }

        const gradesData = await cachedRequest(gradesKey, () => 
          getStudentGradesBySemester(studentCode, selectedSemester)
        );
        
        if (!isMounted) return;
        
        setDebugInfo(prev => ({
          ...prev,
          gradesCount: Array.isArray(gradesData) ? gradesData.length : (gradesData ? 1 : 0),
          grades: gradesData
        }));
        
        const { courseDetailsMap, evaluationPlansMap } = await fetchCourseDetailsAndPlans(courses, selectedSemester);
        
        if (!isMounted) return;

        const { courseGrades, overallAverage } = processGrades(
          courses, 
          gradesData, 
          courseDetailsMap, 
          evaluationPlansMap
        );
        
        if (!isMounted) return;
        
        setSemesterGrades(courseGrades);
        setOverallAverage(overallAverage);
        
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching semester data:', err);
          setError(err.message);
          setSemesterGrades([]);
          setOverallAverage(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    fetchSemesterData();

    return () => {
      isMounted = false;
    };
  }, [user, selectedSemester, studentCode, cachedRequest, fetchCourseDetailsAndPlans, processGrades]);
  
  const semesters = ['2023-1', '2023-2', '2024-1', '2024-2'];
  
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Semester Report</h1>
        <div className="breadcrumbs">
          <span onClick={() => navigate('/')}>Dashboard</span> {'>'}
          <span className="current">Semester Report</span>
        </div>
      </div>
      
      {user?.user_metadata?.is_admin && (
        <div className="debug-controls">
          <button onClick={handleResetData} className="debug-button">
            Reset & Reseed Demo Data
          </button>
          <span className="debug-info">Student: {studentCode}, Semester: {selectedSemester}</span>
        </div>
      )}
      
      {!studentCode ? (
        <div className="unauthorized-message">
          <h2>Student Information Missing</h2>
          <p>Your student code is required to access your semester report.</p>
          <p>Please update your profile to include your student code.</p>
        </div>
      ) : (
        <>
          {error && <div className="error-message">{error}</div>}
          
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
          
          {loading ? (
            <div className="loading">Loading semester data...</div>
          ) : (
            <div className="semester-report">
              {overallAverage !== null && (
                <div className="overall-average">
                  <h2>Semester Average: <span>{isNaN(overallAverage) ? "N/A" : overallAverage.toFixed(2)}</span></h2>
                  <div className="grade-status">
                    {!isNaN(overallAverage) && (
                      overallAverage >= 3.0 ? (
                        <span className="passing">Passing</span>
                      ) : (
                        <span className="failing">Failing</span>
                      )
                    )}
                  </div>
                </div>
              )}
              
              {semesterGrades.length === 0 ? (
                <div className="empty-message">
                  <p>No course data found for this semester.</p>
                  <p>Student ID: {studentCode}</p>
                  <p>Semester: {selectedSemester}</p>
                  
                  {/* Display debug info only for admins */}
                  {user?.user_metadata?.is_admin && (
                    <div className="debug-data">
                      <h3>Debug Information</h3>
                      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                      
                      <button 
                        onClick={handleResetData} 
                        className="action-button"
                        style={{ marginTop: '1rem' }}
                      >
                        Reset Demo Data
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="courses-summary">
                  <h3>Courses Summary</h3>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Current Grade</th>
                        <th>Completion</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semesterGrades.map(course => (
                        <tr key={course.courseId}>
                          <td>{course.courseName}</td>
                          <td className={!isNaN(course.finalGrade) && course.finalGrade >= 3.0 ? 'passing' : 'failing'}>
                            {isNaN(course.finalGrade) ? "N/A" : course.finalGrade.toFixed(2)}
                          </td>
                          <td>
                            <div className="completion-bar">
                              <div 
                                className="completion-fill" 
                                style={{ width: `${Math.min(course.totalPercentage || 0, 100)}%` }}
                              ></div>
                            </div>
                            <span>{isNaN(course.totalPercentage) ? "0" : Math.round(course.totalPercentage)}%</span>
                          </td>
                          <td>
                            {!isNaN(course.finalGrade) && (
                              course.finalGrade >= 3.0 ? (
                                <span className="status passing">Passing</span>
                              ) : (
                                <span className="status failing">Failing</span>
                              )
                            )}
                          </td>
                          <td>
                            <button 
                              className="action-button small"
                              onClick={() => navigate(`/my-grades?course=${course.courseId}&semester=${selectedSemester}`)}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="report-actions">
                <button 
                  className="action-button"
                  onClick={() => navigate('/my-grades')}
                >
                  Manage My Grades
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
