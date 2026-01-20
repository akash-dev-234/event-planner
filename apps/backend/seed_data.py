#!/usr/bin/env python3
"""
Database seeding script for Event Planner application
Creates sample data for testing and development
"""

import os
import sys
from datetime import date, time, timedelta

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models import User, Organization, Event, UserRole, OrganizationInvitation


def clear_existing_data():
    """Clear existing data from all tables"""
    print("Clearing existing data...")
    
    # Delete in correct order to avoid foreign key constraints
    Event.query.delete()
    OrganizationInvitation.query.delete()
    User.query.delete()
    Organization.query.delete()
    
    db.session.commit()
    print("✅ Existing data cleared")


def create_organizations():
    """Create sample organizations"""
    print("Creating organizations...")
    
    organizations_data = [
        {
            "name": "Tech Innovators Inc",
            "description": "A cutting-edge technology company focused on AI and machine learning solutions"
        },
        {
            "name": "Green Future Foundation",
            "description": "Non-profit organization dedicated to environmental sustainability and climate action"
        },
        {
            "name": "Creative Arts Collective",
            "description": "Community organization supporting local artists and creative professionals"
        },
        {
            "name": "Health & Wellness Center",
            "description": "Healthcare organization promoting community health and wellness programs"
        },
        {
            "name": "Education First Alliance",
            "description": "Educational organization focused on improving learning outcomes for students"
        },
        {
            "name": "Digital Marketing Pro",
            "description": "Marketing agency specializing in digital transformation and social media strategy"
        }
    ]
    
    organizations = []
    for org_data in organizations_data:
        org = Organization(
            name=org_data["name"],
            description=org_data["description"]
        )
        db.session.add(org)
        organizations.append(org)
    
    db.session.commit()
    print(f"✅ Created {len(organizations)} organizations")
    return organizations


def create_users(organizations):
    """Create sample users with different roles"""
    print("Creating users...")
    
    # Admin user (already exists)
    admin = User.query.filter_by(email="eventplanner@yopmail.com").first()
    if not admin:
        admin = User(
            email="eventplanner@yopmail.com",
            password="AdminPass123@",
            first_name="Admin",
            last_name="User",
            organization_id=None,
            role=UserRole.ADMIN.value
        )
        db.session.add(admin)
    
    # Organizers for each organization
    organizers = []
    organizer_data = [
        {"email": "john.doe@techinnovators.com", "first_name": "John", "last_name": "Doe"},
        {"email": "sarah.green@greenfuture.org", "first_name": "Sarah", "last_name": "Green"},
        {"email": "mike.artist@creative.com", "first_name": "Mike", "last_name": "Artist"},
        {"email": "dr.wellness@health.com", "first_name": "Dr. Lisa", "last_name": "Wellness"},
        {"email": "prof.smith@education.org", "first_name": "Prof. David", "last_name": "Smith"},
        {"email": "anna.marketing@digital.com", "first_name": "Anna", "last_name": "Marketing"}
    ]
    
    for i, user_data in enumerate(organizer_data):
        if i < len(organizations):
            organizer = User(
                email=user_data["email"],
                password="OrganizerPass123@",
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                organization_id=organizations[i].id,
                role=UserRole.ORGANIZER.value
            )
            db.session.add(organizer)
            organizers.append(organizer)
    
    # Team members
    team_members = []
    team_member_data = [
        {"email": "alice.dev@techinnovators.com", "first_name": "Alice", "last_name": "Developer", "org_idx": 0},
        {"email": "bob.researcher@greenfuture.org", "first_name": "Bob", "last_name": "Researcher", "org_idx": 1},
        {"email": "carol.designer@creative.com", "first_name": "Carol", "last_name": "Designer", "org_idx": 2},
        {"email": "dan.nurse@health.com", "first_name": "Dan", "last_name": "Nurse", "org_idx": 3},
        {"email": "eve.teacher@education.org", "first_name": "Eve", "last_name": "Teacher", "org_idx": 4},
        {"email": "frank.analyst@digital.com", "first_name": "Frank", "last_name": "Analyst", "org_idx": 5}
    ]
    
    for member_data in team_member_data:
        if member_data["org_idx"] < len(organizations):
            member = User(
                email=member_data["email"],
                password="MemberPass123@",
                first_name=member_data["first_name"],
                last_name=member_data["last_name"],
                organization_id=organizations[member_data["org_idx"]].id,
                role=UserRole.TEAM_MEMBER.value
            )
            db.session.add(member)
            team_members.append(member)
    
    # Guest users (no organization)
    guests = []
    guest_data = [
        {"email": "guest1@example.com", "first_name": "Guest", "last_name": "One"},
        {"email": "guest2@example.com", "first_name": "Guest", "last_name": "Two"},
        {"email": "guest3@example.com", "first_name": "Guest", "last_name": "Three"}
    ]
    
    for guest_data in guest_data:
        guest = User(
            email=guest_data["email"],
            password="GuestPass123@",
            first_name=guest_data["first_name"],
            last_name=guest_data["last_name"],
            organization_id=None,
            role=UserRole.GUEST.value
        )
        db.session.add(guest)
        guests.append(guest)
    
    db.session.commit()
    print(f"✅ Created users: 1 admin, {len(organizers)} organizers, {len(team_members)} team members, {len(guests)} guests")
    return organizers, team_members, guests


