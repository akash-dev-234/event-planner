import os
from flask_mail import Message
from extensions import mail


def send_invitation_email(user, organization, inviter, role):
    """Helper function to send invitation email to registered users"""
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
            </div>
        """
        
        mail.send(msg)
        
    except Exception as e:
        raise e


def send_registration_invitation_email(email, organization, inviter, role):
    """Send invitation email to unregistered users"""
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
        </div>
        """
        
        mail.send(msg)
        
    except Exception as e:
        raise e


def notify_admins_organizer_request(user):
    """Notify all admins about a new organizer role request"""
    from auth.models import User, UserRole
    
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
                </div>
            """
            
            mail.send(msg)
            
    except Exception as e:
        print(f"Failed to notify admins about organizer request: {str(e)}")


def notify_user_organizer_approval(user, approved, admin_name):
    """Notify user about organizer request approval/rejection"""
    try:
        subject = "Organizer Request Approved" if approved else "Organizer Request Rejected"
        
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
                </div>
            """
        
        mail.send(msg)
        
    except Exception as e:
        raise e