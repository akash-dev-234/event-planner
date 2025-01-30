from flask import Flask, render_template
from flask_sqlalchemy import SQLAlchemy

# Initialize the Flask application
app = Flask(__name__)

# Configure SQLite Database URI
app.config["SQLALCHEMY_DATABASE_URI"] = (
    "sqlite:///database.db"  # SQLite file will be created in the project folder
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False  # To disable unnecessary warnings

# Initialize SQLAlchemy
db = SQLAlchemy(app)


@app.route("/")
def home():
    return "Welcome to the Flask app!"


if __name__ == "__main__":
    app.run(debug=True)
