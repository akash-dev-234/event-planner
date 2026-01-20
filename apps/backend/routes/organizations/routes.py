import os
from datetime import datetime, timedelta, timezone
from flask import request, jsonify
from flask_jwt_extended import get_jwt, jwt_required
from sqlalchemy import func

from . import organization_bp as organization
from decorators import admin_or_organizer_required, role_required
from models import Organization, User, UserRole, OrganizationInvitation
from extensions import db
from utils.validators import is_valid_email
from utils.email_helpers import send_invitation_email, send_registration_invitation_email


@organization.route("/create", methods=["POST"])
@role_required("organizer", "admin")
def create_organization():
    try:
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user_role = jwt_data.get('role')
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check if user already belongs to an organization (admins can create without joining)
        if user.organization_id is not None and user_role != 'admin':
            current_org = Organization.query.get(user.organization_id)
            return jsonify({
                "error": f"You already belong to an organization: {current_org.name}. Please leave it first before creating a new one."
            }), 400

        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        name = data.get("name")
        description = data.get("description")

        if not name:
            return jsonify({"error": "Organization name is required"}), 400
            
        if name.strip() == "":
            return jsonify({"error": "Organization name cannot be empty or just whitespace"}), 400

        # Clean the name
        clean_name = name.strip()

        # Check if organization name already exists (including soft-deleted ones)
        existing_org = Organization.query.filter(
            func.lower(Organization.name) == func.lower(clean_name)
        ).first()

        if existing_org:
            if existing_org.is_deleted:
                return jsonify({
                    "error": f"Organization name '{clean_name}' was previously used by a deleted organization. Please choose a different name.",
                    "suggestion": f"Try '{clean_name}_2025' or '{clean_name}_new'"
                }), 409
            else:
                return jsonify({
                    "error": f"Organization name '{clean_name}' already exists. Please choose a different name.",
                    "existing_org_id": existing_org.id
                }), 409

        # Create new organization
        new_organization = Organization(
            name=clean_name,
            description=description.strip() if description else None
        )

        db.session.add(new_organization)
        db.session.flush()  # This assigns an ID without committing

        # Set the user's organization_id (admins don't join, they just create)
        if user_role != 'admin':
            user.organization_id = new_organization.id

        db.session.commit()

        message = "Organization created successfully!"
        if user_role == 'admin':
            message += " (Admin users are not automatically assigned to organizations)"

        return jsonify({
            "message": message,
            "organization": new_organization.to_dict()
        }), 201
        
    except Exception as e:
        print("Error in create_organization:", str(e))
        db.session.rollback()
        return jsonify({
            "error": f"Failed to create organization: {str(e)}",
            "suggestion": "Try using a different organization name"
        }), 500


@organization.route("/list/<string:filter_type>", methods=["GET"])
@role_required("admin")
def get_organizations(filter_type='all'):
    """
    Get organizations based on filter type.
    ADMIN ONLY - Can see all organizations
    """
    try:
        if filter_type not in ['all', 'active', 'deleted']:
            return jsonify({
                "error": "Invalid filter type. Must be 'all', 'active', or 'deleted'"
            }), 400
        
        # Get organizations based on filter type
        if filter_type == 'all':
            organizations = Organization.query.all()
        elif filter_type == 'active':
            organizations = Organization.get_active().all()
        else:  # deleted
            organizations = Organization.query.filter(
                Organization.deleted_at.isnot(None)
            ).all()
        
        return jsonify({
            "message": "Organizations retrieved successfully",
            "filter_type": filter_type,
            "count": len(organizations),
            "organizations": [org.to_dict() for org in organizations]
        }), 200
        
    except Exception as e:
        print("Error in get_organizations:", str(e))
        return jsonify({
            "error": "Failed to retrieve organizations",
            "details": str(e)
        }), 500


@organization.route("/list", methods=["GET"])
@role_required("admin")
def get_all_organizations():
    """Default route that returns all active organizations - ADMIN ONLY"""
    return get_organizations('active')


