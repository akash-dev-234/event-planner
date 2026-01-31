from datetime import timedelta
import os
from flask_jwt_extended import get_jwt, jwt_required, get_jwt_identity
from flask_mail import Message
from flask import request, jsonify

from . import auth_bp as auth
from decorators import role_required
from models import Organization, User, UserRole, OrganizationInvitation
from extensions import db, mail, bcrypt
from utils.validators import is_valid_email, is_strong_password, is_non_empty_string, clean_string
from utils.email_helpers import notify_admins_organizer_request, notify_user_organizer_approval
from utils.rate_limiter import password_reset_rate_limit, email_rate_limit, registration_rate_limit, login_rate_limit


@auth.route("/register", methods=["GET", "POST"])
@registration_rate_limit
def register():
    if request.method == "POST":
        try:
            data = request.get_json()
            first_name = clean_string(data.get("first_name", ""))
            last_name = clean_string(data.get("last_name", ""))
            email = clean_string(data.get("email", ""))
            password = data.get("password", "")
            requested_role = data.get("role", "guest")  # Default to guest if not specified

        except TypeError:
            return jsonify({"error": "Invalid JSON data"}), 400

        # Validate required fields (reject empty or whitespace-only)
        if not first_name:
            return jsonify({"error": "First name is required"}), 400
        if not last_name:
            return jsonify({"error": "Last name is required"}), 400
        if not email:
            return jsonify({"error": "Email is required"}), 400
        if not password:
            return jsonify({"error": "Password is required"}), 400

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
            }), 201
            
        else:
            # Invalid role specified
            return jsonify({
                "error": f"Invalid role '{requested_role}'. Valid options are: 'guest' or 'organizer'",
                "valid_roles": ["guest", "organizer"]
            }), 400

    return jsonify({"message": "Register page"})


@auth.route("/login", methods=["GET", "POST"])
@login_rate_limit
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
@password_reset_rate_limit
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


@auth.route("/profile", methods=["GET"])
@jwt_required()
def get_user_profile():
    """
    Get current user profile information
    """
    try:
        # Get user email from JWT identity
        user_email = get_jwt_identity()
        user = User.query.filter_by(email=user_email).first()

        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role if isinstance(user.role, str) else user.role.value,
                "organization_id": user.organization_id
            }
        }), 200

    except Exception as e:
        return jsonify({
            "error": "Failed to fetch user profile",
            "details": str(e)
        }), 500


@auth.route("/profile", methods=["PUT"])
@jwt_required()
def update_user_profile():
    """
    Update current user profile information (first_name, last_name, email)
    """
    try:
        user_email = get_jwt_identity()
        user = User.query.filter_by(email=user_email).first()

        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Update first_name if provided
        if "first_name" in data and data["first_name"]:
            user.first_name = data["first_name"].strip()

        # Update last_name if provided
        if "last_name" in data and data["last_name"]:
            user.last_name = data["last_name"].strip()

        # Update email if provided and different
        if "email" in data and data["email"] and data["email"] != user.email:
            new_email = data["email"].strip().lower()

            # Validate email format
            if not is_valid_email(new_email):
                return jsonify({"error": "Invalid email format"}), 400

            # Check if email already exists
            existing_user = User.query.filter_by(email=new_email).first()
            if existing_user:
                return jsonify({"error": "Email already in use by another account"}), 400

            user.email = new_email

        db.session.commit()

        return jsonify({
            "message": "Profile updated successfully",
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role if isinstance(user.role, str) else user.role.value,
                "organization_id": user.organization_id
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Failed to update profile",
            "details": str(e)
        }), 500


