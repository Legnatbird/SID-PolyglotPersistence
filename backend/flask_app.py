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

def auto_seed_data():
    """Automatically seed data when the application starts"""
    print("Auto-seeding database...")
    
    db.courses.delete_many({})
    db.evaluation_plans.delete_many({})
    db.student_courses.delete_many({})
    db.student_grades.delete_many({})
    db.plan_comments.delete_many({})
    
    courses = [
        {
            "title": "Introduction to Programming",
            "code": "CS101",
            "credits": 3,
            "description": "Basic programming concepts and fundamentals",
            "department": "Computer Science",
            "prerequisites": []
        },
        {
            "title": "Data Structures",
            "code": "CS201",
            "credits": 4,
            "description": "Advanced data structures and algorithms",
            "department": "Computer Science",
            "prerequisites": ["CS101"]
        },
        {
            "title": "Algorithms", 
            "code": "CS302",
            "credits": 4,
            "description": "Algorithm design and analysis",
            "department": "Computer Science",
            "prerequisites": ["CS201"]
        },
        {
            "title": "Database Systems",
            "code": "CS403", 
            "credits": 3,
            "description": "Database design and management systems",
            "department": "Computer Science",
            "prerequisites": ["CS201"]
        }
    ]
    course_result = db.courses.insert_many(courses)
    
    student_courses = [
        {
            "student_id": "A00377013",
            "subject_code": "CS101",
            "subject_name": "Introduction to Programming",
            "semester": "2024-1",
            "professor_id": "A00377013",
            "professor_name": "Student A00377013",
            "enrollment_date": datetime.now(),
            "status": "active",
            "group_id": "1-CS101-2024-1",
            "credits": 3,
            "auto_enrolled": False
        },
        {
            "student_id": "A00377013",
            "subject_code": "CS201",
            "subject_name": "Data Structures",
            "semester": "2024-1",
            "professor_id": "A00377013",
            "professor_name": "Student A00377013",
            "enrollment_date": datetime.now(),
            "status": "active",
            "group_id": "1-CS201-2024-1",
            "credits": 4,
            "auto_enrolled": False
        }
    ]
    student_courses_result = db.student_courses.insert_many(student_courses)
    
    evaluation_plans = [
        {
            "subject_code": "CS101",
            "subject_name": "Introduction to Programming",
            "semester": "2024-1",
            "created_by": "A00377013",
            "professor_id": "A00377013",
            "professor_name": "Student A00377013",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "activities": [
                { "_id": str(ObjectId()), "name": "Midterm Exam", "description": "Written exam", "percentage": 30 },
                { "_id": str(ObjectId()), "name": "Final Project", "description": "Group project", "percentage": 40 },
                { "_id": str(ObjectId()), "name": "Assignments", "description": "Weekly homework", "percentage": 30 }
            ]
        },
        {
            "subject_code": "CS201",
            "subject_name": "Data Structures",
            "semester": "2024-1",
            "created_by": "A00377013",
            "professor_id": "A00377013",
            "professor_name": "Student A00377013",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "activities": [
                { "_id": str(ObjectId()), "name": "Quiz 1", "description": "First quiz", "percentage": 15 },
                { "_id": str(ObjectId()), "name": "Quiz 2", "description": "Second quiz", "percentage": 15 },
                { "_id": str(ObjectId()), "name": "Midterm Exam", "description": "Written exam", "percentage": 30 },
                { "_id": str(ObjectId()), "name": "Final Exam", "description": "Comprehensive exam", "percentage": 40 }
            ]
        }
    ]
    plans_result = db.evaluation_plans.insert_many(evaluation_plans)
    
    created_plans = list(db.evaluation_plans.find({"created_by": "A00377013"}))
    
    student_grades = []
    for plan in created_plans:
        if plan["subject_code"] == "CS101":
            activities = plan["activities"]
            if len(activities) >= 2:
                student_grades.extend([
                    {
                        "student_id": "A00377013",
                        "subject_code": "CS101",
                        "evaluation_plan_id": plan["_id"],
                        "activity_id": activities[0]["_id"],  # Midterm Exam
                        "activity_name": activities[0]["name"],
                        "grade": 4.2,
                        "activity_percentage": activities[0]["percentage"],
                        "semester": "2024-1",
                        "professor_id": "A00377013",
                        "created_at": datetime.now()
                    },
                    {
                        "student_id": "A00377013",
                        "subject_code": "CS101",
                        "evaluation_plan_id": plan["_id"],
                        "activity_id": activities[2]["_id"],  # Assignments
                        "activity_name": activities[2]["name"],
                        "grade": 4.5,
                        "activity_percentage": activities[2]["percentage"],
                        "semester": "2024-1",
                        "professor_id": "A00377013",
                        "created_at": datetime.now()
                    }
                ])
        elif plan["subject_code"] == "CS201":
            activities = plan["activities"]
            if len(activities) >= 1:
                student_grades.append({
                    "student_id": "A00377013",
                    "subject_code": "CS201",
                    "evaluation_plan_id": plan["_id"],
                    "activity_id": activities[0]["_id"],  # Quiz 1
                    "activity_name": activities[0]["name"],
                    "grade": 3.8,
                    "activity_percentage": activities[0]["percentage"],
                    "semester": "2024-1",
                    "professor_id": "A00377013",
                    "created_at": datetime.now()
                })
    
    if student_grades:
        db.student_grades.insert_many(student_grades)
    
    print("Auto-seeding completed successfully!")

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
    
    courses = list(db.courses.find(query))
    return jsonify(courses)

