import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv
import json
from datetime import datetime
import uuid


load_dotenv()

app = Flask(__name__)
CORS(app)

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://legnatbrid:<db_password>@trackademicdata.rynpthj.mongodb.net/?retryWrites=true&w=majority&appName=TrackademicData")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD", "")
MONGO_URI = MONGO_URI.replace("<db_password>", MONGO_PASSWORD)
DB_NAME = os.getenv("DB_NAME", "trackademic")


client = MongoClient(MONGO_URI)
db = client[DB_NAME]


class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return json.JSONEncoder.default(self, obj)


app.json_encoder = JSONEncoder


@app.route('/')
def index():
    return jsonify({"message": "Welcome to TrackAcademic API"})


@app.route('/api/courses', methods=['GET'])
def get_courses():
    title = request.args.get('title')
    code = request.args.get('code')
    
    query = {}
    if title:
        query["title"] = {"$regex": title, "$options": "i"}
    if code:
        query["code"] = {"$regex": code, "$options": "i"}
    
    courses = list(db.student_courses.find(query))
    return jsonify(courses)

@app.route('/api/courses/<subject_code>', methods=['GET'])
def get_course(subject_code):
    course = db.student_courses.find_one({"subject_code": subject_code})
    if not course:
        return jsonify({"error": f"Course {subject_code} not found"}), 404
    return jsonify(course)

@app.route('/api/courses', methods=['POST'])
def create_course():
    course_data = request.json
    course_data["_id"] = str(uuid.uuid4())
    course_data["created_at"] = datetime.now()
    course_data["updated_at"] = datetime.now()
    
    db.student_courses.insert_one(course_data)
    created_course = db.student_courses.find_one({"_id": course_data["_id"]})
    return jsonify(created_course), 201

@app.route('/api/courses/<subject_code>', methods=['PUT'])
def update_course(subject_code):
    course_data = request.json
    course_data["updated_at"] = datetime.now()
    
    result = db.student_courses.update_one({"_id": subject_code}, {"$set": course_data})
    if result.matched_count == 0:
        return jsonify({"error": f"Course {subject_code} not found"}), 404
    
    updated_course = db.student_courses.find_one({"_id": subject_code})
    return jsonify(updated_course)

@app.route('/api/courses/<subject_code>', methods=['DELETE'])
def delete_course(subject_code):
    result = db.student_courses.delete_one({"_id": subject_code})
    if result.deleted_count == 0:
        return jsonify({"error": f"Course {subject_code} not found"}), 404
    
    return jsonify({"success": True, "message": f"Course {subject_code} deleted"})


@app.route('/api/evaluation-plans', methods=['GET'])
def get_evaluation_plans():
    subject_code = request.args.get('subject_code')
    semester = request.args.get('semester')
    created_by = request.args.get('created_by')
    
    query = {}
    if subject_code:
        query["subject_code"] = subject_code
    if semester:
        query["semester"] = semester
    if created_by:
        query["created_by"] = created_by
    
    plans = list(db.evaluation_plans.find(query))
    for plan in plans:
        if "subject_code" in plan:
            course = db.student_courses.find_one({"subject_code": plan["subject_code"]})
            if course:
                plan["subject_name"] = course["subject_name"]
            else:
                plan["subject_name"] = "Unknown Course"
    
    return jsonify(plans)


@app.route('/api/student-grades/semester/<student_id>/<semester>', methods=['GET'])
def get_student_grades_by_semester(student_id, semester):
    student_courses = list(db.student_courses.find({
        "student_id": student_id,
        "semester": semester
    }))
    
    subject_codes = [course["subject_code"] for course in student_courses]
    
    if not subject_codes:
        return jsonify([])
    
    grades = list(db.student_grades.find({
        "student_id": student_id,
        "subject_code": {"$in": subject_codes}
    }))
    
    return jsonify(grades)