def create_events(organizations, organizers):
    """Create sample events"""
    print("Creating events...")
    
    # Get current date for realistic event dates
    today = date.today()
    
    events_data = [
        # Tech Innovators Inc Events
        {
            "title": "AI Workshop: Introduction to Machine Learning",
            "description": "Learn the fundamentals of machine learning and artificial intelligence. Perfect for beginners and intermediate developers.",
            "date": today + timedelta(days=7),
            "time": time(14, 0),  # 2:00 PM
            "location": "Tech Innovators Conference Room A, 123 Silicon Valley Blvd",
            "is_public": True,
            "org_idx": 0
        },
        {
            "title": "Team Building: Escape Room Challenge",
            "description": "Internal team building activity to strengthen collaboration and problem-solving skills.",
            "date": today + timedelta(days=3),
            "time": time(16, 30),  # 4:30 PM
            "location": "Escape Quest, Downtown Mall",
            "is_public": False,
            "org_idx": 0
        },
        
        # Green Future Foundation Events
        {
            "title": "Community Clean-Up Day",
            "description": "Join us for a community-wide effort to clean up our local parks and waterways. Volunteers of all ages welcome!",
            "date": today + timedelta(days=14),
            "time": time(9, 0),  # 9:00 AM
            "location": "Riverside Park, Main Entrance",
            "is_public": True,
            "org_idx": 1
        },
        {
            "title": "Sustainability Workshop: Zero Waste Living",
            "description": "Learn practical tips and strategies for reducing waste in your daily life.",
            "date": today + timedelta(days=21),
            "time": time(18, 0),  # 6:00 PM
            "location": "Green Future Community Center, 456 Eco Lane",
            "is_public": True,
            "org_idx": 1
        },
        
        # Creative Arts Collective Events
        {
            "title": "Monthly Art Exhibition Opening",
            "description": "Celebrate local artists with our monthly showcase featuring paintings, sculptures, and digital art.",
            "date": today + timedelta(days=5),
            "time": time(19, 0),  # 7:00 PM
            "location": "Creative Arts Gallery, 789 Artist Way",
            "is_public": True,
            "org_idx": 2
        },
        {
            "title": "Pottery Workshop for Beginners",
            "description": "Hands-on pottery workshop where you'll learn basic techniques and create your own ceramic pieces.",
            "date": today + timedelta(days=12),
            "time": time(10, 0),  # 10:00 AM
            "location": "Creative Arts Studio B, 789 Artist Way",
            "is_public": True,
            "org_idx": 2
        },
        
        # Health & Wellness Center Events
        {
            "title": "Free Health Screening Day",
            "description": "Complimentary health screenings including blood pressure, cholesterol, and BMI measurements.",
            "date": today + timedelta(days=10),
            "time": time(8, 0),  # 8:00 AM
            "location": "Health & Wellness Center, 321 Healthy St",
            "is_public": True,
            "org_idx": 3
        },
        {
            "title": "Yoga and Meditation Class",
            "description": "Weekly yoga and meditation session for stress relief and mindfulness. All skill levels welcome.",
            "date": today + timedelta(days=2),
            "time": time(17, 30),  # 5:30 PM
            "location": "Wellness Center Studio, 321 Healthy St",
            "is_public": True,
            "org_idx": 3
        },
        
        # Education First Alliance Events
        {
            "title": "Parent-Teacher Conference Night",
            "description": "Meet with teachers to discuss student progress and development. Private event for enrolled families.",
            "date": today + timedelta(days=8),
            "time": time(18, 30),  # 6:30 PM
            "location": "Education Center Main Hall, 654 Learning Ave",
            "is_public": False,
            "org_idx": 4
        },
        {
            "title": "Science Fair Preparation Workshop",
            "description": "Help students prepare their science fair projects with guidance from experienced mentors.",
            "date": today + timedelta(days=18),
            "time": time(15, 0),  # 3:00 PM
            "location": "Education Center Science Lab, 654 Learning Ave",
            "is_public": True,
            "org_idx": 4
        },
        
        # Digital Marketing Pro Events
        {
            "title": "Digital Marketing Trends 2024",
            "description": "Stay ahead of the curve with the latest digital marketing trends and strategies for the upcoming year.",
            "date": today + timedelta(days=15),
            "time": time(13, 30),  # 1:30 PM
            "location": "Digital Marketing Pro Conference Room, 987 Marketing Blvd",
            "is_public": True,
            "org_idx": 5
        },
        {
            "title": "Client Strategy Session",
            "description": "Internal meeting to discuss Q4 client strategies and campaign planning.",
            "date": today + timedelta(days=4),
            "time": time(11, 0),  # 11:00 AM
            "location": "Digital Marketing Pro Boardroom, 987 Marketing Blvd",
            "is_public": False,
            "org_idx": 5
        }
    ]
    
    events = []
    for event_data in events_data:
        if event_data["org_idx"] < len(organizations) and event_data["org_idx"] < len(organizers):
            event = Event(
                title=event_data["title"],
                description=event_data["description"],
                date=event_data["date"],
                time=event_data["time"],
                location=event_data["location"],
                is_public=event_data["is_public"],
                organization_id=organizations[event_data["org_idx"]].id,
                user_id=organizers[event_data["org_idx"]].id
            )
            db.session.add(event)
            events.append(event)
    
    db.session.commit()
    print(f"✅ Created {len(events)} events")
    return events


