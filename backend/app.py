import os
from flask import Flask
from backend.extensions import db, bcrypt, jwt, migrate, mail
from backend.auth import auth
from dotenv import load_dotenv


def create_app():
    app = Flask(__name__)
    load_dotenv()
    backend_dir = os.path.abspath(os.path.dirname(__file__))
    # Configure SQLite Database URI
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URI")
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
    app.register_blueprint(auth)

    @app.route("/")
    def home():
        return "Welcome to the Flask app!"

    return app


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()  # Create database tables
    app.run(debug=True)
