import os
from datetime import datetime, date, time
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from decorators import admin_or_organizer_required, role_required
from models import Event, Organization, User, UserRole
from extensions import db
from . import events_bp as events


@events.route("/create", methods=["POST"])
@role_required("organizer")
def create_event():
    """
    Create a new event.
    Only organizers can create events for their organization.
    """
    try:
        # Get the current user from JWT token
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check if user belongs to an organization
        if not user.organization_id:
            return jsonify({
                "error": "You must belong to an organization to create events"
            }), 400

        # Get the organization
        organization = Organization.query.get(user.organization_id)
        if not organization or organization.is_deleted:
            return jsonify({
                "error": "Organization not found or has been deleted"
            }), 404

        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        # Extract and validate required fields
        title = data.get("title")
        description = data.get("description")
        event_date = data.get("date")
        event_time = data.get("time")
        location = data.get("location")
        is_public = data.get("is_public", False)

        # Validate required fields
        required_fields = {
            "title": title,
            "date": event_date,
            "time": event_time,
            "location": location
        }

        for field_name, field_value in required_fields.items():
            if not field_value:
                return jsonify({"error": f"Missing required field: {field_name}"}), 400

        # Validate and parse date
        try:
            parsed_date = datetime.strptime(event_date, "%Y-%m-%d").date()
            # Check if date is not in the past
            if parsed_date < date.today():
                return jsonify({"error": "Event date cannot be in the past"}), 400
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        # Validate and parse time
        try:
            parsed_time = datetime.strptime(event_time, "%H:%M").time()
        except ValueError:
            return jsonify({"error": "Invalid time format. Use HH:MM"}), 400

        # Validate title length
        if len(title.strip()) < 3:
            return jsonify({"error": "Event title must be at least 3 characters long"}), 400

        if len(title.strip()) > 150:
            return jsonify({"error": "Event title cannot exceed 150 characters"}), 400

        # Validate location
        if len(location.strip()) < 3:
            return jsonify({"error": "Event location must be at least 3 characters long"}), 400

        # Create new event
        new_event = Event(
            title=title.strip(),
            description=description.strip() if description else None,
            date=parsed_date,
            time=parsed_time,
            location=location.strip(),
            is_public=bool(is_public),
            organization_id=user.organization_id,
            user_id=user.id
        )

        db.session.add(new_event)
        db.session.commit()

        return jsonify({
            "message": "Event created successfully",
            "event": new_event.to_dict()
        }), 201

    except Exception as e:
        print(f"Error in create_event: {str(e)}")
        db.session.rollback()
        return jsonify({
            "error": "Failed to create event",
            "details": str(e)
        }), 500


@events.route("", methods=["GET"])
@jwt_required()
def get_events():
    """
    Get events with filtering options.
    - Public events: visible to all users
    - Organization events: visible to organization members
    - Filter options: 'public', 'my_org', 'all' (admin only)
    """
    try:
        # Get the current user from JWT token
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get query parameters
        filter_type = request.args.get('filter', 'public')  # Default to public events
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        # Validate limit
        if limit > 100:
            limit = 100

        events_query = Event.get_active()

        if filter_type == 'public':
            # Public events - visible to all
            events_query = Event.get_public_events()
        elif filter_type == 'my_org':
            # Organization events - only for organization members
            if not user.organization_id:
                return jsonify({
                    "error": "You must belong to an organization to view organization events"
                }), 400
            events_query = Event.get_organization_events(user.organization_id)
        elif filter_type == 'all':
            # All events - admin only
            if user.role != UserRole.ADMIN.value:
                return jsonify({
                    "error": "Only admins can view all events"
                }), 403
            # events_query is already set to all active events
        else:
            return jsonify({
                "error": "Invalid filter type. Valid options: 'public', 'my_org', 'all'"
            }), 400

        # Apply pagination
        events = events_query.order_by(Event.date.asc(), Event.time.asc()).offset(offset).limit(limit).all()

        # Get total count for pagination
        total_count = events_query.count()

        # Prepare events data
        events_data = []
        for event in events:
            event_dict = event.to_dict()
            
            # Add organization name
            org = Organization.query.get(event.organization_id)
            event_dict['organization_name'] = org.name if org else "Unknown"
            
            # Add organizer name
            organizer = User.query.get(event.user_id)
            if organizer:
                event_dict['organizer'] = {
                    'name': f"{organizer.first_name} {organizer.last_name}",
                    'email': organizer.email
                }
            
            events_data.append(event_dict)

        return jsonify({
            "message": "Events retrieved successfully",
            "filter": filter_type,
            "total_count": total_count,
            "returned_count": len(events_data),
            "pagination": {
                "offset": offset,
                "limit": limit,
                "has_more": offset + limit < total_count
            },
            "events": events_data
        }), 200

    except Exception as e:
        print(f"Error in get_events: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve events",
            "details": str(e)
        }), 500