@app.route('/api/courses/<subject_code>', methods=['GET'])
def get_course(subject_code):
    course = db.courses.find_one({"code": subject_code})
    if not course:
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
            course = db.courses.find_one({"code": plan["subject_code"]})
            if course:
                plan["subject_name"] = course["title"]
            else:
                student_course = db.student_courses.find_one({"subject_code": plan["subject_code"]})
                if student_course:
                    plan["subject_name"] = student_course["subject_name"]
                else:
                    if "subject_name" not in plan or not plan["subject_name"]:
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
    
    auto_seed_data()
    return jsonify({"message": "Demo data has been seeded for student A00377013"})

@app.route('/api/student-grades', methods=['GET'])
def get_student_grades():
    evaluation_plan_id = request.args.get('evaluation_plan_id')
    student_id = request.args.get('student_id')
    activity_id = request.args.get('activity_id')
    subject_code = request.args.get('subject_code')
    
    query = {}
    if evaluation_plan_id:
        try:
            if ObjectId.is_valid(evaluation_plan_id):
                query["evaluation_plan_id"] = ObjectId(evaluation_plan_id)
            else:
                query["evaluation_plan_id"] = evaluation_plan_id
        except:
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
                grade["subject_name"] = course.get("subject_name", "Unknown Course")
    
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
    
    if "evaluation_plan_id" in grade_data:
        try:
            if ObjectId.is_valid(grade_data["evaluation_plan_id"]):
                grade_data["evaluation_plan_id"] = ObjectId(grade_data["evaluation_plan_id"])
        except:
            pass
    
    grade_data["created_at"] = datetime.now()
    if "updated_at" not in grade_data:
        grade_data["updated_at"] = datetime.now()
    
    result = db.student_grades.insert_one(grade_data)
    created_grade = db.student_grades.find_one({"_id": result.inserted_id})
    return jsonify(created_grade), 201

@app.route('/api/student-grades/<grade_id>', methods=['PUT'])
def update_student_grade(grade_id):
    grade_data = request.json
    grade_data["updated_at"] = datetime.now()
    
    if "evaluation_plan_id" in grade_data:
        try:
            if ObjectId.is_valid(grade_data["evaluation_plan_id"]):
                grade_data["evaluation_plan_id"] = ObjectId(grade_data["evaluation_plan_id"])
        except:
            pass
    
    try:
        grade_object_id = ObjectId(grade_id)
    except:
        return jsonify({"error": "Invalid grade ID"}), 400
    
    result = db.student_grades.update_one(
        {"_id": grade_object_id},
        {"$set": grade_data}
    )
    
    if result.matched_count == 0:
        return jsonify({"error": "Grade not found"}), 404
    
    updated_grade = db.student_grades.find_one({"_id": grade_object_id})
    return jsonify(updated_grade)

