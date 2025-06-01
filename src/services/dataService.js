import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const API_BASE_URL = import.meta.env.VITE_FLASK_API_URL || 'http://localhost:8000/api';

const apiRequest = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request error for ${endpoint}:`, error);
    throw error;
  }
};

export const getCountries = async () => {
  const { data, error } = await supabase.from('countries').select('*');
  if (error) throw error;
  return data;
};

export const getDepartments = async (countryCode = null) => {
  let query = supabase.from('departments').select('*');
  if (countryCode) query = query.eq('country_code', countryCode);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getCities = async (deptCode = null) => {
  let query = supabase.from('cities').select('*');
  if (deptCode) query = query.eq('dept_code', deptCode);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getCampuses = async (cityCode = null) => {
  let query = supabase.from('campuses').select('*');
  if (cityCode) query = query.eq('city_code', cityCode);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getFaculties = async () => {
  const { data, error } = await supabase
    .from('faculties')
    .select(`
      *,
      employees (first_name, last_name)
    `);
  if (error) throw error;
  return data;
};

export const getAreas = async (facultyCode = null) => {
  let query = supabase
    .from('areas')
    .select(`
      *,
      faculties (name),
      employees (first_name, last_name)
    `);
  if (facultyCode) query = query.eq('faculty_code', facultyCode);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getPrograms = async (areaCode = null) => {
  let query = supabase
    .from('programs')
    .select(`
      *,
      areas (name)
    `);
  if (areaCode) query = query.eq('area_code', areaCode);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getSubjects = async (programCode = null) => {
  let query = supabase
    .from('subjects')
    .select(`
      *,
      programs (name)
    `);
  if (programCode) query = query.eq('program_code', programCode);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getGroups = async (subjectCode = null, semester = null) => {
  let query = supabase
    .from('groups')
    .select(`
      *,
      subjects (name),
      employees (first_name, last_name)
    `);
  
  if (subjectCode) query = query.eq('subject_code', subjectCode);
  if (semester) query = query.eq('semester', semester);
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getEmployees = async (filters = {}) => {
  let query = supabase
    .from('employees')
    .select(`
      *,
      contract_types (name),
      employee_types (name),
      faculties (name),
      campuses (name),
      cities (name)
    `);
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query = query.eq(key, value);
  });
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getEmployeeTypes = async () => {
  const { data, error } = await supabase.from('employee_types').select('*');
  if (error) throw error;
  return data;
};

export const getContractTypes = async () => {
  const { data, error } = await supabase.from('contract_types').select('*');
  if (error) throw error;
  return data;
};

export const getCourses = async (query = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) queryParams.append(key, value);
  });
  
  const endpoint = `/courses${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return await apiRequest(endpoint);
};

export const getCourseById = async (id) => {
  return await apiRequest(`/courses/${id}`);
};

export const createCourse = async (courseData) => {
  return await apiRequest('/courses', {
    method: 'POST',
    body: JSON.stringify(courseData)
  });
};

export const updateCourse = async (id, courseData) => {
  return await apiRequest(`/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(courseData)
  });
};

export const deleteCourse = async (id) => {
  return await apiRequest(`/courses/${id}`, {
    method: 'DELETE'
  });
};

export const getEvaluationPlans = async (query = {}) => {
  const queryParams = new URLSearchParams();
  if (query.subject_code) queryParams.append('subject_code', query.subject_code);
  if (query.semester) queryParams.append('semester', query.semester);
  if (query.created_by) queryParams.append('created_by', query.created_by);
  
  const endpoint = `/evaluation-plans${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return await apiRequest(endpoint);
};

export const getEvaluationPlanById = async (id) => {
  return await apiRequest(`/evaluation-plans/${id}`);
};

export const getEvaluationPlansByCourse = async (courseId, semester) => {
  const queryParams = new URLSearchParams();
  queryParams.append('subject_code', courseId);
  if (semester) queryParams.append('semester', semester);
  
  return await apiRequest(`/evaluation-plans?${queryParams.toString()}`);
};

export const createEvaluationPlan = async (planData) => {
  if (!validateEvaluationPlanPercentages(planData.activities)) {
    throw new Error('Evaluation activities must sum to 100%');
  }
  
  return await apiRequest('/evaluation-plans', {
    method: 'POST',
    body: JSON.stringify(planData)
  });
};

export const updateEvaluationPlan = async (id, planData) => {
  if (planData.activities) {
    if (!validateEvaluationPlanPercentages(planData.activities)) {
      throw new Error('Evaluation activities must sum to 100%');
    }
  }
  
  return await apiRequest(`/evaluation-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(planData)
  });
};

export const deleteEvaluationPlan = async (id) => {
  return await apiRequest(`/evaluation-plans/${id}`, {
    method: 'DELETE'
  });
};

export const getStudentGrades = async (query = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    queryParams.append(key, value);
  });
  
  const endpoint = `/student-grades${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return await apiRequest(endpoint);
};

export const getStudentGradeById = async (id) => {
  return await apiRequest(`/student-grades/${id}`);
};

export const getStudentGradesByPlan = async (evaluationPlanId, studentId) => {
  const queryParams = new URLSearchParams();
  queryParams.append('evaluation_plan_id', evaluationPlanId);
  if (studentId) queryParams.append('student_id', studentId);
  
  return await apiRequest(`/student-grades?${queryParams.toString()}`);
};

export const getStudentGradesBySemester = async (studentId, semester) => {
  try {
    const endpoint = `/student-grades/semester/${studentId}/${semester}`;
    return await apiRequest(endpoint);
  } catch (error) {
    console.error('Error fetching semester grades:', error);
    throw error;
  }
};

export const createStudentGrade = async (gradeData) => {
  return await apiRequest('/student-grades', {
    method: 'POST',
    body: JSON.stringify(gradeData)
  });
};

export const updateStudentGrade = async (id, gradeData) => {
  return await apiRequest(`/student-grades/${id}`, {
    method: 'PUT',
    body: JSON.stringify(gradeData)
  });
};

export const deleteStudentGrade = async (id) => {
  return await apiRequest(`/student-grades/${id}`, {
    method: 'DELETE'
  });
};

export const getStudentCourses = async (query = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    queryParams.append(key, value);
  });
  
  const endpoint = `/student-courses${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return await apiRequest(endpoint);
};

export const getStudentCourseById = async (id) => {
  return await apiRequest(`/student-courses/${id}`);
};

export const getStudentCoursesByStudent = async (studentId, semester) => {
  const queryParams = new URLSearchParams();
  queryParams.append('student_id', studentId);
  if (semester) queryParams.append('semester', semester);
  
  return await apiRequest(`/student-courses?${queryParams.toString()}`);
};

export const createStudentCourse = async (courseData) => {
  return await apiRequest('/student-courses', {
    method: 'POST',
    body: JSON.stringify(courseData)
  });
};

export const updateStudentCourse = async (id, courseData) => {
  return await apiRequest(`/student-courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(courseData)
  });
};

