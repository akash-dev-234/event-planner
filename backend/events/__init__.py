from flask import Blueprint

events = Blueprint('events', __name__)

# Import routes after blueprint creation to avoid circular imports
from backend.events import routes