@organization.route("/<int:org_id>/invite", methods=["POST"])
@jwt_required()
def invite_user_to_organization(org_id):
    """
    Invite a user to join an organization.
    Works for both registered and unregistered users.
    Only organizers of the organization can send invites.
    """
    try:
        # Get the current user from JWT token
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        inviter = User.query.get(user_id)
        
        if not inviter:
            return jsonify({"error": "User not found"}), 404

        # Check if the inviter is an organizer and belongs to this organization
        if inviter.role != UserRole.ORGANIZER.value:
            return jsonify({"error": "Only organizers can send invitations"}), 403
            
        if inviter.organization_id != org_id:
            return jsonify({"error": "You can only invite users to your own organization"}), 403

        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        email = data.get("email")
        role = data.get("role", UserRole.TEAM_MEMBER.value)  # Only team_members can join organizations

        # Validate input
        if not email:
            return jsonify({"error": "Email is required"}), 400

        if not is_valid_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        # Validate role - only team_members can be invited to organizations
        # Guests should be invited to specific events, not organizations
        valid_invite_roles = [UserRole.TEAM_MEMBER.value]
        if role not in valid_invite_roles:
            return jsonify({
                "error": "Only team members can be invited to organizations. To invite guests, create events and invite them to specific events instead."
            }), 400

        # Check if organization exists and is active
        organization = Organization.query.get(org_id)
        if not organization:
            return jsonify({"error": "Organization not found"}), 404
            
        if organization.is_deleted:
            return jsonify({"error": "Cannot invite users to a deleted organization"}), 400

        # Check if the user exists (but don't require it)
        invited_user = User.query.filter_by(email=email).first()
        
        if invited_user:
            # User is registered - check constraints
            if invited_user.organization_id is not None:
                if invited_user.organization_id == org_id:
                    return jsonify({"error": "User is already a member of this organization"}), 400
                else:
                    return jsonify({
                        "error": "User already belongs to another organization. They must leave it first."
                    }), 400

            if invited_user.role == UserRole.ADMIN.value:
                return jsonify({"error": "Cannot invite admin users to organizations"}), 400

        # Check for existing pending invitation (for both registered and unregistered)
        current_time = datetime.now(timezone.utc)
        
        existing_invite = OrganizationInvitation.query.filter_by(
            email=email,
            organization_id=org_id,
            is_accepted=False
        ).first()

        if existing_invite:
            # Ensure expires_at is timezone-aware for comparison
            expires_at = existing_invite.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            if expires_at > current_time:
                return jsonify({
                    "error": "An active invitation already exists for this user",
                    "existing_invitation": {
                        "expires_at": expires_at.isoformat(),
                        "role": existing_invite.role
                    }
                }), 409
            else:
                # Remove expired invitation
                db.session.delete(existing_invite)

        # Create new invitation (works for both registered and unregistered users)
        new_invitation = OrganizationInvitation(
            email=email,
            role=role,
            organization_id=org_id,
            expires_at=current_time + timedelta(days=7)
        )
        
        db.session.add(new_invitation)
        db.session.commit()

        # Send different emails based on registration status
        email_sent = False
        email_error = None
        
        try:
            if invited_user:
                send_invitation_email(invited_user, organization, inviter, role)
                email_sent = True
            else:
                send_registration_invitation_email(email, organization, inviter, role)
                email_sent = True
        except Exception as e:
            email_error = str(e)

        message = "Invitation created successfully"
        if email_sent:
            message += " and email sent"
        else:
            message += f" but email failed to send"
            
        if not invited_user:
            message += ". The user will need to register first to accept the invitation."

        return jsonify({
            "message": message,
            "email_sent": email_sent,
            "email_error": email_error,
            "invitation": {
                "id": new_invitation.id,
                "email": email,
                "role": role,
                "organization": organization.name,
                "expires_at": new_invitation.expires_at.isoformat(),
                "user_registered": invited_user is not None
            }
        }), 201

    except Exception as e:
        print("Error in invite_user_to_organization:", str(e))
        db.session.rollback()
        return jsonify({
            "error": "Failed to send invitation",
            "details": str(e)
        }), 500


