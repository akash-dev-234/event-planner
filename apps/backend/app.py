import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request
from flask_cors import CORS
from extensions import db, bcrypt, jwt, migrate, mail
from routes.auth import auth_bp
from routes.events import events_bp
from routes.chat import chat_bp
from routes.organizations import organization_bp
from dotenv import load_dotenv


def create_app():
    app = Flask(__name__)
    load_dotenv()
    
    # Add these lines for better debugging
    app.config['DEBUG'] = True
    app.config['PROPAGATE_EXCEPTIONS'] = True
    
    # Enable CORS for all routes - more permissive for development
    CORS(app, 
         origins=['http://localhost:3000', 'http://127.0.0.1:3000', 'http://frontend:3000'], 
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')
    app.config['JWT_TOKEN_LOCATION'] = ['headers']
    app.config['JWT_HEADER_NAME'] = 'Authorization'
    app.config['JWT_HEADER_TYPE'] = 'Bearer'
    # Set JWT token to expire in 24 hours (86400 seconds)
    from datetime import timedelta
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)    
    
    backend_dir = os.path.abspath(os.path.dirname(__file__))

    # Database configuration - use PostgreSQL if DATABASE_URL is set, otherwise SQLite
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        # Using PostgreSQL (Supabase or other)
        # Convert to psycopg3 dialect (postgresql+psycopg://)
        if database_url.startswith('postgresql://'):
            database_url = database_url.replace('postgresql://', 'postgresql+psycopg://', 1)
        app.config["SQLALCHEMY_DATABASE_URI"] = database_url
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
            "pool_pre_ping": True,  # Verify connections before using
            "pool_recycle": 300,    # Recycle connections after 5 minutes
        }
        print(f"✅ Using PostgreSQL database")
    else:
        # Fallback to SQLite for local development
        db_path = os.path.join(backend_dir, 'instance', 'database.db')
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
            "connect_args": {"timeout": 10}
        }
        print(f"⚠️  Using SQLite database (local development)")
    # Load the secret key from the environment variable
    app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY")
    app.config["MAIL_SERVER"] = os.environ.get("MAIL_SERVER")
    app.config["MAIL_PORT"] = int(os.environ.get("MAIL_PORT", 587))
    app.config["MAIL_USE_TLS"] = os.environ.get("MAIL_USE_TLS", "True").lower() == "true"
    app.config["MAIL_USE_SSL"] = os.environ.get("MAIL_USE_SSL", "False").lower() == "true"
    app.config["MAIL_USERNAME"] = os.environ.get("MAIL_USERNAME")
    app.config["MAIL_PASSWORD"] = os.environ.get("MAIL_PASSWORD")
    app.config["MAIL_DEFAULT_SENDER"] = os.environ.get("VERIFIED_EMAIL")
    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    migrations_dir = os.path.join(backend_dir, "migrations")
    migrate.init_app(app, db, directory=migrations_dir)
    mail.init_app(app)

   

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(organization_bp)

    @app.route("/")
    def home():
        return "Welcome to the Flask app!"

    return app


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()  # Create database tables
    # Use PORT from environment (Render) or default to 5001 for local
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)