def create_pending_organizer_requests():
    """Create some pending organizer requests for testing admin functionality"""
    print("Creating pending organizer requests...")
    
    pending_requests = [
        {"email": "pending1@example.com", "first_name": "Pending", "last_name": "Organizer1"},
        {"email": "pending2@example.com", "first_name": "Pending", "last_name": "Organizer2"},
        {"email": "pending3@example.com", "first_name": "Pending", "last_name": "Organizer3"}
    ]
    
    requests = []
    for req_data in pending_requests:
        user = User(
            email=req_data["email"],
            password="PendingPass123@",
            first_name=req_data["first_name"],
            last_name=req_data["last_name"],
            organization_id=None,
            role=UserRole.GUEST.value,
            pending_organizer_approval=True
        )
        db.session.add(user)
        requests.append(user)
    
    db.session.commit()
    print(f"✅ Created {len(requests)} pending organizer requests")
    return requests


def main():
    """Main seeding function"""
    print("🌱 Starting database seeding...")
    
    # Create Flask app
    app = create_app()
    
    with app.app_context():
        # Clear existing data
        clear_existing_data()
        
        # Create organizations
        organizations = create_organizations()
        
        # Create users
        organizers, team_members, guests = create_users(organizations)
        
        # Create events
        events = create_events(organizations, organizers)
        
        # Create pending requests
        pending_requests = create_pending_organizer_requests()
        
        print("\n🎉 Database seeding completed successfully!")
        print(f"📊 Summary:")
        print(f"   • Organizations: {len(organizations)}")
        print(f"   • Users: {1 + len(organizers) + len(team_members) + len(guests) + len(pending_requests)}")
        print(f"   • Events: {len(events)}")
        print(f"   • Pending Requests: {len(pending_requests)}")
        
        print("\n🔑 Login Credentials:")
        print("   Admin: eventplanner@yopmail.com / AdminPass123@")
        print("   Organizers: [name]@[org].com / OrganizerPass123@")
        print("   Team Members: [name]@[org].com / MemberPass123@")
        print("   Guests: guest[1-3]@example.com / GuestPass123@")


if __name__ == "__main__":
    main()