@organization.route("/<int:org_id>", methods=["PUT"])
@jwt_required()
def update_organization(org_id):
    """
    Update an organization's details.
    Only organizers of the organization can update it.
    """
    try:
        # Get the current user from JWT token
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check if the user is an organizer and belongs to this organization
        if user.role != UserRole.ORGANIZER.value:
            return jsonify({"error": "Only organizers can update organizations"}), 403
            
        if user.organization_id != org_id:
            return jsonify({"error": "You can only update your own organization"}), 403

        # Get the organization
        organization = Organization.query.get(org_id)
        if not organization:
            return jsonify({"error": "Organization not found"}), 404
            
        if organization.is_deleted:
            return jsonify({"error": "Cannot update a deleted organization"}), 400

        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        name = data.get("name")
        description = data.get("description")

        # Validate name if provided
        if name is not None:
            if not name.strip():
                return jsonify({"error": "Organization name cannot be empty"}), 400
            
            # Check if name already exists (excluding current organization)
            existing_org = Organization.query.filter(
                func.lower(Organization.name) == func.lower(name),
                Organization.deleted_at.is_(None),
                Organization.id != org_id
            ).first()
            
            if existing_org:
                return jsonify({
                    "error": "An organization with this name already exists"
                }), 409
            
            organization.name = name.strip()

        # Update description if provided
        if description is not None:
            organization.description = description.strip() if description.strip() else None

        db.session.commit()
        
        return jsonify({
            "message": "Organization updated successfully",
            "organization": organization.to_dict()
        }), 200
        
    except Exception as e:
        print("Error in update_organization:", str(e))
        db.session.rollback()
        return jsonify({
            "error": "Failed to update organization",
            "details": str(e)
        }), 500


@organization.route("/<int:org_id>", methods=["DELETE"])
@admin_or_organizer_required
def delete_organization(org_id):
    """
    Soft delete an organization.
    Only organizers of the organization can delete it.
    This will also handle removing users from the organization.
    """
    try:
        # Get the current user from JWT token
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check if the user is an organizer and belongs to this organization
        if user.role != UserRole.ORGANIZER.value:
            return jsonify({"error": "Only organizers can delete organizations"}), 403
            
        if user.organization_id != org_id:
            return jsonify({
                "error": f"You can only delete your own organization. Your org ID: {user.organization_id}, Requested org ID: {org_id}"
            }), 403

        # Get the organization
        organization = Organization.query.get(org_id)
        if not organization:
            return jsonify({"error": "Organization not found"}), 404
            
        if organization.is_deleted:
            return jsonify({"error": "Organization is already deleted"}), 400

        # Get all users in this organization
        org_users = User.query.filter_by(organization_id=org_id).all()
        
        # Remove all users from the organization (they become unaffiliated)
        for org_user in org_users:
            org_user.organization_id = None
            # Optionally, you might want to change their role to GUEST
            if org_user.role in [UserRole.ORGANIZER.value, UserRole.TEAM_MEMBER.value]:
                org_user.role = UserRole.GUEST.value

        # Soft delete the organization
        organization.soft_delete()
        
        # Cancel any pending invitations for this organization
        pending_invitations = OrganizationInvitation.query.filter_by(
            organization_id=org_id,
            is_accepted=False
        ).all()
        
        for invitation in pending_invitations:
            db.session.delete(invitation)

        db.session.commit()
        
        return jsonify({
            "message": "Organization deleted successfully",
            "affected_users": len(org_users),
            "cancelled_invitations": len(pending_invitations)
        }), 200
        
    except Exception as e:
        print("Error in delete_organization:", str(e))
        db.session.rollback()
        return jsonify({
            "error": "Failed to delete organization",
            "details": str(e)
        }), 500


@organization.route("/<int:org_id>", methods=["GET"])
@admin_or_organizer_required
def get_organization(org_id):
    """
    Get details of a specific organization.
    Users can only view their own organization details.
    """
    try:
        # Get the current user from JWT token
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get the organization
        organization = Organization.query.get(org_id)
        if not organization:
            return jsonify({"error": "Organization not found"}), 404

        # Check access permissions
        # Users can only view their own organization
        # Admins can view any organization
        if user.role != UserRole.ADMIN.value and user.organization_id != org_id:
            return jsonify({"error": "You can only view your own organization"}), 403

        # Get organization members (optional - include user list)
        members = User.query.filter_by(organization_id=org_id).all()
        
        org_data = organization.to_dict()
        org_data['members'] = [
            {
                'id': member.id,
                'first_name': member.first_name,
                'last_name': member.last_name,
                'email': member.email,
                'role': member.role,
                'created_at': member.created_at.isoformat() if member.created_at else None
            }
            for member in members
        ]
        org_data['member_count'] = len(members)
        
        return jsonify({
            "message": "Organization retrieved successfully",
            "organization": org_data
        }), 200
        
    except Exception as e:
        print("Error in get_organization:", str(e))
        return jsonify({
            "error": "Failed to retrieve organization",
            "details": str(e)
        }), 500


