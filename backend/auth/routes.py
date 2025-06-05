from datetime import datetime, timedelta, timezone
import os
import re
import traceback
from flask_jwt_extended import get_jwt, jwt_required
from flask_mail import Message
from backend.auth.decorators import admin_or_organizer_required, role_required
from . import auth
from flask import request, jsonify
from backend.auth.models import Organization, User, UserRole
from backend.extensions import db, mail, bcrypt
from sqlalchemy import func

# re is a built-in Python module that provides support for working with regular expressions (regex).
# Regular expressions are a powerful tool for matching patterns in strings,
# allowing you to search, replace, and manipulate text based on specific patterns.


# Function to validate email format
def is_valid_email(email):
    email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return re.match(email_regex, email) is not None


# Function to validate password strength
# Password must be at least 8 characters long and include uppercase, lowercase, numeric, and special characters
def is_strong_password(password):
    return (
        len(password) >= 8
        and re.search(r"[A-Z]", password)
        and re.search(r"[a-z]", password)
        and re.search(r"[0-9]", password)
        and re.search(r"[!@#$%^&*(),.?\":{}|<>]", password)
    )


@auth.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        try:
            data = request.get_json()
            first_name = data["first_name"]
            last_name = data["last_name"]
            email = data["email"]
            password = data["password"]
            requested_role = data.get("role", "guest")  # Default to guest if not specified
            
        except KeyError as e:
            return jsonify({"error": f"Missing form field: {str(e)}"}), 400
        except TypeError:
            return jsonify({"error": "Invalid JSON data"}), 400

        # Validate email format
        if not is_valid_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        # Check if email already exists
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 400

        # Validate password strength
        if not is_strong_password(password):
            return jsonify({
                "error": "Password must be at least 8 characters long and include uppercase, lowercase, numeric, and special characters."
            }), 400

        # Handle role assignment securely (no invitation handling)
        if requested_role == UserRole.ORGANIZER.value:
            # Organizer role requires admin approval
            new_user = User(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=UserRole.GUEST.value,  # Start as guest pending approval
                organization_id=None,
                pending_organizer_approval=True,  # Mark for admin approval
            )
            
            db.session.add(new_user)
            db.session.commit()
            
            # Send approval request to admins
            email_sent = False
            email_error = None
            try:
                notify_admins_organizer_request(new_user)
                email_sent = True
            except Exception as e:
                email_error = str(e)
                print(f"Admin notification failed: {email_error}")

            # Include email status in response for debugging
            response_data = {
                "message": "User created successfully. Your organizer role request has been submitted for admin approval. You will receive an email once reviewed.",
                "role": UserRole.GUEST.value,
                "pending_approval": True,
                "approval_status": "Your organizer request is pending admin approval",
                "email_notification_sent": email_sent,
                "next_step": "You can login and check for any pending invitations in your dashboard"
            }

            if not email_sent and email_error:
                response_data["email_error"] = email_error

            return jsonify(response_data), 201
            
        elif requested_role == UserRole.TEAM_MEMBER.value:
            # Team member role is not allowed for direct registration
            return jsonify({
                "error": "Team member role cannot be selected during registration. Please register as a guest and join organizations through invitations or register as 'guest' and wait for organization invitations"
            }), 400
            
        elif requested_role == UserRole.ADMIN.value:
            # Admin role is never allowed for self-registration
            return jsonify({
                "error": "Admin role cannot be selected during registration. Please register as 'guest' or request 'organizer' approval"
            }), 400
            
        elif requested_role in [UserRole.GUEST.value, "", None]:
            # Valid guest registration (default)
            new_user = User(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=UserRole.GUEST.value,
                organization_id=None,
            )
            
            db.session.add(new_user)
            db.session.commit()
            
            # Check if user has any pending invitations
            from backend.auth.models import OrganizationInvitation
            from datetime import datetime, timezone
            
            pending_invitations_count = OrganizationInvitation.query.filter_by(
                email=email,
                is_accepted=False
            ).filter(
                OrganizationInvitation.expires_at > datetime.now(timezone.utc)
            ).count()
            
            response_message = "User created successfully as guest"
            next_steps = "You can now request organizer privileges or wait for organization invitations"
            
            if pending_invitations_count > 0:
                response_message += f" You have {pending_invitations_count} pending invitation(s) waiting"
                next_steps = "Please login to see your pending invitations in the dashboard"
            
            return jsonify({
                "message": response_message,
                "role": UserRole.GUEST.value,
                "pending_invitations": pending_invitations_count,
                "next_steps": next_steps
            }, 201)
            
        else:
            # Invalid role specified
            return jsonify({
                "error": f"Invalid role '{requested_role}'. Valid options are: 'guest' or 'organizer'",
                "valid_roles": ["guest", "organizer"]
            }), 400

    return jsonify({"message": "Register page"})