@auth.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    """
    Change current user's password (requires current password verification)
    Sends email notification on success
    """
    try:
        user_email = get_jwt_identity()
        user = User.query.filter_by(email=user_email).first()

        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        current_password = data.get("current_password")
        new_password = data.get("new_password")

        if not current_password or not new_password:
            return jsonify({"error": "Current password and new password are required"}), 400

        # Verify current password
        if not user.check_password(current_password):
            return jsonify({"error": "Current password is incorrect"}), 401

        # Validate new password strength
        if not is_strong_password(new_password):
            return jsonify({
                "error": "Password must be at least 8 characters long and include uppercase, lowercase, numeric, and special characters."
            }), 400

        # Check new password is different from current
        if user.check_password(new_password):
            return jsonify({"error": "New password cannot be the same as the current password"}), 400

        # Update password
        user.password = bcrypt.generate_password_hash(new_password).decode("utf-8")
        db.session.commit()

        # Send email notification
        try:
            msg = Message(
                "Password Changed - Event Planner",
                sender=os.environ.get("VERIFIED_EMAIL"),
                recipients=[user.email],
            )
            msg.html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Password Changed</h2>
                <p style="color: #666; font-size: 16px;">Hello {user.first_name},</p>
                <p style="color: #666; font-size: 16px;">Your password has been successfully changed.</p>
                <p style="color: #666; font-size: 16px;">If you did not make this change, please contact support immediately or reset your password.</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                    This is an automated security notification from Event Planner.
                </p>
            </div>
            """
            mail.send(msg)
        except Exception as e:
            print(f"Failed to send password change notification: {str(e)}")

        return jsonify({"message": "Password changed successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Failed to change password",
            "details": str(e)
        }), 500


@auth.route("/account", methods=["DELETE"])
@jwt_required()
def delete_account():
    """
    Delete current user's account
    Sends email notification on success
    """
    try:
        user_email = get_jwt_identity()
        user = User.query.filter_by(email=user_email).first()

        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json() or {}
        password = data.get("password")

        # Require password confirmation for account deletion
        if not password:
            return jsonify({"error": "Password is required to delete account"}), 400

        if not user.check_password(password):
            return jsonify({"error": "Incorrect password"}), 401

        # Prevent admin from deleting their own account if they're the only admin
        if user.role == UserRole.ADMIN.value:
            admin_count = User.query.filter_by(role=UserRole.ADMIN.value).count()
            if admin_count <= 1:
                return jsonify({"error": "Cannot delete the only admin account"}), 400

        # Store user info for email before deletion
        user_name = user.first_name
        user_email_address = user.email

        # Delete events created by this user before deleting the user
        from models import Event
        Event.query.filter_by(user_id=user.id).delete()

        # If user is an organizer with an organization, handle cleanup
        if user.organization_id and user.role == UserRole.ORGANIZER.value:
            org = Organization.query.get(user.organization_id)
            if org:
                # Check if user is the only organizer in the organization
                org_organizers = User.query.filter_by(
                    organization_id=user.organization_id,
                    role=UserRole.ORGANIZER.value
                ).count()

                if org_organizers <= 1:
                    # Soft delete the organization if this is the only organizer
                    org.soft_delete()

        # Delete user
        db.session.delete(user)
        db.session.commit()

        # Send email notification
        try:
            msg = Message(
                "Account Deleted - Event Planner",
                sender=os.environ.get("VERIFIED_EMAIL"),
                recipients=[user_email_address],
            )
            msg.html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Account Deleted</h2>
                <p style="color: #666; font-size: 16px;">Hello {user_name},</p>
                <p style="color: #666; font-size: 16px;">Your Event Planner account has been successfully deleted.</p>
                <p style="color: #666; font-size: 16px;">All your data has been permanently removed from our system.</p>
                <p style="color: #666; font-size: 16px;">We're sorry to see you go. If you ever want to come back, you're always welcome to create a new account.</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                    This is an automated notification from Event Planner.
                </p>
            </div>
            """
            mail.send(msg)
        except Exception as e:
            print(f"Failed to send account deletion notification: {str(e)}")

        return jsonify({"message": "Account deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Failed to delete account",
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


# Admin routes for organizer approval
@auth.route("/admin/organizer-requests", methods=["GET"])
@role_required("admin")
def get_organizer_requests():
    """Get all pending organizer role requests - ADMIN ONLY"""
    try:
        pending_requests = User.query.filter_by(
            pending_organizer_approval=True,
            role=UserRole.GUEST.value
        ).all()
        
        requests_data = []
        for user in pending_requests:
            request_info = {
                'id': user.id,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'role': user.role
            }
            requests_data.append(request_info)
        
        return jsonify({
            'message': 'Organizer requests retrieved successfully',
            'pending_count': len(requests_data),
            'requests': requests_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve organizer requests: {str(e)}'}), 500


@auth.route("/admin/organizer-requests/<int:user_id>/approve", methods=["POST"])
@role_required("admin")
def approve_organizer_request(user_id):
    """Approve a pending organizer role request"""
    try:
        # Get the admin user from JWT
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


# ==================== User Management (Admin Only) ====================

@auth.route("/admin/users", methods=["GET"])
@role_required("admin")
def get_all_users():
    """
    Get all users with pagination and optional search/filter
    Query params: page, per_page, search, role
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '', type=str)
        role_filter = request.args.get('role', '', type=str)

        # Base query
        query = User.query

        # Apply search filter (searches name and email)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                db.or_(
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )

        # Apply role filter
        if role_filter and role_filter in [r.value for r in UserRole]:
            query = query.filter(User.role == role_filter)

        # Get total count before pagination
        total_count = query.count()

        # Apply pagination
        users = query.order_by(User.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        users_data = []
        for user in users.items:
            org_name = None
            if user.organization_id:
                org = Organization.query.get(user.organization_id)
                org_name = org.name if org else None

            users_data.append({
                'id': user.id,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'role': user.role,
                'organization_id': user.organization_id,
                'organization_name': org_name,
                'pending_organizer_approval': user.pending_organizer_approval,
                'created_at': user.created_at.isoformat() if user.created_at else None
            })

        return jsonify({
            'message': 'Users retrieved successfully',
            'users': users_data,
            'total_count': total_count,
            'page': page,
            'per_page': per_page,
            'total_pages': users.pages
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to retrieve users: {str(e)}'}), 500


@auth.route("/admin/users/<int:user_id>/role", methods=["PUT"])
@role_required("admin")
def change_user_role(user_id):
    """
    Change a user's role (Admin only)
    For team_member: organization_id is required
    For organizer: organization_id is optional (can create own org later)
    """
    try:
        admin_email = get_jwt_identity()
        admin_user = User.query.filter_by(email=admin_email).first()

        if not admin_user:
            return jsonify({'error': 'Admin user not found'}), 404

        # Get target user
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        new_role = data.get('role')
        organization_id = data.get('organization_id')

        if not new_role:
            return jsonify({'error': 'New role is required'}), 400

        # Validate role
        valid_roles = [r.value for r in UserRole]
        if new_role not in valid_roles:
            return jsonify({
                'error': f'Invalid role. Valid roles are: {", ".join(valid_roles)}'
            }), 400

        # Prevent changing own role
        if target_user.id == admin_user.id:
            return jsonify({'error': 'Cannot change your own role'}), 400

        # Prevent demoting the last admin
        if target_user.role == UserRole.ADMIN.value and new_role != UserRole.ADMIN.value:
            admin_count = User.query.filter_by(role=UserRole.ADMIN.value).count()
            if admin_count <= 1:
                return jsonify({'error': 'Cannot demote the only admin'}), 400

        # Handle organization assignment based on new role
        if new_role == UserRole.TEAM_MEMBER.value:
            # Team member MUST have an organization
            if not organization_id and not target_user.organization_id:
                return jsonify({
                    'error': 'Organization is required when promoting to team member'
                }), 400

            if organization_id:
                org = Organization.query.get(organization_id)
                if not org or org.is_deleted:
                    return jsonify({'error': 'Organization not found'}), 404
                target_user.organization_id = organization_id

        elif new_role == UserRole.ORGANIZER.value:
            # Organizer can optionally be assigned to an org, or create their own later
            if organization_id:
                org = Organization.query.get(organization_id)
                if not org or org.is_deleted:
                    return jsonify({'error': 'Organization not found'}), 404
                target_user.organization_id = organization_id

            # Clear pending approval
            if target_user.pending_organizer_approval:
                target_user.pending_organizer_approval = False

        elif new_role == UserRole.GUEST.value:
            # Clear organization when demoting to guest
            target_user.organization_id = None

        elif new_role == UserRole.ADMIN.value:
            # Admins don't belong to organizations
            target_user.organization_id = None

        old_role = target_user.role
        target_user.role = new_role

        db.session.commit()

        # Get org name for response
        org_name = None
        if target_user.organization_id:
            org = Organization.query.get(target_user.organization_id)
            org_name = org.name if org else None

        return jsonify({
            'message': f'User role changed from {old_role} to {new_role}',
            'user': {
                'id': target_user.id,
                'first_name': target_user.first_name,
                'last_name': target_user.last_name,
                'email': target_user.email,
                'role': target_user.role,
                'organization_id': target_user.organization_id,
                'organization_name': org_name
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to change user role: {str(e)}'}), 500


@auth.route("/admin/users/<int:user_id>", methods=["DELETE"])
@role_required("admin")
def admin_delete_user(user_id):
    """
    Delete a user (Admin only)
    """
    try:
        admin_email = get_jwt_identity()
        admin_user = User.query.filter_by(email=admin_email).first()

        if not admin_user:
            return jsonify({'error': 'Admin user not found'}), 404

        # Get target user
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'error': 'User not found'}), 404

        # Prevent deleting self
        if target_user.id == admin_user.id:
            return jsonify({'error': 'Cannot delete your own account from here. Use Settings instead.'}), 400

        # Prevent deleting the last admin
        if target_user.role == UserRole.ADMIN.value:
            admin_count = User.query.filter_by(role=UserRole.ADMIN.value).count()
            if admin_count <= 1:
                return jsonify({'error': 'Cannot delete the only admin'}), 400

        # Store info for response
        deleted_user_info = {
            'id': target_user.id,
            'name': f"{target_user.first_name} {target_user.last_name}",
            'email': target_user.email,
            'role': target_user.role
        }

        # Delete events created by this user
        from models import Event
        Event.query.filter_by(user_id=target_user.id).delete()

        # Handle organization cleanup if user is organizer
        if target_user.organization_id and target_user.role == UserRole.ORGANIZER.value:
            org = Organization.query.get(target_user.organization_id)
            if org:
                org_organizers = User.query.filter_by(
                    organization_id=target_user.organization_id,
                    role=UserRole.ORGANIZER.value
                ).count()

                if org_organizers <= 1:
                    org.soft_delete()

        db.session.delete(target_user)
        db.session.commit()

        return jsonify({
            'message': f'User {deleted_user_info["name"]} deleted successfully',
            'deleted_user': deleted_user_info
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete user: {str(e)}'}), 500