export const deleteStudentCourse = async (id) => {
  return await apiRequest(`/student-courses/${id}`, {
    method: 'DELETE'
  });
};

export const getPlanComments = async (query = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    queryParams.append(key, value);
  });
  
  const endpoint = `/plan-comments${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return await apiRequest(endpoint);
};

export const getPlanCommentById = async (id) => {
  return await apiRequest(`/plan-comments/${id}`);
};

export const getPlanCommentsByPlan = async (evaluationPlanId) => {
  return await apiRequest(`/plan-comments?evaluation_plan_id=${evaluationPlanId}`);
};

export const createPlanComment = async (commentData) => {
  return await apiRequest('/plan-comments', {
    method: 'POST',
    body: JSON.stringify(commentData)
  });
};

export const updatePlanComment = async (id, commentData) => {
  return await apiRequest(`/plan-comments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(commentData)
  });
};

export const deletePlanComment = async (id) => {
  return await apiRequest(`/plan-comments/${id}`, {
    method: 'DELETE'
  });
};

export const validateEvaluationPlanPercentages = (activities) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return false;
  }
  
  const totalPercentage = activities.reduce((sum, activity) => {
    return sum + (parseFloat(activity.percentage) || 0);
  }, 0);
  
  return Math.abs(totalPercentage - 100) < 0.1;
};

export const calculateFinalGrade = (activities, gradeData) => {
  if (!activities || !gradeData) return null;
  
  if (gradeData.calculated_grade !== undefined) {
    return {
      currentGrade: parseFloat(gradeData.calculated_grade),
      completedPercentage: 100
    };
  }
  
  if (Array.isArray(gradeData.grades)) {
    let finalGrade = 0;
    let totalPercentageWithGrades = 0;
    
    activities.forEach(activity => {
      const grade = gradeData.grades.find(g => g.activity_id === activity.id);
      if (grade) {
        finalGrade += (parseFloat(grade.grade) * parseFloat(activity.percentage)) / 100;
        totalPercentageWithGrades += parseFloat(activity.percentage);
      }
    });
    
    return {
      currentGrade: finalGrade,
      completedPercentage: totalPercentageWithGrades
    };
  }
  
  let finalGrade = 0;
  let totalPercentageWithGrades = 0;
  
  activities.forEach(activity => {
    const grade = Array.isArray(gradeData) 
      ? gradeData.find(g => g.activity_id === activity.id)
      : null;
    
    if (grade) {
      finalGrade += (parseFloat(grade.grade) * parseFloat(activity.percentage)) / 100;
      totalPercentageWithGrades += parseFloat(activity.percentage);
    }
  });
  
  return {
    currentGrade: finalGrade,
    completedPercentage: totalPercentageWithGrades
  };
};

export const resetAndReseedDemoData = async (adminKey) => {
  try {
    return await apiRequest('/seed-data', {
      method: 'POST',
      headers: {
        'X-Admin-Key': adminKey || import.meta.env.VITE_ADMIN_SECRET || 'admin_secret_key'
      }
    });
  } catch (error) {
    console.error('Failed to reseed data:', error);
    throw error;
  }
};