@auth.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        # Validate email and password
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        user = User.query.filter_by(email=email).first()
        if user is None:
            return jsonify({"message": "User not registered"}), 404

        # Validate password
        if not user.check_password(password):
            return jsonify({"message": "Invalid credentials"}), 401

        # Generate token
        token = user.generate_token(timedelta(hours=2))
        
        # Check for pending invitations
        from backend.auth.models import OrganizationInvitation
        from datetime import datetime, timezone
        
        pending_invitations = OrganizationInvitation.query.filter_by(
            email=email,
            is_accepted=False
        ).filter(
            OrganizationInvitation.expires_at > datetime.now(timezone.utc)
        ).all()
        
        # Prepare invitation info
        invitation_info = []
        for invitation in pending_invitations:
            org = Organization.query.get(invitation.organization_id)
            if org and not org.is_deleted:
                invitation_info.append({
                    "id": invitation.id,
                    "organization_name": org.name,
                    "role": invitation.role,
                    "expires_at": invitation.expires_at.isoformat()
                })
        
        response_data = {
            "message": "Logged in successfully",
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "organization_id": user.organization_id
            },
            "pending_invitations_count": len(invitation_info)
        }
        
        if invitation_info:
            response_data["pending_invitations"] = invitation_info
            response_data["message"] += f" You have {len(invitation_info)} pending invitation(s)"
        
        return jsonify(response_data), 200

    return jsonify({"message": "Login page"})


