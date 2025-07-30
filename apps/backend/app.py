import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request
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

    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')
    app.config['JWT_TOKEN_LOCATION'] = ['headers']
    app.config['JWT_HEADER_NAME'] = 'Authorization'
    app.config['JWT_HEADER_TYPE'] = 'Bearer'    
    
    backend_dir = os.path.abspath(os.path.dirname(__file__))
    
    # Use absolute path for database
    db_path = os.path.join(backend_dir, 'instance', 'database.db')
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "connect_args": {"timeout": 10}  # Increase timeout to 10 seconds
    }
    # Load the secret key from the environment variable
    app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY")
    app.config["MAIL_SERVER"] = os.environ.get("MAIL_SERVER")
    app.config["MAIL_PORT"] = os.environ.get("MAIL_PORT")
    app.config["MAIL_USE_TLS"] = os.environ.get("MAIL_USE_TLS")
    app.config["MAIL_USERNAME"] = (
        "apikey"  # This is the string "apikey", not your SendGrid username
    )
    app.config["MAIL_PASSWORD"] = os.environ.get("SENDGRID_API_KEY")
    app.config["MAIL_DEFAULT_SENDER"] = os.environ.get("MAIL_USERNAME")
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
    app.run(debug=True, port=5001)
