import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getStudentGradesBySemester,
  getStudentCoursesByStudent,
  getCourseById,
  resetAndReseedDemoData
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
  const [courseDetails, setCourseDetails] = useState({});
  const [overallAverage, setOverallAverage] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  
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
    async function fetchSemesterData() {
      if (!user || !studentCode) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching data for student ${studentCode} and semester ${selectedSemester}`);
        
        const courses = await getStudentCoursesByStudent(studentCode, selectedSemester);
        console.log("Found courses:", courses);
        
        setDebugInfo(prev => ({
          ...prev,
          studentId: studentCode,
          semester: selectedSemester,
          courseCount: courses.length,
          courses: courses
        }));
        
        if (courses.length === 0) {
          console.log("No courses found for this student and semester");
          setLoading(false);
          return;
        }
        
        const gradesData = await getStudentGradesBySemester(studentCode, selectedSemester);
        console.log("Found grades:", gradesData);
        
        setDebugInfo(prev => ({
          ...prev,
          gradesCount: Array.isArray(gradesData) ? gradesData.length : (gradesData ? 1 : 0),
          grades: gradesData
        }));
        
        const courseDetailsMap = {};
        await Promise.all(courses.map(async (course) => {
          const details = await getCourseById(course.subject_code);
          courseDetailsMap[course.subject_code] = details;
        }));
        
        setCourseDetails(courseDetailsMap);
        
        const courseGrades = {};
        courses.forEach(course => {
          courseGrades[course.subject_code] = {
            courseId: course.subject_code,
            courseName: courseDetailsMap[course.subject_code]?.title || course.subject_name || 'Unknown Course',
            grades: [],
            finalGrade: 0,
            totalPercentage: 0
          };
        });

        if (Array.isArray(gradesData)) {
          gradesData.forEach(grade => {
            if (courseGrades[grade.subject_code]) {
              courseGrades[grade.subject_code].grades.push(grade);
            }
          });
          
          Object.values(courseGrades).forEach(course => {
            let weightedSum = 0;
            let totalPercentage = 0;
            
            course.grades.forEach(grade => {
              const weight = parseFloat(grade.activity_percentage || 0) / 100;
              weightedSum += parseFloat(grade.grade) * weight;
              totalPercentage += parseFloat(grade.activity_percentage || 0);
            });
            
            course.finalGrade = weightedSum;
            course.totalPercentage = totalPercentage;
          });
        } else {
          gradesData.forEach(gradeObj => {
            if (courseGrades[gradeObj.subject_code]) {
              courseGrades[gradeObj.subject_code].finalGrade = parseFloat(gradeObj.calculated_grade);
              courseGrades[gradeObj.subject_code].totalPercentage = 100; // Assume 100% if we have calculated grade
              
              if (gradeObj.grades && Array.isArray(gradeObj.grades)) {
                courseGrades[gradeObj.subject_code].grades = gradeObj.grades;
              }
            }
          });
        }

        const coursesWithGrades = Object.values(courseGrades).filter(
          course => course.finalGrade > 0 || course.grades.length > 0
        );
        
        if (coursesWithGrades.length > 0) {
          const sum = coursesWithGrades.reduce(
            (total, course) => total + course.finalGrade, 
            0
          );
          setOverallAverage(sum / coursesWithGrades.length);
        } else {
          setOverallAverage(null);
        }
        
        setSemesterGrades(Object.values(courseGrades));
        
      } catch (err) {
        console.error('Error fetching semester data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSemesterData();
  }, [user, selectedSemester, studentCode]);
  
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
                  <h2>Semester Average: <span>{overallAverage.toFixed(2)}</span></h2>
                  <div className="grade-status">
                    {overallAverage >= 3.0 ? (
                      <span className="passing">Passing</span>
                    ) : (
                      <span className="failing">Failing</span>
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
                          <td className={course.finalGrade >= 3.0 ? 'passing' : 'failing'}>
                            {course.finalGrade.toFixed(2)}
                          </td>
                          <td>
                            <div className="completion-bar">
                              <div 
                                className="completion-fill" 
                                style={{ width: `${course.totalPercentage}%` }}
                              ></div>
                            </div>
                            <span>{course.totalPercentage}%</span>
                          </td>
                          <td>
                            {course.finalGrade >= 3.0 ? (
                              <span className="status passing">Passing</span>
                            ) : (
                              <span className="status failing">Failing</span>
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