@organization.route("/leave", methods=["POST"])
@role_required("organizer", "team_member")
def leave_organization():
    """
    Allow a user to leave their current organization.
    Organizers cannot leave if they are the only organizer.
    Team members can leave freely.
    """
    try:
        # Get the current user from JWT token
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        if not user.organization_id:
            return jsonify({"error": "You are not a member of any organization"}), 400

        # If user is an organizer, check if they're the only organizer
        if user.role == UserRole.ORGANIZER.value:
            other_organizers = User.query.filter_by(
                organization_id=user.organization_id,
                role=UserRole.ORGANIZER.value
            ).filter(User.id != user.id).count()
            
            if other_organizers == 0:
                return jsonify({
                    "error": "You cannot leave the organization as you are the only organizer. Please transfer ownership or delete the organization first."
                }), 400

        organization_name = user.organization.name
        
        # Remove user from organization
        user.organization_id = None
        user.role = UserRole.GUEST.value  # Reset to guest role
        
        db.session.commit()
        
        return jsonify({
            "message": f"Successfully left {organization_name}",
            "new_role": UserRole.GUEST.value
        }), 200
        
    except Exception as e:
        print("Error in leave_organization:", str(e))
        db.session.rollback()
        return jsonify({
            "error": "Failed to leave organization",
            "details": str(e)
        }), 500


@organization.route("/<int:org_id>/members", methods=["GET"])
@admin_or_organizer_required
def get_organization_members(org_id):
    """
    Get all members of a specific organization with detailed information.
    Only organization members and admins can view the member list.
    """
    try:
        # Get the current user from JWT token
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get the organization
        organization = Organization.query.get(org_id)
        if not organization:
            return jsonify({"error": "Organization not found"}), 404

        if organization.is_deleted:
            return jsonify({"error": "Cannot view members of a deleted organization"}), 400

        # Check access permissions
        # Users can only view members of their own organization
        # Admins can view any organization's members
        if user.role != UserRole.ADMIN.value and user.organization_id != org_id:
            return jsonify({"error": "You can only view members of your own organization"}), 403

        # Get organization members
        members = User.query.filter_by(organization_id=org_id).all()
        
        members_data = []
        for member in members:
            member_info = {
                'id': member.id,
                'first_name': member.first_name,
                'last_name': member.last_name,
                'email': member.email,
                'role': member.role,
                'created_at': member.created_at.isoformat() if member.created_at else None,
                'is_current_user': member.id == user_id
            }
            members_data.append(member_info)

        # Sort members by role (organizers first, then team members, then guests)
        role_order = {
            UserRole.ORGANIZER.value: 1,
            UserRole.TEAM_MEMBER.value: 2,
            UserRole.GUEST.value: 3
        }
        members_data.sort(key=lambda x: role_order.get(x['role'], 4))
        
        return jsonify({
            "message": "Organization members retrieved successfully",
            "organization": {
                "id": organization.id,
                "name": organization.name,
                "description": organization.description
            },
            "member_count": len(members_data),
            "members": members_data
        }), 200
        
    except Exception as e:
        print("Error in get_organization_members:", str(e))
        return jsonify({
            "error": "Failed to retrieve organization members",
            "details": str(e)
        }), 500