@app.route('/api/seed-data', methods=['POST'])
def seed_data():
    secret_key = request.headers.get('X-Admin-Key')
    if secret_key != os.getenv('ADMIN_SECRET', 'admin_secret_key'):
        return jsonify({"error": "Unauthorized"}), 401
    
    db.student_courses.delete_many({})
    db.evaluation_plans.delete_many({})
    db.student_courses.delete_many({})
    db.student_grades.delete_many({})
    db.plan_comments.delete_many({})
    
    courses = [
        {
            "_id": "course1",
            "title": "Introduction to Programming",
            "code": "CS101",
            "credits": 3
        },
        {
            "_id": "course2",
            "title": "Data Structures",
            "code": "CS201",
            "credits": 4
        },
        {
            "_id": "course3",
            "title": "Algorithms",
            "code": "CS302",
            "credits": 4
        },
        {
            "_id": "course4",
            "title": "Database Systems",
            "code": "CS403",
            "credits": 3
        }
    ]
    db.student_courses.insert_many(courses)
    
    evaluation_plans = [
        {
            "_id": "plan1",
            "subject_code": "CS101",
            "semester": "2024-1",
            "created_by": "A00377013",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "activities": [
                { "id": "act1", "name": "Midterm Exam", "description": "Written exam", "percentage": 30 },
                { "id": "act2", "name": "Final Project", "description": "Group project", "percentage": 40 },
                { "id": "act3", "name": "Assignments", "description": "Weekly homework", "percentage": 30 }
            ]
        },
        {
            "_id": "plan2",
            "subject_code": "CS201",
            "semester": "2024-1",
            "created_by": "A00377013",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "activities": [
                { "id": "act4", "name": "Quiz 1", "description": "First quiz", "percentage": 15 },
                { "id": "act5", "name": "Quiz 2", "description": "Second quiz", "percentage": 15 },
                { "id": "act6", "name": "Midterm Exam", "description": "Written exam", "percentage": 30 },
                { "id": "act7", "name": "Final Exam", "description": "Comprehensive exam", "percentage": 40 }
            ]
        }
    ]
    db.evaluation_plans.insert_many(evaluation_plans)
    
    student_courses = [
        {
            "_id": "sc1",
            "student_id": "A00377013",
            "subject_code": "CS101",
            "subject_name": "Introduction to Programming",
            "semester": "2024-1",
            "professor_id": "1001",
            "professor_name": "John Doe",
            "enrollment_date": datetime.now(),
            "status": "active",
            "group_id": "1-CS101-2024-1"
        },
        {
            "_id": "sc2",
            "student_id": "A00377013",
            "subject_code": "CS201",
            "subject_name": "Data Structures",
            "semester": "2024-1",
            "professor_id": "1002",
            "professor_name": "Jane Smith",
            "enrollment_date": datetime.now(),
            "status": "active",
            "group_id": "1-CS201-2024-1"
        }
    ]
    db.student_courses.insert_many(student_courses)
    
    student_grades = [
        {
            "_id": "grade1",
            "student_id": "A00377013",
            "subject_code": "CS101",
            "evaluation_plan_id": "plan1",
            "activity_id": "act1",
            "activity_name": "Midterm Exam",
            "grade": 4.2,
            "activity_percentage": 30,
            "semester": "2024-1",
            "created_at": datetime.now()
        },
        {
            "_id": "grade2",
            "student_id": "A00377013",
            "subject_code": "CS101",
            "evaluation_plan_id": "plan1",
            "activity_id": "act3",
            "activity_name": "Assignments",
            "grade": 4.5,
            "activity_percentage": 30,
            "semester": "2024-1",
            "created_at": datetime.now()
        },
        {
            "_id": "grade3",
            "student_id": "A00377013",
            "subject_code": "CS201",
            "evaluation_plan_id": "plan2",
            "activity_id": "act4",
            "activity_name": "Quiz 1",
            "grade": 3.8,
            "activity_percentage": 15,
            "semester": "2024-1",
            "created_at": datetime.now()
        }
    ]
    db.student_grades.insert_many(student_grades)
    
    return jsonify({"message": "Demo data has been seeded for student A00377013"})

@app.route('/api/student-grades', methods=['GET'])
def get_student_grades():

    evaluation_plan_id = ObjectId(request.args.get('evaluation_plan_id'))
    student_id = request.args.get('student_id')
    activity_id = request.args.get('activity_id')
    subject_code = request.args.get('subject_code')
    
    query = {}
    if evaluation_plan_id:
        query["evaluation_plan_id"] = evaluation_plan_id
    if student_id:
        query["student_id"] = student_id
    if activity_id:
        query["activity_id"] = activity_id
    if subject_code:
        query["subject_code"] = subject_code
    grades = list(db.student_grades.find(query))
    for grade in grades:
        if "subject_code" in grade:
            course = db.student_courses.find_one({"subject_code": grade["subject_code"]})
            if course:
                grade["subject_name"] = course["subject_name"]
            else:
                grade["subject_name"] = "Unknown Course"
    return jsonify(grades)

