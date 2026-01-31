from datetime import datetime, timezone
from flask import request, jsonify
from flask_jwt_extended import get_jwt, jwt_required

from . import events_bp
from decorators import role_required
from models import Event, EventInvitation, User
from extensions import db
from utils.email_helpers import send_event_invitation_email
from utils.rate_limiter import invitation_rate_limit


@events_bp.route("/<int:event_id>/invite-guests", methods=["POST"])
@jwt_required()
@role_required("organizer", "admin")
@invitation_rate_limit
def invite_guests_to_event(event_id):
    """Send event invitations to external guests (no platform access)"""
    try:
        # Get the current user (organizer)
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        organizer = User.query.get(user_id)
        
        if not organizer:
            return jsonify({"error": "Organizer not found"}), 404

        # Get the event
        event = Event.query.get(event_id)
        if not event or event.is_deleted:
            return jsonify({"error": "Event not found"}), 404
        
        # Check if organizer owns this event
        if event.user_id != user_id and organizer.role != 'admin':
            return jsonify({"error": "You can only invite guests to your own events"}), 403

        data = request.get_json()
        guest_invitations = data.get("guests", [])
        
        if not guest_invitations:
            return jsonify({"error": "No guests provided"}), 400

        successful_invitations = []
        failed_invitations = []

        for guest_data in guest_invitations:
            guest_email = guest_data.get("email")
            guest_name = guest_data.get("name", "")  # Optional
            
            if not guest_email:
                failed_invitations.append({
                    "email": guest_email,
                    "error": "Email is required"
                })
                continue

            # Check if guest is already invited to this event
            existing_invitation = EventInvitation.query.filter_by(
                event_id=event_id,
                guest_email=guest_email
            ).first()
            
            if existing_invitation:
                failed_invitations.append({
                    "email": guest_email,
                    "error": "Guest already invited to this event"
                })
                continue

            try:
                # Create event invitation
                event_invitation = EventInvitation(
                    event_id=event_id,
                    guest_email=guest_email,
                    guest_name=guest_name
                )
                
                db.session.add(event_invitation)
                db.session.flush()  # Get the ID
                
                # Send invitation email
                send_event_invitation_email(event_invitation, event, organizer)
                
                successful_invitations.append({
                    "email": guest_email,
                    "name": guest_name,
                    "invitation_id": event_invitation.id
                })
                
            except Exception as e:
                failed_invitations.append({
                    "email": guest_email,
                    "error": f"Failed to send invitation: {str(e)}"
                })
                db.session.rollback()
                continue

        db.session.commit()

        return jsonify({
            "message": f"Sent {len(successful_invitations)} invitation(s) successfully",
            "successful_invitations": successful_invitations,
            "failed_invitations": failed_invitations,
            "total_sent": len(successful_invitations),
            "total_failed": len(failed_invitations)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Failed to send event invitations",
            "details": str(e)
        }), 500


@events_bp.route("/<int:event_id>/guest-list", methods=["GET"])
@jwt_required()
@role_required("organizer", "admin")
def get_event_guest_list(event_id):
    """Get list of invited guests for an event"""
    try:
        # Get the current user
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        # Get the event
        event = Event.query.get(event_id)
        if not event or event.is_deleted:
            return jsonify({"error": "Event not found"}), 404
        
        # Check if user owns this event or is admin
        if event.user_id != user_id and user.role != 'admin':
            return jsonify({"error": "You can only view guests for your own events"}), 403

        # Get all invitations for this event
        invitations = EventInvitation.query.filter_by(event_id=event_id).all()
        
        guest_data = []
        for invitation in invitations:
            guest_data.append({
                "id": invitation.id,
                "email": invitation.guest_email,
                "name": invitation.guest_name,
                "status": invitation.status,
                "invited_at": invitation.created_at.isoformat() if invitation.created_at else None,
                "responded_at": invitation.responded_at.isoformat() if invitation.responded_at else None,
            })

        # Count statuses
        status_counts = {
            "pending": len([g for g in guest_data if g["status"] == "pending"]),
            "accepted": len([g for g in guest_data if g["status"] == "accepted"]),
            "declined": len([g for g in guest_data if g["status"] == "declined"]),
            "total": len(guest_data)
        }

        return jsonify({
            "event_id": event_id,
            "event_title": event.title,
            "guests": guest_data,
            "status_counts": status_counts
        }), 200

    except Exception as e:
        return jsonify({
            "error": "Failed to get guest list",
            "details": str(e)
        }), 500


# Public endpoint for guests to respond to invitations (no authentication required)
@events_bp.route("/rsvp/<token>", methods=["POST"])
def guest_rsvp(token):
    """Handle guest RSVP responses from email links - auto-process response"""
    try:
        # Find the invitation by token
        invitation = EventInvitation.query.filter_by(invitation_token=token).first()

        if not invitation:
            return jsonify({"error": "Invalid or expired invitation"}), 404

        # Get the event
        event = Event.query.get(invitation.event_id)
        if not event or event.is_deleted:
            return jsonify({"error": "Event no longer exists"}), 404

        # Get response from request body (POST) - more secure than GET params
        data = request.get_json() or {}
        response = data.get('response')  # 'accept' or 'decline'

        if response not in ['accept', 'decline']:
            return jsonify({"error": "Invalid response. Must be 'accept' or 'decline'"}), 400

        # Check if already responded
        if invitation.status != 'pending':
            # Return existing response for frontend to display
            return jsonify({
                "already_responded": True,
                "message": f"You have already {invitation.status} this invitation",
                "status": invitation.status,
                "guest_name": invitation.guest_name or "Guest",
                "event": {
                    "title": event.title,
                    "description": event.description,
                    "date": event.date.isoformat(),
                    "time": event.time.strftime('%I:%M %p'),
                    "location": event.location,
                }
            }), 200

        # Update invitation status
        invitation.status = 'accepted' if response == 'accept' else 'declined'
        invitation.responded_at = datetime.now(timezone.utc)
        
        db.session.commit()

        # Format event date and time nicely
        event_datetime = f"{event.date.strftime('%B %d, %Y')} at {event.time.strftime('%I:%M %p')}"

        return jsonify({
            "success": True,
            "already_responded": False,
            "message": f"Thank you! You have {invitation.status} the invitation to {event.title}",
            "status": invitation.status,
            "guest_name": invitation.guest_name or "Guest",
            "event": {
                "title": event.title,
                "description": event.description,
                "date": event.date.isoformat(),
                "time": event.time.strftime('%I:%M %p'),
                "location": event.location,
                "datetime_formatted": event_datetime
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Failed to process RSVP",
            "details": str(e)
        }), 500