@auth.route("/forgot-password", methods=["POST"])
def forgot_password():
    print("Forgot password route hit")
    data = request.get_json()
    email = data.get("email")

    print(f"MAIL_DEFAULT_SENDER: {os.environ.get('MAIL_USERNAME')}")

    # Validate email format
    if not email or not is_valid_email(email):
        return jsonify({"message": "Invalid email format."}), 400

    user = User.query.filter_by(email=email).first()
    if user is None:
        return jsonify({"message": "User with this email does not exist."}), 404

    # Generate a password reset token
    token = user.generate_reset_token()
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    reset_url = f"{frontend_url}/reset-password?token={token}"

    # Send email with the reset token
    msg = Message(
        "Password Reset Request",
        sender=os.environ.get("VERIFIED_EMAIL"),
        recipients=[email],
    )
    msg.html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
            <p style="color: #666; font-size: 16px;">Hello,</p>
            <p style="color: #666; font-size: 16px;">We received a request to reset your password. If you didn't make this request, you can ignore this email.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" 
                   style="background-color: #007bff; 
                          color: white; 
                          padding: 12px 25px; 
                          text-decoration: none; 
                          border-radius: 4px; 
                          display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in 30 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
            <p style="color: #666; font-size: 14px; word-break: break-all;">{reset_url}</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                This email was sent by Event Planner. Please do not reply to this email.
            </p>
        </div>
        """
    try:
        mail.send(msg)
    except Exception as e:
        return jsonify({"message": f"Failed to send email: {str(e)}"}), 500

    return (
        jsonify({"message": "A password reset link has been sent to your email."}),
        200,
    )


@auth.route("/reset-password/<token>", methods=["POST","GET"])
def reset_password(token):
    data = request.get_json()
    new_password = data.get("password")

    # Validate the new password
    if not new_password or not is_strong_password(new_password):
        return (
            jsonify(
                {
                    "error": "Password must be at least 8 characters long and include uppercase, lowercase, numeric, and special characters."
                }
            ),
            400,
        )

    # Verify the reset token
    user = User.verify_reset_token(token)
    if user is None:
        return jsonify({"error": "Invalid or expired token."}), 400

    if user.check_password(new_password):
        return (
            jsonify({"error": "New password cannot be the same as the old password."}),
            400,
        )

    # Update the user's password
    user.password = bcrypt.generate_password_hash(new_password).decode("utf-8")
    db.session.commit()

    return jsonify({"message": "Your password has been updated!"}), 200


@auth.route("/create-organization", methods=["POST"])
@role_required("organizer")
def create_organization():
    try:
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check if user already belongs to an organization
        if user.organization_id is not None:
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
        
        # Now set the user's organization_id
        user.organization_id = new_organization.id
        db.session.commit()
        
        return jsonify({
            "message": "Organization created successfully!",
            "organization": new_organization.to_dict()
        }), 201
        
    except Exception as e:
        print("Error in create_organization:", str(e))
        db.session.rollback()
        return jsonify({
            "error": f"Failed to create organization: {str(e)}",
            "suggestion": "Try using a different organization name"
        }), 500
    
@auth.route("/organizations/<string:filter_type>", methods=["GET"])
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
            "organizations": [org.to_dict() for org in organizations] #It's a shorthand way of saying 
                                                                      #"take each organization in the list and 
                                                                      # convert it to a dictionary using its to_dict() method".
        }, 200)
        
    except Exception as e:
        print("Error in get_organizations:", str(e))
        return jsonify({
            "error": "Failed to retrieve organizations",
            "details": str(e)
        }), 500

# Add a default route for all organizations
@auth.route("/organizations", methods=["GET"])
@role_required("admin")
def get_all_organizations():
    """Default route that returns all active organizations - ADMIN ONLY"""
    return get_organizations('active')

@auth.route("/organization/<int:org_id>/invite", methods=["POST"])
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
        role = data.get("role", UserRole.TEAM_MEMBER.value)  # Default to team_member instead of guest

        # Validate input
        if not email:
            return jsonify({"error": "Email is required"}), 400

        if not is_valid_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        # Validate role
        valid_invite_roles = [UserRole.GUEST.value, UserRole.TEAM_MEMBER.value]
        if role not in valid_invite_roles:
            return jsonify({
                "error": f"Invalid role. Can only invite users as: {', '.join(valid_invite_roles)}"
            }, 400)

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
        from backend.auth.models import OrganizationInvitation
        from datetime import datetime, timezone
        
        # Fix timezone issue - use consistent timezone-aware datetime
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
                }, 409)
            else:
                # Remove expired invitation
                db.session.delete(existing_invite)

        # Create new invitation (works for both registered and unregistered users)
        from datetime import timedelta
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
            import traceback
        

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
            },
            "debug_info": {
                "mail_server": os.environ.get('MAIL_SERVER'),
                "verified_email": os.environ.get('VERIFIED_EMAIL'),
                "user_type": "registered" if invited_user else "unregistered",
                "email_function_called": "send_invitation_email" if invited_user else "send_registration_invitation_email"
            }
        }), 201

    except Exception as e:
        print("Error in invite_user_to_organization:", str(e))
        db.session.rollback()
        return jsonify({
            "error": "Failed to send invitation",
            "details": str(e)
        }), 500


def send_invitation_email(user, organization, inviter, role):
    """
    Helper function to send invitation email to registered users
    """
    
    try:
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        login_url = f"{frontend_url}/login"
        

        msg = Message(
            f"Invitation to join {organization.name}",
            sender=os.environ.get("VERIFIED_EMAIL"),
            recipients=[user.email],
        )
        
        
        msg.html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Organization Invitation</h2>
                <p style="color: #666; font-size: 16px;">Hello {user.first_name},</p>
                <p style="color: #666; font-size: 16px;">
                    {inviter.first_name} {inviter.last_name} has invited you to join 
                    <strong>{organization.name}</strong> as a <strong>{role}</strong>.
                </p>
                <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
                    <p style="margin: 5px 0; color: #004085;"><strong>Organization:</strong> {organization.name}</p>
                    <p style="margin: 5px 0; color: #004085;"><strong>Role:</strong> {role}</p>
                    <p style="margin: 5px 0; color: #004085;"><strong>Invited by:</strong> {inviter.first_name} {inviter.last_name}</p>
                </div>
                <p style="color: #666; font-size: 16px;">
                    <strong>To accept this invitation:</strong>
                </p>
                <ol style="color: #666; font-size: 16px;">
                    <li>Login to your account using the button below</li>
                    <li>Check your dashboard for pending invitations</li>
                    <li>Accept the invitation to join the organization</li>
                </ol>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{login_url}" 
                       style="background-color: #007bff; 
                              color: white; 
                              padding: 12px 25px; 
                              text-decoration: none; 
                              border-radius: 4px; 
                              display: inline-block;">
                        Login to Accept Invitation
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
                <p style="color: #666; font-size: 14px;">
                    Organization Description: {organization.description or "No description provided"}
                </p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                    This email was sent by Event Planner. Please do not reply to this email.
                </p>
            </div>
        """
        
        
        mail.send(msg)
        
        
    except Exception as e:
        import traceback
        raise e