@app.route('/api/student-grades/<grade_id>', methods=['GET'])
def get_student_grade(grade_id):
    grade = db.student_grades.find_one({"_id": grade_id})
    if not grade:
        return jsonify({"error": f"Grade {grade_id} not found"}), 404
    return jsonify(grade)

@app.route('/api/student-grades', methods=['POST'])
def create_student_grade():
    grade_data = request.json
    if "_id" not in grade_data:
        grade_data["_id"] = str(uuid.uuid4())
    grade_data["created_at"] = datetime.now()
    
    db.student_grades.insert_one(grade_data)
    created_grade = db.student_grades.find_one({"_id": grade_data["_id"]})
    return jsonify(created_grade), 201

@app.route('/api/student-grades/<grade_id>', methods=['PUT'])
def update_student_grade(grade_id):
    grade_data = request.json
    
    result = db.student_grades.update_one({"_id": grade_id}, {"$set": grade_data})
    if result.matched_count == 0:
        return jsonify({"error": f"Grade {grade_id} not found"}), 404
    
    updated_grade = db.student_grades.find_one({"_id": grade_id})
    return jsonify(updated_grade)

@app.route('/api/student-grades/<grade_id>', methods=['DELETE'])
def delete_student_grade(grade_id):
    result = db.student_grades.delete_one({"_id": grade_id})
    if result.deleted_count == 0:
        return jsonify({"error": f"Grade {grade_id} not found"}), 404
    
    return jsonify({"success": True, "message": f"Grade {grade_id} deleted"})

@app.route('/api/evaluation-plans/<plan_id>', methods=['GET'])
def get_evaluation_plan(plan_id):
    plan_id = ObjectId(plan_id) if ObjectId.is_valid(plan_id) else plan_id
    plan = db.evaluation_plans.find_one({"_id": plan_id})
    if not plan:
        return jsonify({"error": f"Evaluation plan {plan_id} not found"}), 404
    return jsonify(plan)

@app.route('/api/evaluation-plans', methods=['POST'])
def create_evaluation_plan():
    plan_data = request.json
    if "_id" not in plan_data:
        plan_data["_id"] = str(uuid.uuid4())
    plan_data["created_at"] = datetime.now()
    plan_data["updated_at"] = datetime.now()
    
    db.evaluation_plans.insert_one(plan_data)
    created_plan = db.evaluation_plans.find_one({"_id": plan_data["_id"]})
    return jsonify(created_plan), 201

@app.route('/api/evaluation-plans/<plan_id>', methods=['PUT'])
def update_evaluation_plan(plan_id):
    plan_data = request.json
    plan_data["updated_at"] = datetime.now()
    
    result = db.evaluation_plans.update_one({"_id": plan_id}, {"$set": plan_data})
    if result.matched_count == 0:
        return jsonify({"error": f"Evaluation plan {plan_id} not found"}), 404
    
    updated_plan = db.evaluation_plans.find_one({"_id": plan_id})
    return jsonify(updated_plan)

@app.route('/api/evaluation-plans/<plan_id>', methods=['DELETE'])
def delete_evaluation_plan(plan_id):
    result = db.evaluation_plans.delete_one({"_id": plan_id})
    if result.deleted_count == 0:
        return jsonify({"error": f"Evaluation plan {plan_id} not found"}), 404
    
    return jsonify({"success": True, "message": f"Evaluation plan {plan_id} deleted"})

@app.route('/api/student-courses', methods=['GET'])
def get_student_courses():
    student_id = request.args.get('student_id')
    semester = request.args.get('semester')
    subject_code = request.args.get('subject_code')
    
    query = {}
    if student_id:
        query["student_id"] = student_id
    if subject_code:
        query["subject_code"] = subject_code
    if semester:
        query["semester"] = semester
    
    courses = list(db.student_courses.find(query))
    return jsonify(courses)

@app.route('/api/student-courses/<subject_code>', methods=['GET'])
def get_student_course(subject_code):
    course = db.student_courses.find_one({"_id": subject_code})
    if not course:
        return jsonify({"error": f"Student course {subject_code} not found"}), 404
    return jsonify(course)

@app.route('/api/student-courses', methods=['POST'])
def create_student_course():
    course_data = request.json
    if "_id" not in course_data:
        course_data["_id"] = str(uuid.uuid4())
    
    db.student_courses.insert_one(course_data)
    created_course = db.student_courses.find_one({"_id": course_data["_id"]})
    return jsonify(created_course), 201