@organization.route("/<int:org_id>/members/<int:member_id>", methods=["DELETE"])
@admin_or_organizer_required
def remove_organization_member(org_id, member_id):
    """
    Remove a member from an organization.
    Only organizers can remove members.
    Organizers cannot remove themselves if they're the only organizer.
    """
    try:
        # Get the current user from JWT token
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check if the user is an organizer and belongs to this organization
        if user.role != UserRole.ORGANIZER.value:
            return jsonify({"error": "Only organizers can remove members"}), 403
            
        if user.organization_id != org_id:
            return jsonify({"error": "You can only remove members from your own organization"}), 403

        # Get the organization
        organization = Organization.query.get(org_id)
        if not organization:
            return jsonify({"error": "Organization not found"}), 404

        if organization.is_deleted:
            return jsonify({"error": "Cannot remove members from a deleted organization"}), 400

        # Get the member to be removed
        member = User.query.get(member_id)
        if not member:
            return jsonify({"error": "Member not found"}), 404

        # Check if the member belongs to this organization
        if member.organization_id != org_id:
            return jsonify({"error": "User is not a member of this organization"}), 400

        # Prevent removing the last organizer
        if member.role == UserRole.ORGANIZER.value:
            organizer_count = User.query.filter_by(
                organization_id=org_id,
                role=UserRole.ORGANIZER.value
            ).count()
            
            if organizer_count <= 1:
                return jsonify({
                    "error": "Cannot remove the last organizer. Please promote another member to organizer first or delete the organization."
                }), 400

        # Store member info for response
        member_name = f"{member.first_name} {member.last_name}"
        
        # Remove member from organization
        member.organization_id = None
        member.role = UserRole.GUEST.value  # Reset to guest role
        
        db.session.commit()
        
        return jsonify({
            "message": f"{member_name} has been removed from {organization.name}",
            "removed_member": {
                "id": member.id,
                "name": member_name,
                "email": member.email
            }
        }), 200
        
    except Exception as e:
        print("Error in remove_organization_member:", str(e))
        db.session.rollback()
        return jsonify({
            "error": "Failed to remove organization member",
            "details": str(e)
        }), 500


@organization.route("/<int:org_id>/members/<int:member_id>/role", methods=["PUT"])
@admin_or_organizer_required
def change_member_role(org_id, member_id):
    """
    Change a member's role within an organization.
    Only organizers can change member roles.
    If role is changed to guest, the user is removed from the organization.
    """
    try:
        # Get the current user from JWT token
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check if the user is an organizer and belongs to this organization
        if user.role != UserRole.ORGANIZER.value:
            return jsonify({"error": "Only organizers can change member roles"}), 403
            
        if user.organization_id != org_id:
            return jsonify({"error": "You can only change roles in your own organization"}), 403

        # Get the organization
        organization = Organization.query.get(org_id)
        if not organization:
            return jsonify({"error": "Organization not found"}), 404

        if organization.is_deleted:
            return jsonify({"error": "Cannot change roles in a deleted organization"}), 400

        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        new_role = data.get("role")
        if not new_role:
            return jsonify({"error": "Role is required"}), 400

        # Validate the new role
        valid_org_roles = [UserRole.GUEST.value, UserRole.TEAM_MEMBER.value, UserRole.ORGANIZER.value]
        if new_role not in valid_org_roles:
            return jsonify({
                "error": f"Invalid role. Valid roles are: {', '.join(valid_org_roles)}"
            }), 400

        # Get the member whose role is being changed
        member = User.query.get(member_id)
        if not member:
            return jsonify({"error": "Member not found"}), 404

        # Check if the member belongs to this organization
        if member.organization_id != org_id:
            return jsonify({"error": "User is not a member of this organization"}), 400

        # Prevent demoting the last organizer
        if member.role == UserRole.ORGANIZER.value and new_role != UserRole.ORGANIZER.value:
            organizer_count = User.query.filter_by(
                organization_id=org_id,
                role=UserRole.ORGANIZER.value
            ).count()
            
            if organizer_count <= 1:
                return jsonify({
                    "error": "Cannot demote the last organizer. Please promote another member to organizer first."
                }), 400

        # Store old role for response
        old_role = member.role
        member_name = f"{member.first_name} {member.last_name}"
        
        # Update the member's role
        member.role = new_role
        
        # If the new role is guest, remove them from the organization
        if new_role == UserRole.GUEST.value:
            member.organization_id = None
            message = f"{member_name} has been changed to guest role and removed from {organization.name}"
            action = "removed_from_organization"
        else:
            message = f"{member_name}'s role has been changed from {old_role} to {new_role}"
            action = "role_changed"
        
        db.session.commit()
        
        return jsonify({
            "message": message,
            "action": action,
            "member": {
                "id": member.id,
                "name": member_name,
                "email": member.email,
                "old_role": old_role,
                "new_role": new_role,
                "organization_id": member.organization_id  # Will be None if removed
            }
        }), 200
        
    except Exception as e:
        print("Error in change_member_role:", str(e))
        db.session.rollback()
        return jsonify({
            "error": "Failed to change member role",
            "details": str(e)
        }), 500