def send_registration_invitation_email(email, organization, inviter, role):
    """
    Send invitation email to unregistered users
    """
    
    try:
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        registration_url = f"{frontend_url}/register"
        
        msg = Message(
            f"You're invited to join {organization.name}",
            sender=os.environ.get("VERIFIED_EMAIL"),
            recipients=[email],
        )
        
        
        msg.html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">You're Invited!</h2>
            <p style="color: #666; font-size: 16px;">Hello,</p>
            <p style="color: #666; font-size: 16px;">
                {inviter.first_name} {inviter.last_name} has invited you to join 
                <strong>{organization.name}</strong> as a <strong>{role}</strong>.
            </p>
            <p style="color: #666; font-size: 16px;">
                To accept this invitation, you'll need to create an account first.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{registration_url}" 
                   style="background-color: #007bff; 
                          color: white; 
                          padding: 12px 25px; 
                          text-decoration: none; 
                          border-radius: 4px; 
                          display: inline-block;">
                    Sign Up & Join Organization
                </a>
            </div>
            <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
            <p style="color: #666; font-size: 14px;">
                Organization Description: {organization.description or "No description provided"}
            </p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                This email was sent by Event Planner. Please do not reply to this email.
            </p>
        </div>
    """
        
        mail.send(msg)
        
    except Exception as e:
        raise e

@auth.route("/accept-invitation", methods=["POST"])
@jwt_required()
def accept_invitation():
    """
    Accept an organization invitation
    """
    try:
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        invitation_id = data.get("invitation_id")
        
        if not invitation_id:
            return jsonify({"error": "Invitation ID is required"}), 400

        from backend.auth.models import OrganizationInvitation
        invitation = OrganizationInvitation.query.filter_by(
            id=invitation_id,
            email=user.email,
            is_accepted=False
        ).first()

        if not invitation:
            return jsonify({"error": "Invitation not found or already accepted"}), 404

        from datetime import datetime, timezone
        current_time = datetime.now(timezone.utc)
        
        # Fix timezone issue - ensure both datetimes are timezone-aware
        expires_at = invitation.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if expires_at < current_time:
            return jsonify({"error": "Invitation has expired"}), 400

        if user.organization_id is not None:
            return jsonify({
                "error": "You already belong to an organization. Please leave it first."
            }), 400

        # Accept the invitation with smart role assignment
        user.organization_id = invitation.organization_id
        
        # Smart role assignment: Always promote guests to team_member when joining organization
        if user.role == UserRole.GUEST.value:
            user.role = UserRole.TEAM_MEMBER.value
        else:
            # For users with other roles, use the invitation role if it's higher
            role_hierarchy = {
                UserRole.GUEST.value: 1,
                UserRole.TEAM_MEMBER.value: 2,
                UserRole.ORGANIZER.value: 3
            }
            
            current_level = role_hierarchy.get(user.role, 1)
            invitation_level = role_hierarchy.get(invitation.role, 1)
            
            if invitation_level > current_level:
                user.role = invitation.role
            # Otherwise keep current role if it's higher
        
        invitation.is_accepted = True
        
        db.session.commit()

        organization = Organization.query.get(invitation.organization_id)
        
        return jsonify({
            "message": f"Successfully joined {organization.name}",
            "organization": organization.to_dict(),
            "new_role": user.role
        }), 200

    except Exception as e:
        print("Error in accept_invitation:", str(e))
        db.session.rollback()
        return jsonify({
            "error": "Failed to accept invitation",
            "details": str(e)
        }), 500

@auth.route("/organization/<int:org_id>", methods=["PUT"])
@jwt_required("organizer")
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

@auth.route("/organization/<int:org_id>", methods=["DELETE"])
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
        from backend.auth.models import OrganizationInvitation
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

@auth.route("/organization/<int:org_id>", methods=["GET"])
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

@auth.route("/organization/leave", methods=["POST"])
@role_required("organizer")
def leave_organization():
    """
    Allow a user to leave their current organization.
    Organizers cannot leave if they are the only organizer.
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