@events.route("/<int:event_id>", methods=["GET"])
@jwt_required()
def get_event(event_id):
    """
    View a specific event.
    Public events: visible to all
    Private events: only visible to organization members
    """
    try:
        # Get the current user from JWT token
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get the event
        event = Event.get_active().filter(Event.id == event_id).first()
        if not event:
            return jsonify({"error": "Event not found"}), 404

        # Check access permissions
        if not event.is_public:
            # Private event - check if user belongs to the same organization
            if user.organization_id != event.organization_id and user.role != UserRole.ADMIN.value:
                return jsonify({
                    "error": "You don't have permission to view this private event"
                }), 403

        # Prepare event data with additional details
        event_data = event.to_dict()
        
        # Add organization details
        organization = Organization.query.get(event.organization_id)
        if organization:
            event_data['organization'] = {
                'id': organization.id,
                'name': organization.name,
                'description': organization.description
            }

        # Add organizer details
        organizer = User.query.get(event.user_id)
        if organizer:
            event_data['organizer'] = {
                'id': organizer.id,
                'name': f"{organizer.first_name} {organizer.last_name}",
                'email': organizer.email
            }

        # Add edit permissions for response
        can_edit = (
            user.id == event.user_id or  # Event creator
            (user.organization_id == event.organization_id and user.role == UserRole.ORGANIZER.value) or  # Same org organizer
            user.role == UserRole.ADMIN.value  # Admin
        )
        event_data['can_edit'] = can_edit

        return jsonify({
            "message": "Event retrieved successfully",
            "event": event_data
        }), 200

    except Exception as e:
        print(f"Error in get_event: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve event",
            "details": str(e)
        }), 500


@events.route("/<int:event_id>", methods=["PUT"])
@role_required("organizer")
def update_event(event_id):
    """
    Update an event.
    Only the event creator, organization organizers, or admins can update events.
    """
    try:
        # Get the current user from JWT token
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get the event
        event = Event.get_active().filter(Event.id == event_id).first()
        if not event:
            return jsonify({"error": "Event not found"}), 404

        # Check permissions
        can_edit = (
            user.id == event.user_id or  # Event creator
            (user.organization_id == event.organization_id and user.role == UserRole.ORGANIZER.value) or  # Same org organizer
            user.role == UserRole.ADMIN.value  # Admin
        )

        if not can_edit:
            return jsonify({
                "error": "You don't have permission to update this event"
            }), 403

        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        # Update fields if provided
        if 'title' in data:
            title = data['title']
            if not title or len(title.strip()) < 3:
                return jsonify({"error": "Event title must be at least 3 characters long"}), 400
            if len(title.strip()) > 150:
                return jsonify({"error": "Event title cannot exceed 150 characters"}), 400
            event.title = title.strip()

        if 'description' in data:
            event.description = data['description'].strip() if data['description'] else None

        if 'date' in data:
            try:
                parsed_date = datetime.strptime(data['date'], "%Y-%m-%d").date()
                if parsed_date < date.today():
                    return jsonify({"error": "Event date cannot be in the past"}), 400
                event.date = parsed_date
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        if 'time' in data:
            try:
                parsed_time = datetime.strptime(data['time'], "%H:%M").time()
                event.time = parsed_time
            except ValueError:
                return jsonify({"error": "Invalid time format. Use HH:MM"}), 400

        if 'location' in data:
            location = data['location']
            if not location or len(location.strip()) < 3:
                return jsonify({"error": "Event location must be at least 3 characters long"}), 400
            event.location = location.strip()

        if 'is_public' in data:
            event.is_public = bool(data['is_public'])

        # Update the updated_at timestamp
        event.updated_at = datetime.now()

        db.session.commit()

        return jsonify({
            "message": "Event updated successfully",
            "event": event.to_dict()
        }), 200

    except Exception as e:
        print(f"Error in update_event: {str(e)}")
        db.session.rollback()
        return jsonify({
            "error": "Failed to update event",
            "details": str(e)
        }), 500


