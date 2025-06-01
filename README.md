# TrackAcademic - Academic Performance Management System

A comprehensive web application for students to manage their academic performance, evaluation plans, and track their progress throughout different semesters.

## 🎯 Overview

TrackAcademic is a full-stack application that allows students to:
- Create and manage evaluation plans for their courses
- Track grades and calculate semester averages
- Generate academic performance reports
- Manage course enrollments and academic progress

## 🏗️ Architecture

This project implements a **polyglot persistence** architecture using:

### Frontend
- **React** with Vite for fast development
- **Zustand** for state management
- **React Router** for navigation
- **Supabase** for authentication

### Backend
- **Flask** (Python) REST API
- **MongoDB** for document-based data storage
- **PostgreSQL** (via Supabase) for user authentication

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:
- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **pip** (Python package manager)

### Environment Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd SID-PolyglotPersistence
   ```

2. **Set up environment variables:**
   - Copy `.env.local` and update with your credentials:
   ```bash
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_FLASK_API_URL=http://localhost:8000/api
   ```

3. **Backend setup:**
   ```bash
   cd backend
   pip install -r flask_requirements.txt
   ```
   
   Create a `.env` file in the backend directory:
   ```
   MONGO_URI=your_mongodb_connection_string
   MONGO_PASSWORD=your_mongodb_password
   DB_NAME=trackademic
   ADMIN_SECRET=admin_secret_key
   ```

### Running the Application

The easiest way to run both frontend and backend simultaneously:

```bash
npm install
npm run dev
```

This command will:
1. Install Python dependencies
2. Start the Flask backend on `http://localhost:8000`
3. Start the React frontend on `http://localhost:5173`

### Manual Setup (Alternative)

If you prefer to run each service separately:

**Backend:**
```bash
cd backend
python flask_app.py
```

**Frontend:**
```bash
npm install
npm run frontend
```

## 📱 How to Use the Application

### 1. Registration & Login
1. **Navigate to** `http://localhost:5173`
2. **Click "Register"** to create a new account
3. **Fill in your information:**
   - Full name
   - University email (`@u.icesi.edu.co`)
   - Student code (format: `A00123456`)
   - Current semester
   - Password (minimum 6 characters)
4. **Check your email** for verification (if using Supabase email confirmation)
5. **Login** with your credentials

### 2. Dashboard Overview
After logging in, you'll see the main dashboard with:
- Quick access to grades, evaluation plans, and reports
- Navigation menu for all features
- Your student information display

### 3. Managing Evaluation Plans
**Creating an Evaluation Plan:**
1. Go to **"Evaluation Plans"** → **"Create New Plan"**
2. **Select a course** from the available courses
3. **Choose the semester**
4. **Add evaluation activities:**
   - Activity name (e.g., "Midterm Exam")
   - Description (optional)
   - Percentage weight (must total 100%)
5. **Save the plan**

**Note:** If you create a plan for a course you're not enrolled in, the system will automatically enroll you as both student and instructor.

### 4. Recording Grades
1. Go to **"My Grades"**
2. **Select a semester**
3. **Choose a course** from your enrolled courses
4. **Enter grades** for each evaluation activity (0.0 - 5.0 scale)
5. **Save each grade** individually
6. **View your current course average** and completion percentage

### 5. Viewing Reports
1. Go to **"Semester Report"**
2. **Select the desired semester**
3. **Review:**
   - Overall semester average
   - Individual course performance
   - Completion status for each course
   - Passing/failing status

### 6. Course Management
The system automatically handles course enrollments when you create evaluation plans. You can view your enrolled courses in the "My Grades" section.

## 🎓 Academic Workflow Example

Here's a typical workflow for a student:

1. **Start of Semester:**
   - Register/Login to the platform
   - Create evaluation plans for your courses
   - Define how each course will be evaluated (exams, projects, etc.)

2. **During Semester:**
   - Record grades as you receive them
   - Monitor your progress in "My Grades"
   - View real-time course averages

3. **End of Semester:**
   - Check "Semester Report" for overall performance
   - Review which courses you're passing/failing
   - Plan for next semester

## 🛠️ Key Features

### Academic Management
- **Evaluation Plans:** Define custom grading schemes for each course
- **Grade Tracking:** Record and monitor academic performance
- **Semester Reports:** Comprehensive academic performance analysis
- **Auto-enrollment:** Automatic course registration when creating plans

### Technical Features
- **Responsive Design:** Works on desktop and mobile devices
- **Real-time Calculations:** Instant grade and average updates
- **Data Persistence:** MongoDB for flexible academic data storage
- **Secure Authentication:** Supabase-powered user management

## 🔧 Development

### Project Structure
```
SID-PolyglotPersistence/
├── backend/
│   ├── flask_app.py          # Main Flask application
│   └── flask_requirements.txt # Python dependencies
├── src/
│   ├── components/           # Reusable React components
│   ├── pages/               # Page components
│   ├── services/            # API service functions
│   ├── store/               # Zustand state management
│   └── styles/              # CSS files
├── package.json             # Node.js dependencies
└── README.md               # This file
```

### API Endpoints
The Flask backend provides RESTful endpoints for:
- `/api/courses` - Course management
- `/api/evaluation-plans` - Evaluation plan CRUD
- `/api/student-grades` - Grade management
- `/api/student-courses` - Student enrollment management

### Database Schema
**MongoDB Collections:**
- `courses` - Available courses catalog
- `evaluation_plans` - Custom grading schemes
- `student_courses` - Student enrollments
- `student_grades` - Individual grade records
- `plan_comments` - Comments on evaluation plans

## 🚨 Troubleshooting

### Common Issues

1. **Backend not starting:**
   - Check if Python and pip are installed
   - Verify MongoDB connection string
   - Ensure all dependencies are installed

2. **Frontend build errors:**
   - Run `npm install` to ensure all dependencies are installed
   - Check if Node.js version is compatible

3. **Authentication issues:**
   - Verify Supabase credentials in `.env.local`
   - Check if email domain is allowed (`@u.icesi.edu.co`)

4. **Grade calculations not working:**
   - Ensure evaluation plans total 100%
   - Check if student is enrolled in the course
   - Verify grade values are between 0.0 and 5.0

### Demo Data
For testing purposes, the application includes demo data for student `A00377013`. You can reset and reseed this data using the admin controls (if enabled).

---

**Built with ❤️ for academic excellence**