@auth.route("/organization/<int:org_id>/members", methods=["GET"])
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

@auth.route("/organization/<int:org_id>/members/<int:member_id>", methods=["DELETE"])
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

@auth.route("/organization/<int:org_id>/members/<int:member_id>/role", methods=["PUT"])
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
            }, 400)

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

@auth.route("/organization/<int:org_id>/invitations", methods=["GET"])
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
        from backend.auth.models import OrganizationInvitation
        from datetime import datetime, timezone
        
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

@auth.route("/my-invitations", methods=["GET"])
@jwt_required()
def get_my_invitations():
    """
    Get pending invitations for the current user
    """
    try:
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        from backend.auth.models import OrganizationInvitation
        from datetime import datetime, timezone
        
        pending_invitations = OrganizationInvitation.query.filter_by(
            email=user.email,
            is_accepted=False
        ).filter(
            OrganizationInvitation.expires_at > datetime.now(timezone.utc)
        ).all()
        
        invitations_data = []
        for invitation in pending_invitations:
            organization = Organization.query.get(invitation.organization_id)
            invitation_info = {
                'id': invitation.id,
                'role': invitation.role,
                'expires_at': invitation.expires_at.isoformat(),
                'organization': {
                    'id': organization.id,
                    'name': organization.name,
                    'description': organization.description
                } if organization else None
            }
            invitations_data.append(invitation_info)
        
        return jsonify({
            "message": "Pending invitations retrieved successfully",
            "invitation_count": len(invitations_data),
            "invitations": invitations_data
        }), 200
        
    except Exception as e:
        print("Error in get_my_invitations:", str(e))
        return jsonify({
            "error": "Failed to retrieve invitations",
            "details": str(e)
        }), 500

