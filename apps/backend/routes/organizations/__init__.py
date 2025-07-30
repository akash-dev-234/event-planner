from flask import Blueprint

organization_bp = Blueprint('organization', __name__, url_prefix='/api/organization')

from . import routes