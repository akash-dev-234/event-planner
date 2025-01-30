from flask import Flask
from backend.extensions import db, bcrypt, jwt, migrate
from backend.auth import auth


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "dev"

    # Configure SQLite Database URI
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "connect_args": {"timeout": 10}  # Increase timeout to 10 seconds
    }

    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

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
