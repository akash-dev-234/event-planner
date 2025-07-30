#!/usr/bin/env python3
"""
Script to create a test user with organizer access for testing the chatbot
"""
import os
import sys
from flask import Flask
from extensions import db
from auth.models import User, Organization, UserRole
from dotenv import load_dotenv

def create_test_user():
    """Create test user and organization for chatbot testing"""
    
    # Load environment variables
    load_dotenv()
    
    # Create Flask app with minimal config
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'instance', 'database.db')}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY')
    
    # Initialize database
    db.init_app(app)
    
    with app.app_context():
        # Create test organization
        test_org = Organization.query.filter_by(name="Test Organization").first()
        if not test_org:
            test_org = Organization(
                name="Test Organization",
                description="Organization for testing chatbot functionality"
            )
            db.session.add(test_org)
            db.session.commit()
            print("✓ Created test organization")
        else:
            print("✓ Test organization already exists")
        
        # Create test user with organizer role
        test_email = "test.organizer@example.com"
        test_user = User.query.filter_by(email=test_email).first()
        
        if not test_user:
            test_user = User(
                email=test_email,
                password="TestPassword123!",
                first_name="Test",
                last_name="Organizer",
                organization_id=test_org.id,
                role=UserRole.ORGANIZER.value
            )
            db.session.add(test_user)
            db.session.commit()
            print("✓ Created test organizer user")
        else:
            print("✓ Test organizer user already exists")
        
        print("\n" + "="*50)
        print("TEST USER CREDENTIALS:")
        print("="*50)
        print(f"Email: {test_email}")
        print(f"Password: TestPassword123!")
        print(f"Role: {UserRole.ORGANIZER.value}")
        print(f"Organization: {test_org.name}")
        print("="*50)
        print("\nYou can now:")
        print("1. Login with these credentials")
        print("2. Get a JWT token")
        print("3. Test the chatbot at POST /api/chat/message")
        print("="*50)

if __name__ == "__main__":
    create_test_user()