@organization.route("/<int:org_id>/invitations", methods=["GET"])
@admin_or_organizer_required
def get_organization_invitations(org_id):
    """
    Get all pending invitations for an organization.
    Only organizers can view pending invitations.
    """
    try:
        # Get the current user from JWT token
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check if the user is an organizer and belongs to this organization
        if user.role != UserRole.ORGANIZER.value:
            return jsonify({"error": "Only organizers can view invitations"}), 403
            
        if user.organization_id != org_id:
            return jsonify({"error": "You can only view invitations for your own organization"}), 403

        # Get the organization
        organization = Organization.query.get(org_id)
        if not organization:
            return jsonify({"error": "Organization not found"}), 404

        # Get pending invitations
        pending_invitations = OrganizationInvitation.query.filter_by(
            organization_id=org_id,
            is_accepted=False
        ).filter(
            OrganizationInvitation.expires_at > datetime.now(timezone.utc)
        ).all()
        
        invitations_data = []
        for invitation in pending_invitations:
            invitation_info = {
                'id': invitation.id,
                'email': invitation.email,
                'role': invitation.role,
                'expires_at': invitation.expires_at.isoformat(),
                'created_at': invitation.created_at.isoformat() if hasattr(invitation, 'created_at') else None
            }
            invitations_data.append(invitation_info)
        
        return jsonify({
            "message": "Pending invitations retrieved successfully",
            "organization": organization.name,
            "invitation_count": len(invitations_data),
            "invitations": invitations_data
        }), 200
        
    except Exception as e:
        print("Error in get_organization_invitations:", str(e))
        return jsonify({
            "error": "Failed to retrieve organization invitations",
            "details": str(e)
        }), 500


# ==================== Admin Organization Management ====================

@organization.route("/admin/<int:org_id>/restore", methods=["POST"])
@role_required("admin")
def admin_restore_organization(org_id):
    """
    Restore a soft-deleted organization (Admin only)
    """
    try:
        organization = Organization.query.get(org_id)
        if not organization:
            return jsonify({"error": "Organization not found"}), 404

        if not organization.is_deleted:
            return jsonify({"error": "Organization is not deleted"}), 400

        # Restore the organization
        organization.is_deleted = False
        organization.deleted_at = None

        db.session.commit()

        return jsonify({
            "message": f"Organization '{organization.name}' restored successfully",
            "organization": organization.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Failed to restore organization",
            "details": str(e)
        }), 500


@organization.route("/admin/<int:org_id>", methods=["DELETE"])
@role_required("admin")
def admin_delete_organization(org_id):
    """
    Soft delete any organization (Admin only)
    Unlike the organizer delete, this can delete any org and optionally keep members
    """
    try:
        organization = Organization.query.get(org_id)
        if not organization:
            return jsonify({"error": "Organization not found"}), 404

        if organization.is_deleted:
            return jsonify({"error": "Organization is already deleted"}), 400

        data = request.get_json() or {}
        remove_members = data.get('remove_members', True)  # Default: remove members from org

        affected_users = 0
        cancelled_invitations = 0

        if remove_members:
            # Get all users in this organization
            org_users = User.query.filter_by(organization_id=org_id).all()
            affected_users = len(org_users)

            # Remove all users from the organization
            for org_user in org_users:
                org_user.organization_id = None
                if org_user.role in [UserRole.ORGANIZER.value, UserRole.TEAM_MEMBER.value]:
                    org_user.role = UserRole.GUEST.value

            # Cancel pending invitations
            pending_invitations = OrganizationInvitation.query.filter_by(
                organization_id=org_id,
                is_accepted=False
            ).all()
            cancelled_invitations = len(pending_invitations)

            for invitation in pending_invitations:
                db.session.delete(invitation)

        # Soft delete the organization
        organization.soft_delete()

        db.session.commit()

        return jsonify({
            "message": f"Organization '{organization.name}' deleted successfully",
            "affected_users": affected_users,
            "cancelled_invitations": cancelled_invitations
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Failed to delete organization",
            "details": str(e)
        }), 500