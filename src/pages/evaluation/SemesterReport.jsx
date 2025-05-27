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
  
  // Cache for API requests
  const requestCacheRef = useRef({});
  
  // Memoized API request function with caching
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
      // Clear cache on data reset
      requestCacheRef.current = {};
      window.location.reload();
    } catch (err) {
      console.error('Error resetting data:', err);
      setError('Failed to reset data: ' + err.message);
    }
  }, []);
  
  // Single fetch function to get all course details and evaluation plans at once
  const fetchCourseDetailsAndPlans = useCallback(async (courses, semester) => {
    const courseDetailsMap = {};
    const evaluationPlansMap = {};
    
    // Create batches of promises to avoid too many concurrent requests
    const batchSize = 5;
    let promises = [];
    
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      
      // Add course details promise
      const detailsKey = `course-${course.subject_code}`;
      promises.push(
        cachedRequest(detailsKey, () => getCourseById(course.subject_code))
          .then(details => {
            courseDetailsMap[course.subject_code] = details;
          })
      );
      
      // Add evaluation plans promise
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
      
      // Process in batches to avoid overwhelming the browser
      if (promises.length >= batchSize || i === courses.length - 1) {
        await Promise.all(promises);
        promises = [];
      }
    }
    
    return { courseDetailsMap, evaluationPlansMap };
  }, [cachedRequest]);
  
  // Process grades with evaluation plans
  const processGrades = useCallback((courses, gradesData, courseDetailsMap, evaluationPlansMap) => {
    // Initialize course grades objects
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
    
    // Initialize valid grades counter for average calculation
    let validGradeSum = 0;
    let validGradeCount = 0;

    // Process grade data
    if (Array.isArray(gradesData)) {
      // Handle individual grade entries
      gradesData.forEach(grade => {
        const courseId = grade.subject_code;
        if (courseGrades[courseId]) {
          courseGrades[courseId].grades.push(grade);
        }
      });
      
      // Calculate grades for each course with its evaluation plan
      Object.values(courseGrades).forEach(course => {
        if (course.evaluationPlan && course.evaluationPlan.activities) {
          let weightedSum = 0;
          let totalPercentageWithGrades = 0;
          const totalPlanPercentage = course.evaluationPlan.activities.reduce(
            (sum, activity) => sum + parseFloat(activity.percentage || 0), 0
          );
          
          course.evaluationPlan.activities.forEach(activity => {
            const activityId = activity._id;
            
            const grade = course.grades[0]?.grades.find(g => {
              const matches = g.activity_id === activityId;
              return matches;
            });
            
            if (grade) {
              const gradeValue = parseFloat(grade.grade);
              const percentage = parseFloat(activity.percentage || 0);
              
              if (!isNaN(gradeValue) && !isNaN(percentage)) {
                weightedSum += gradeValue * (percentage / 100);
                totalPercentageWithGrades += percentage;
              }
            }
          });
          
          // Set the calculated values
          course.finalGrade = totalPercentageWithGrades > 0 ? 
            weightedSum : 0;
          
          // Calculate percentage completion based on the total possible percentage
          course.totalPercentage = totalPlanPercentage > 0 ?
            Math.min((totalPercentageWithGrades / totalPlanPercentage) * 100, 100) : 0;
          
          // Add to overall average if we have a grade
          if (course.finalGrade > 0) {
            validGradeSum += course.finalGrade;
            validGradeCount++;
          }
        }
      });
    } else if (typeof gradesData === 'object' && gradesData !== null) {
      // Handle course-level grade objects - assume it's an array of objects or a single object
      const gradesArray = Array.isArray(gradesData) ? gradesData : [gradesData];
      
      gradesArray.forEach(gradeObj => {
        const courseId = gradeObj.subject_code;
        
        if (courseGrades[courseId]) {
          // If we have a calculated grade, use it directly
          if (gradeObj.calculated_grade !== undefined) {
            const finalGrade = parseFloat(gradeObj.calculated_grade);
            courseGrades[courseId].finalGrade = finalGrade;
            
            // Store the grades for reference
            if (gradeObj.grades && Array.isArray(gradeObj.grades)) {
              courseGrades[courseId].grades = gradeObj.grades;
            }
            
            // Use actual completion percentage if available
            if (courseGrades[courseId].evaluationPlan && courseGrades[courseId].evaluationPlan.activities) {
              // Calculate completion based on how many activities have grades
              const totalActivities = courseGrades[courseId].evaluationPlan.activities.length;
              let gradedActivitiesCount = 0;
              let totalGradedPercentage = 0;
              
              // Count activities with grades
              if (gradeObj.grades && Array.isArray(gradeObj.grades)) {
                courseGrades[courseId].evaluationPlan.activities.forEach(activity => {
                  const activityId = activity._id || activity.id;
                  const hasGrade = gradeObj.grades.some(g => g.activity_id === activityId);
                  
                  if (hasGrade) {
                    gradedActivitiesCount++;
                    totalGradedPercentage += parseFloat(activity.percentage || 0);
                  }
                });
                
                // Calculate percentage based on the percentage value of graded activities
                const totalPlanPercentage = courseGrades[courseId].evaluationPlan.activities.reduce(
                  (sum, activity) => sum + parseFloat(activity.percentage || 0), 0
                );
                
                courseGrades[courseId].totalPercentage = totalPlanPercentage > 0 ?
                  (totalGradedPercentage / totalPlanPercentage) * 100 : 0;
              } else {
                // If no detailed grades, estimate from activity count
                courseGrades[courseId].totalPercentage = totalActivities > 0 ?
                  (gradedActivitiesCount / totalActivities) * 100 : 0;
              }
            } else {
              courseGrades[courseId].totalPercentage = 100; // Default to 100% if no evaluation plan
            }
            
            // Add to valid grades for average calculation
            if (!isNaN(finalGrade)) {
              validGradeSum += finalGrade;
              validGradeCount++;
            }
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
