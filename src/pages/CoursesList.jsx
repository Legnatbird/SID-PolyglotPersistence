import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable';
import { getCourses } from '../services/mongoDataService';
import useMongoStore from '../store/mongoStore';
import '../styles/Pages.css';

export default function CoursesList() {
  const [courses, setCourses] = useState([]);
  const { loading, error, clearError } = useMongoStore();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchCourses() {
      try {
        clearError();
        const data = await getCourses();
        setCourses(data);
      } catch (err) {
        console.error('Error fetching courses:', err);
      }
    }

    fetchCourses();
  }, [clearError]);

  const columns = [
    { key: 'code', label: 'Course Code' },
    { key: 'title', label: 'Course Title' },
    { key: 'instructor', label: 'Instructor' },
    { key: 'credits', label: 'Credits' }
  ];

  const handleRowClick = (course) => {
    navigate(`/courses/${course._id}`);
  };

  if (loading) return <div className="loading">Loading courses...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Courses</h1>
        <div className="breadcrumbs">
          <span onClick={() => navigate('/')}>Dashboard</span> {'>'}
          <span className="current">Courses</span>
        </div>
      </div>

      <DataTable
        title="Courses List"
        data={courses}
        columns={columns}
        onRowClick={handleRowClick}
      />
    </div>
  );
}