@app.route('/api/student-grades/<grade_id>', methods=['DELETE'])
def delete_student_grade(grade_id):
    try:
        if ObjectId.is_valid(grade_id):
            grade_id = ObjectId(grade_id)
    except:
        pass
        
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
    
    if "activities" in plan_data:
        for activity in plan_data["activities"]:
            if "_id" not in activity:
                activity["_id"] = str(ObjectId())
    
    plan_data["created_at"] = datetime.now()
    plan_data["updated_at"] = datetime.now()
    
    created_by = plan_data.get("created_by")
    subject_code = plan_data.get("subject_code")
    subject_name = plan_data.get("subject_name", "Unknown Course")
    semester = plan_data.get("semester")
    
    if created_by and subject_code and semester:
        existing_enrollment = db.student_courses.find_one({
            "student_id": created_by,
            "subject_code": subject_code,
            "semester": semester
        })
        
        if not existing_enrollment:
            course_details = db.courses.find_one({"code": subject_code})
            
            student_course = {
                "student_id": created_by,
                "subject_code": subject_code,
                "subject_name": subject_name,
                "semester": semester,
                "professor_id": created_by,
                "professor_name": f"Student {created_by}",
                "enrollment_date": datetime.now(),
                "status": "active",
                "group_id": f"1-{subject_code}-{semester}",
                "credits": course_details.get("credits", 3) if course_details else 3,
                "auto_enrolled": True
            }
            
            db.student_courses.insert_one(student_course)
            print(f"Auto-enrolled student {created_by} in course {subject_code} for semester {semester}")
    
    result = db.evaluation_plans.insert_one(plan_data)
    created_plan = db.evaluation_plans.find_one({"_id": result.inserted_id})
    return jsonify(created_plan), 201

@app.route('/api/evaluation-plans/<plan_id>', methods=['PUT'])
def update_evaluation_plan(plan_id):
    plan_data = request.json
    plan_data["updated_at"] = datetime.now()
    
    try:
        if ObjectId.is_valid(plan_id):
            plan_id = ObjectId(plan_id)
    except:
        pass
    
    if "activities" in plan_data:
        for activity in plan_data["activities"]:
            if "_id" not in activity:
                activity["_id"] = str(ObjectId())
    
    result = db.evaluation_plans.update_one({"_id": plan_id}, {"$set": plan_data})
    if result.matched_count == 0:
        return jsonify({"error": f"Evaluation plan {plan_id} not found"}), 404
    
    updated_plan = db.evaluation_plans.find_one({"_id": plan_id})
    return jsonify(updated_plan)

@app.route('/api/evaluation-plans/<plan_id>', methods=['DELETE'])
def delete_evaluation_plan(plan_id):
    try:
        if ObjectId.is_valid(plan_id):
            plan_id = ObjectId(plan_id)
    except:
        pass
        
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
    
    result = db.student_courses.insert_one(course_data)
    created_course = db.student_courses.find_one({"_id": result.inserted_id})
    return jsonify(created_course), 201

@app.route('/api/student-courses/<subject_code>', methods=['PUT'])
def update_student_course(subject_code):
    course_data = request.json
    
    try:
        if ObjectId.is_valid(subject_code):
            query = {"_id": ObjectId(subject_code)}
        else:
            query = {"subject_code": subject_code}
    except:
        query = {"subject_code": subject_code}
    
    result = db.student_courses.update_one(query, {"$set": course_data})
    if result.matched_count == 0:
        return jsonify({"error": f"Student course {subject_code} not found"}), 404
    
    updated_course = db.student_courses.find_one(query)
    return jsonify(updated_course)

@app.route('/api/student-courses/<subject_code>', methods=['DELETE'])
def delete_student_course(subject_code):
    # Try to find by _id first (if subject_code is actually an ObjectId), then by subject_code
    try:
        if ObjectId.is_valid(subject_code):
            query = {"_id": ObjectId(subject_code)}
        else:
            query = {"subject_code": subject_code}
    except:
        query = {"subject_code": subject_code}
        
    result = db.student_courses.delete_one(query)
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
