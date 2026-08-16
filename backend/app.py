# ============================================================
#  CampusFix — Flask Backend Entry Point
#  File: backend/app.py
# ============================================================

from flask import Flask
from flask_cors import CORS
from database import init_db
from routes.auth_routes     import auth_bp
from routes.student_routes  import student_bp
from routes.dept_head_routes import dept_head_bp
from routes.admin_routes    import admin_bp

app = Flask(__name__)
app.secret_key = 'campusfix_secret_key_2026'

# Allow requests from the HTML frontend (CORS)
CORS(app, supports_credentials=True)

# Register all route blueprints
app.register_blueprint(auth_bp,      url_prefix='/api/auth')
app.register_blueprint(student_bp,   url_prefix='/api/student')
app.register_blueprint(dept_head_bp, url_prefix='/api/depthead')
app.register_blueprint(admin_bp,     url_prefix='/api/admin')

# Initialize the database on startup
with app.app_context():
    init_db()

if __name__ == '__main__':
    print("🚀 CampusFix Backend Running at http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