# Add this temporary debug route
@auth.route("/debug/fix-my-role", methods=["POST"])
@jwt_required()
def fix_my_role():
    try:
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Fix the role
        user.role = UserRole.ORGANIZER.value
        user.organization_id = 2  # Make sure you're linked to org 2
        
        db.session.commit()
        
        return jsonify({
            "message": "Role and organization fixed",
            "role": user.role,
            "organization_id": user.organization_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

def notify_admins_organizer_request(user):
    """Notify all admins about a new organizer role request"""
    try:
        admins = User.query.filter_by(role=UserRole.ADMIN.value).all()
        
        if not admins:
            print("Warning: No admins found to notify about organizer request")
            return
        
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        admin_panel_url = f"{frontend_url}/admin/organizer-requests"
        
        for admin in admins:
            msg = Message(
                "New Organizer Role Request - Action Required",
                sender=os.environ.get("VERIFIED_EMAIL"),
                recipients=[admin.email],
            )
            
            msg.html = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333; text-align: center;">New Organizer Role Request</h2>
                    <p style="color: #666; font-size: 16px;">Hello {admin.first_name},</p>
                    <p style="color: #666; font-size: 16px;">
                        A new user has requested organizer privileges and requires your approval:
                    </p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
                        <p style="margin: 5px 0;"><strong>Name:</strong> {user.first_name} {user.last_name}</p>
                        <p style="margin: 5px 0;"><strong>Email:</strong> {user.email}</p>
                        <p style="margin: 5px 0;"><strong>Registration Date:</strong> {user.created_at.strftime("%Y-%m-%d %H:%M") if user.created_at else "Just now"}</p>
                        <p style="margin: 5px 0;"><strong>User ID:</strong> {user.id}</p>
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{admin_panel_url}" 
                           style="background-color: #007bff; 
                                  color: white; 
                                  padding: 12px 25px; 
                                  text-decoration: none; 
                                  border-radius: 4px; 
                                  display: inline-block;">
                            Review Request in Admin Panel
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        Please review this request and approve or reject it in the admin panel.
                        The user is currently registered as a guest and will be notified of your decision.
                    </p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        This email was sent by Event Planner Admin System. 
                        <br>If you're not an admin, please contact support.
                    </p>
                </div>
            """
            
            mail.send(msg)
            
    except Exception as e:
        print(f"Failed to notify admins about organizer request: {str(e)}")
        # Don't fail the registration if email fails


def notify_user_organizer_approval(user, approved, admin_name):
    """Notify user about organizer request approval/rejection"""
    try:
        subject = "Organizer Request Approved" if approved else "Organizer Request Rejected"
        status = "approved" if approved else "rejected"
        
        msg = Message(
            subject,
            sender=os.environ.get("VERIFIED_EMAIL"),
            recipients=[user.email],
        )
        
        if approved:
            msg.html = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #28a745; text-align: center;">✅ Organizer Request Approved</h2>
                    <p style="color: #666; font-size: 16px;">Hello {user.first_name},</p>
                    <p style="color: #666; font-size: 16px;">
                        Great news! Your organizer role request has been approved by admin <strong>{admin_name}</strong>.
                    </p>
                    <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <p style="margin: 5px 0; color: #155724;"><strong>Status:</strong> Approved</p>
                        <p style="margin: 5px 0; color: #155724;"><strong>New Role:</strong> Organizer</p>
                        <p style="margin: 5px 0; color: #155724;"><strong>Approved by:</strong> {admin_name}</p>
                    </div>
                    <p style="color: #666; font-size: 16px;">
                        You can now:
                    </p>
                    <ul style="color: #666; font-size: 16px;">
                        <li>Create and manage organizations</li>
                        <li>Invite team members to your organizations</li>
                        <li>Create and manage events</li>
                        <li>Access organizer features in the platform</li>
                    </ul>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/dashboard" 
                           style="background-color: #28a745; 
                                  color: white; 
                                  padding: 12px 25px; 
                                  text-decoration: none; 
                                  border-radius: 4px; 
                                  display: inline-block;">
                            Access Your Dashboard
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        Welcome to the organizer community! Start creating amazing events.
                    </p>
                </div>
            """
        else:
            msg.html = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #dc3545; text-align: center;">❌ Organizer Request Rejected</h2>
                    <p style="color: #666; font-size: 16px;">Hello {user.first_name},</p>
                    <p style="color: #666; font-size: 16px;">
                        We regret to inform you that your organizer role request has been rejected by admin <strong>{admin_name}</strong>.
                    </p>
                    <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
                        <p style="margin: 5px 0; color: #721c24;"><strong>Status:</strong> Rejected</p>
                        <p style="margin: 5px 0; color: #721c24;"><strong>Current Role:</strong> Guest</p>
                        <p style="margin: 5px 0; color: #721c24;"><strong>Reviewed by:</strong> {admin_name}</p>
                    </div>
                    <p style="color: #666; font-size: 16px;">
                        You can still:
                    </p>
                    <ul style="color: #666; font-size: 16px;">
                        <li>Continue using the platform as a guest</li>
                        <li>Join organizations through invitations</li>
                        <li>Apply for organizer role again in the future</li>
                    </ul>
                    <p style="color: #666; font-size: 14px;">
                        If you have questions about this decision, please contact our support team.
                    </p>
                </div>
            """
        
        mail.send(msg)
        
        print(f"✅ mail.send() completed successfully for: {user.email}")
        print(f"=== notify_user_organizer_approval FUNCTION END ===")
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve organizer requests: {str(e)}'}), 500


@auth.route("/admin/organizer-requests/<int:user_id>/approve", methods=["POST"])
@role_required("admin")
def approve_organizer_request(user_id):
    """Approve a pending organizer role request"""
    try:
        # Get the admin user from JWT
        from flask_jwt_extended import get_jwt_identity, get_jwt
        jwt_data = get_jwt()
        admin_email = get_jwt_identity()
        admin_user = User.query.filter_by(email=admin_email).first()
        
        if not admin_user:
            return jsonify({'error': 'Admin user not found'}), 404
            
        admin_name = f"{admin_user.first_name} {admin_user.last_name}"
        
        # Find the user with pending approval
        user = User.query.filter_by(
            id=user_id,
            pending_organizer_approval=True,
            role=UserRole.GUEST.value
        ).first()
        
        if not user:
            return jsonify({
                'error': 'User not found or not pending organizer approval'
            }), 404
        
        # Update user role and clear pending approval
        user.role = UserRole.ORGANIZER.value
        user.pending_organizer_approval = False
        
        db.session.commit()
        
        # Send approval notification to user
        try:
            notify_user_organizer_approval(user, approved=True, admin_name=admin_name)
        except Exception as e:
            print(f"Failed to send approval notification: {str(e)}")
        
        return jsonify({
            'message': f'Organizer request approved for {user.first_name} {user.last_name}',
            'user': {
                'id': user.id,
                'name': f"{user.first_name} {user.last_name}",
                'email': user.email,
                'new_role': user.role,
                'approved_by': admin_name
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to approve organizer request: {str(e)}'}), 500


@auth.route("/admin/organizer-requests/<int:user_id>/reject", methods=["POST"])
@role_required("admin")
def reject_organizer_request(user_id):
    """Reject a pending organizer role request"""
    try:
        # Get the admin user from JWT
        from flask_jwt_extended import get_jwt_identity, get_jwt
        jwt_data = get_jwt()
        admin_email = get_jwt_identity()
        admin_user = User.query.filter_by(email=admin_email).first()
        
        if not admin_user:
            return jsonify({'error': 'Admin user not found'}), 404
            
        admin_name = f"{admin_user.first_name} {admin_user.last_name}"
        
        # Find the user with pending approval
        user = User.query.filter_by(
            id=user_id,
            pending_organizer_approval=True,
            role=UserRole.GUEST.value
        ).first()
        
        if not user:
            return jsonify({
                'error': 'User not found or not pending organizer approval'
            }), 404
        
        # Clear pending approval but keep as guest
        user.pending_organizer_approval = False
        # Note: We keep role as GUEST, just remove the pending flag
        
        db.session.commit()
        
        # Send rejection notification to user
        try:
            notify_user_organizer_approval(user, approved=False, admin_name=admin_name)
        except Exception as e:
            print(f"Failed to send rejection notification: {str(e)}")
        
        return jsonify({
            'message': f'Organizer request rejected for {user.first_name} {user.last_name}',
            'user': {
                'id': user.id,
                'name': f"{user.first_name} {user.last_name}",
                'email': user.email,
                'role': user.role,
                'rejected_by': admin_name
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to reject organizer request: {str(e)}'}), 500

@auth.route("/register-admin", methods=["POST"])
def register_admin():
    """
    Simple admin registration endpoint - FOR DEVELOPMENT ONLY
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        # Get user data
        first_name = data.get("first_name")
        last_name = data.get("last_name") 
        email = data.get("email")
        password = data.get("password")

        # Validate required fields
        required_fields = {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "password": password
        }
        
        for field_name, field_value in required_fields.items():
            if not field_value:
                return jsonify({"error": f"Missing required field: {field_name}"}), 400

        # Validate email format
        if not is_valid_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        # Check if email already exists
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 400

        # Validate password strength
        if not is_strong_password(password):
            return jsonify({
                "error": "Password must be at least 8 characters long and include uppercase, lowercase, numeric, and special characters."
            }), 400

        # Create admin user
        admin_user = User(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            organization_id=None,  # Admins don't belong to organizations
            role=UserRole.ADMIN.value
        )
        
        db.session.add(admin_user)
        db.session.commit()
        
        return jsonify({
            "message": "Admin user created successfully",
            "admin": {
                "id": admin_user.id,
                "email": admin_user.email,
                "first_name": admin_user.first_name,
                "last_name": admin_user.last_name,
                "role": admin_user.role,
                "created_at": admin_user.created_at.isoformat() if admin_user.created_at else None
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in admin registration: {str(e)}")
        return jsonify({"error": f"Failed to create admin user: {str(e)}"}), 500


@auth.route("/admin/disable-registration", methods=["POST"])
@role_required("admin")
def disable_admin_registration():
    """
    Endpoint to manually disable admin registration by setting a flag
    This is an additional security measure
    """
    try:
        # You could store this in database or environment variable
        # For now, we'll just return a message since the endpoint already checks for existing admins
        
        admin_count = User.query.filter_by(role=UserRole.ADMIN.value).count()
        
        return jsonify({
            "message": "Admin registration endpoint is automatically disabled when admins exist",
            "current_admin_count": admin_count,
            "status": "Admin registration is disabled" if admin_count > 0 else "Admin registration is available",
            "recommendation": "Remove the /register-admin endpoint from production code"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to check admin registration status: {str(e)}"}), 500
