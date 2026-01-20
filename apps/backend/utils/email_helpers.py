import os
from flask_mail import Message
from extensions import mail


def send_invitation_email(user, organization, inviter, role):
    """Helper function to send invitation email to registered users"""
    try:
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        login_url = f"{frontend_url}/login"

        msg = Message(
            "Organization Invitation",
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
        registration_url = f"{frontend_url}/signup?email={email}&from=invitation"
        
        msg = Message(
            "Organization Invitation",
            sender=os.environ.get("VERIFIED_EMAIL"),
            recipients=[email],
        )
        
        msg.html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">Organization Invitation</h2>
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
            <p style="color: #666; font-size: 14px;">If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
            <p style="color: #666; font-size: 14px; word-break: break-all;">{registration_url}</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                This email was sent by Event Planner. Please do not reply to this email.
            </p>
        </div>
        """
        
        mail.send(msg)
        
    except Exception as e:
        raise e


def notify_admins_organizer_request(user):
    """Notify all admins about a new organizer role request"""
    from models import User, UserRole
    
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

def send_event_invitation_email(event_invitation, event, organizer):
    """Send event invitation email to external guest"""
    try:
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        accept_url = f"{frontend_url}/event-rsvp/{event_invitation.invitation_token}?response=accept"
        decline_url = f"{frontend_url}/event-rsvp/{event_invitation.invitation_token}?response=decline"
        
        guest_name = event_invitation.guest_name or "Guest"
        
        msg = Message(
            f"Event Invitation: {event.title}",
            sender=os.environ.get("VERIFIED_EMAIL"),
            recipients=[event_invitation.guest_email],
        )
        
        # Format event date and time
        event_datetime = f"{event.date.strftime('%B %d, %Y')} at {event.time.strftime('%I:%M %p')}"
        
        msg.html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">🎉 You're Invited!</h2>
            <p style="color: #666; font-size: 16px;">Hello {guest_name},</p>
            <p style="color: #666; font-size: 16px;">
                {organizer.first_name} {organizer.last_name} has invited you to attend:
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                <h3 style="margin: 0 0 10px 0; color: #333;">{event.title}</h3>
                <p style="margin: 5px 0; color: #555;"><strong>📅 When:</strong> {event_datetime}</p>
                <p style="margin: 5px 0; color: #555;"><strong>📍 Where:</strong> {event.location}</p>
                <div style="margin: 15px 0; color: #666;">
                    <strong>Description:</strong><br>
                    {event.description}
                </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{accept_url}" 
                   style="background-color: #28a745; 
                          color: white; 
                          padding: 12px 25px; 
                          text-decoration: none; 
                          border-radius: 4px; 
                          display: inline-block;
                          margin: 0 10px;">
                    ✅ Accept Invitation
                </a>
                <a href="{decline_url}" 
                   style="background-color: #dc3545; 
                          color: white; 
                          padding: 12px 25px; 
                          text-decoration: none; 
                          border-radius: 4px; 
                          display: inline-block;
                          margin: 0 10px;">
                    ❌ Decline Invitation
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center;">
                Click one of the buttons above to respond to this invitation.
            </p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                This email was sent by Event Planner. You received this because you were invited to an event.
            </p>
        </div>
        """
        
        mail.send(msg)
        
    except Exception as e:
        print(f"Failed to send event invitation email: {str(e)}")
        raise e


def send_event_reminder_email(event_invitation, event, hours_before):
    """Send event reminder email to guests who accepted"""
    try:
        if event_invitation.status != 'accepted':
            return  # Only send reminders to guests who accepted
            
        guest_name = event_invitation.guest_name or "Guest"
        
        if hours_before == 24:
            subject = f"Reminder: {event.title} is tomorrow"
            time_text = "tomorrow"
        elif hours_before == 1:
            subject = f"Final Reminder: {event.title} is in 1 hour"
            time_text = "in 1 hour"
        else:
            subject = f"Reminder: {event.title}"
            time_text = f"in {hours_before} hours"
        
        msg = Message(
            subject,
            sender=os.environ.get("VERIFIED_EMAIL"),
            recipients=[event_invitation.guest_email],
        )
        
        event_datetime = f"{event.date.strftime('%B %d, %Y')} at {event.time.strftime('%I:%M %p')}"
        
        msg.html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">⏰ Event Reminder</h2>
            <p style="color: #666; font-size: 16px;">Hello {guest_name},</p>
            <p style="color: #666; font-size: 16px;">
                This is a reminder that <strong>{event.title}</strong> is {time_text}.
            </p>
            
            <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                <h3 style="margin: 0 0 10px 0; color: #333;">{event.title}</h3>
                <p style="margin: 5px 0; color: #004085;"><strong>📅 When:</strong> {event_datetime}</p>
                <p style="margin: 5px 0; color: #004085;"><strong>📍 Where:</strong> {event.location}</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                We look forward to seeing you there!
            </p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                This email was sent by Event Planner. You're receiving this because you accepted an invitation to this event.
            </p>
        </div>
        """
        
        mail.send(msg)
        
    except Exception as e:
        print(f"Failed to send event reminder email: {str(e)}")
        raise e