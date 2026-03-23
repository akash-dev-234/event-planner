from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()


def check_and_send_reminders(app):
    """Check for upcoming events and send reminder emails."""
    with app.app_context():
        from models import Event, EventInvitation
        from utils.email_helpers import send_event_reminder_email
        from extensions import db

        now = datetime.now(timezone.utc)

        # Get all active events (not deleted)
        active_events = Event.get_active().all()

        for event in active_events:
            # Combine date and time into a datetime for comparison
            try:
                event_dt = datetime.combine(event.date, event.time, tzinfo=timezone.utc)
            except Exception:
                continue

            time_until = event_dt - now

            # 24-hour reminders: event is between 23h and 25h away
            if timedelta(hours=23) <= time_until <= timedelta(hours=25):
                invitations = EventInvitation.query.filter_by(
                    event_id=event.id,
                    status='accepted',
                    reminder_24h_sent=False
                ).all()

                for inv in invitations:
                    try:
                        send_event_reminder_email(inv, event, 24)
                        inv.reminder_24h_sent = True
                    except Exception as e:
                        print(f"Failed 24h reminder for {inv.guest_email}: {e}")

                if invitations:
                    db.session.commit()

            # 1-hour reminders: event is between 45min and 1h15min away
            if timedelta(minutes=45) <= time_until <= timedelta(hours=1, minutes=15):
                invitations = EventInvitation.query.filter_by(
                    event_id=event.id,
                    status='accepted',
                    reminder_1h_sent=False
                ).all()

                for inv in invitations:
                    try:
                        send_event_reminder_email(inv, event, 1)
                        inv.reminder_1h_sent = True
                    except Exception as e:
                        print(f"Failed 1h reminder for {inv.guest_email}: {e}")

                if invitations:
                    db.session.commit()


def init_scheduler(app):
    """Initialize and start the reminder scheduler."""
    scheduler.add_job(
        check_and_send_reminders,
        'interval',
        minutes=15,
        id='event_reminders',
        replace_existing=True,
        args=[app]
    )
    scheduler.start()
    print("Event reminder scheduler started (runs every 15 minutes)")
