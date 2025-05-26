import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import { getEvaluationPlans, getCourses } from '../../services/dataService'
import useAuthStore from '../../store/authStore';
import '../../styles/Pages.css';

export default function EvaluationPlans() {
  const [evaluationPlans, setEvaluationPlans] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        const coursesData = await getCourses();
        setCourses(coursesData);
        
        let query = {};
        if (selectedSemester) query.semester = selectedSemester;
        if (selectedCourse) query.subject_code = selectedCourse;
        
        const plansData = await getEvaluationPlans(query);
        
        // Enrich plans with course names
        const enrichedPlans = plansData.map(plan => {
          const course = coursesData.find(c => c._id === plan.subject_code);
          return {
            ...plan,
            course_name: course ? course.title : 'Unknown Course'
          };
        });
        
        setEvaluationPlans(enrichedPlans);
      } catch (err) {
        console.error('Error fetching evaluation plans:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedSemester, selectedCourse]);

  const columns = [
    { key: 'subject_name', label: 'Course' },
    { key: 'semester', label: 'Semester' },
    { 
      key: 'activities', 
      label: 'Activities', 
      render: (row) => `${row.activities ? row.activities.length : 0} activities` 
    },
    { 
      key: 'created_by', 
      label: 'Created By',
      render: (row) => row.created_by === user?.id ? 'You' : 'Another Student'
    },
    { 
      key: 'updated_at', 
      label: 'Last Updated',
      render: (row) => new Date(row.updated_at).toLocaleDateString()
    }
  ];

  const handleRowClick = (plan) => {
    navigate(`/evaluation-plans/${plan._id}`);
  };

  const handleAddNew = () => {
    navigate('/evaluation-plans/new');
  };

  const semesters = ['2023-1', '2023-2', '2024-1', '2024-2'];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Evaluation Plans</h1>
        <div className="breadcrumbs">
          <span onClick={() => navigate('/')}>Dashboard</span> {'>'}
          <span className="current">Evaluation Plans</span>
        </div>
      </div>

      <div className="filters-container">
        <div className="filter-group">
          <label htmlFor="semester-filter">Semester:</label>
          <select 
            id="semester-filter" 
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
          >
            <option value="">All Semesters</option>
            {semesters.map(sem => (
              <option key={sem} value={sem}>{sem}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="course-filter">Course:</label>
          <select 
            id="course-filter" 
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>{course.title}</option>
            ))}
          </select>
        </div>
        
        <button className="action-button" onClick={handleAddNew}>
          Create New Plan
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading evaluation plans...</div>
      ) : error ? (
        <div className="error">Error: {error}</div>
      ) : (
        <DataTable
          title="Evaluation Plans"
          data={evaluationPlans}
          columns={columns}
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