@app.route('/api/student-courses/<subject_code>', methods=['PUT'])
def update_student_course(subject_code):
    course_data = request.json
    
    result = db.student_courses.update_one({"_id": subject_code}, {"$set": course_data})
    if result.matched_count == 0:
        return jsonify({"error": f"Student course {subject_code} not found"}), 404
    
    updated_course = db.student_courses.find_one({"_id": subject_code})
    return jsonify(updated_course)

@app.route('/api/student-courses/<subject_code>', methods=['DELETE'])
def delete_student_course(subject_code):
    result = db.student_courses.delete_one({"_id": subject_code})
    if result.deleted_count == 0:
        return jsonify({"error": f"Student course {subject_code} not found"}), 404
    
    return jsonify({"success": True, "message": f"Student course {subject_code} deleted"})

@app.route('/api/plan-comments', methods=['GET'])
def get_plan_comments():
    evaluation_plan_id = request.args.get('evaluation_plan_id')
    
    query = {}
    if evaluation_plan_id:
        query["evaluation_plan_id"] = evaluation_plan_id
    
    comments = list(db.plan_comments.find(query))
    return jsonify(comments)

@app.route('/api/plan-comments/<comment_id>', methods=['GET'])
def get_plan_comment(comment_id):
    comment = db.plan_comments.find_one({"_id": comment_id})
    if not comment:
        return jsonify({"error": f"Comment {comment_id} not found"}), 404
    return jsonify(comment)

@app.route('/api/plan-comments', methods=['POST'])
def create_plan_comment():
    comment_data = request.json
    if "_id" not in comment_data:
        comment_data["_id"] = str(uuid.uuid4())
    comment_data["created_at"] = datetime.now()
    
    db.plan_comments.insert_one(comment_data)
    created_comment = db.plan_comments.find_one({"_id": comment_data["_id"]})
    return jsonify(created_comment), 201

@app.route('/api/plan-comments/<comment_id>', methods=['PUT'])
def update_plan_comment(comment_id):
    comment_data = request.json
    
    result = db.plan_comments.update_one({"_id": comment_id}, {"$set": comment_data})
    if result.matched_count == 0:
        return jsonify({"error": f"Comment {comment_id} not found"}), 404
    
    updated_comment = db.plan_comments.find_one({"_id": comment_id})
    return jsonify(updated_comment)

@app.route('/api/plan-comments/<comment_id>', methods=['DELETE'])
def delete_plan_comment(comment_id):
    result = db.plan_comments.delete_one({"_id": comment_id})
    if result.deleted_count == 0:
        return jsonify({"error": f"Comment {comment_id} not found"}), 404
    
    return jsonify({"success": True, "message": f"Comment {comment_id} deleted"})

@app.route('/api/initialize-student-data', methods=['POST'])
def initialize_student_data():
    student_data = request.json
    student_code = student_data.get('student_code')
    
    if not student_code:
        return jsonify({"error": "Student code is required"}), 400

    existing_courses = list(db.student_courses.find({"student_id": student_code}))
    if existing_courses:
        return jsonify({"message": f"Student {student_code} already has data", "action": "none"})

    current_semester = "2024-1" 
    
    default_courses = list(db.student_courses.find().limit(3))
    
    if not default_courses:
        default_courses = [
            {
                "_id": f"course_default_1_{student_code}",
                "title": "Introduction to Programming",
                "code": "CS101",
                "credits": 3
            },
            {
                "_id": f"course_default_2_{student_code}",
                "title": "Data Structures",
                "code": "CS201",
                "credits": 4
            }
        ]
        db.student_courses.insert_many(default_courses)
    
    student_courses = []
    for i, course in enumerate(default_courses):
        student_courses.append({
            "_id": f"sc_{i}_{student_code}",
            "student_id": student_code,
            "subject_code": course["code"],
            "subject_name": course["title"],
            "semester": current_semester,
            "professor_id": f"100{i+1}",
            "professor_name": "Default Professor",
            "enrollment_date": datetime.now(),
            "status": "active",
            "group_id": f"1-{course['code']}-{current_semester}"
        })
    
    if student_courses:
        db.student_courses.insert_many(student_courses)
    
    return jsonify({
        "message": f"Initial data created for student {student_code}",
        "courses_added": len(student_courses)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