@events.route("/<int:event_id>", methods=["DELETE"])
@role_required("organizer")
def delete_event(event_id):
    """
    Soft delete an event.
    Only the event creator, organization organizers, or admins can delete events.
    """
    try:
        # Get the current user from JWT token
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get the event
        event = Event.get_active().filter(Event.id == event_id).first()
        if not event:
            return jsonify({"error": "Event not found"}), 404

        # Check permissions
        can_delete = (
            user.id == event.user_id or  # Event creator
            (user.organization_id == event.organization_id and user.role == UserRole.ORGANIZER.value) or  # Same org organizer
            user.role == UserRole.ADMIN.value  # Admin
        )

        if not can_delete:
            return jsonify({
                "error": "You don't have permission to delete this event"
            }), 403

        # Store event info for response
        event_title = event.title
        event_date = event.date.isoformat()

        # Soft delete the event
        event.soft_delete()
        db.session.commit()

        return jsonify({
            "message": f"Event '{event_title}' scheduled for {event_date} has been deleted successfully"
        }), 200

    except Exception as e:
        print(f"Error in delete_event: {str(e)}")
        db.session.rollback()
        return jsonify({
            "error": "Failed to delete event",
            "details": str(e)
        }), 500


# Additional admin routes for event management

@events.route("/admin/all", methods=["GET"])
@role_required("admin")
def admin_get_all_events():
    """
    Admin-only route to get all events including deleted ones.
    """
    try:
        filter_type = request.args.get('filter', 'active')  # 'active', 'deleted', 'all'
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        if limit > 100:
            limit = 100

        if filter_type == 'active':
            events_query = Event.get_active()
        elif filter_type == 'deleted':
            events_query = Event.query.filter(Event.deleted_at.isnot(None))
        elif filter_type == 'all':
            events_query = Event.query
        else:
            return jsonify({
                "error": "Invalid filter type. Valid options: 'active', 'deleted', 'all'"
            }), 400

        events = events_query.order_by(Event.created_at.desc()).offset(offset).limit(limit).all()
        total_count = events_query.count()

        events_data = []
        for event in events:
            event_dict = event.to_dict(include_private=True)
            
            # Add organization and organizer info
            org = Organization.query.get(event.organization_id)
            event_dict['organization_name'] = org.name if org else "Unknown"
            
            organizer = User.query.get(event.user_id)
            if organizer:
                event_dict['organizer'] = {
                    'name': f"{organizer.first_name} {organizer.last_name}",
                    'email': organizer.email
                }
            
            events_data.append(event_dict)

        return jsonify({
            "message": "Events retrieved successfully",
            "filter": filter_type,
            "total_count": total_count,
            "returned_count": len(events_data),
            "pagination": {
                "offset": offset,
                "limit": limit,
                "has_more": offset + limit < total_count
            },
            "events": events_data
        }), 200

    except Exception as e:
        print(f"Error in admin_get_all_events: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve events",
            "details": str(e)
        }), 500
