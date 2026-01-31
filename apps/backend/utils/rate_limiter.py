"""
Simple in-memory rate limiter for protecting email endpoints.
Prevents abuse of Gmail quota from demo credentials.
"""
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

# In-memory storage for rate limiting
# Format: { "identifier": [timestamp1, timestamp2, ...] }
_rate_limit_store = {}


def _get_client_identifier():
    """
    Get a unique identifier for the client.
    Uses JWT email if authenticated, otherwise falls back to IP address.
    """
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            return f"user:{identity}"
    except:
        pass

    # Fall back to IP address
    return f"ip:{request.remote_addr}"


def _clean_old_entries(identifier, window_seconds):
    """Remove entries older than the time window"""
    if identifier not in _rate_limit_store:
        return

    cutoff = datetime.now() - timedelta(seconds=window_seconds)
    _rate_limit_store[identifier] = [
        ts for ts in _rate_limit_store[identifier] if ts > cutoff
    ]


def check_rate_limit(identifier, max_requests, window_seconds):
    """
    Check if the identifier has exceeded the rate limit.

    Args:
        identifier: Unique identifier for the client
        max_requests: Maximum number of requests allowed
        window_seconds: Time window in seconds

    Returns:
        tuple: (is_allowed, requests_remaining, retry_after_seconds)
    """
    _clean_old_entries(identifier, window_seconds)

    current_requests = _rate_limit_store.get(identifier, [])

    if len(current_requests) >= max_requests:
        # Calculate retry after
        oldest_request = min(current_requests)
        retry_after = (oldest_request + timedelta(seconds=window_seconds) - datetime.now()).seconds
        return False, 0, retry_after

    return True, max_requests - len(current_requests), 0


def record_request(identifier):
    """Record a request for the given identifier"""
    if identifier not in _rate_limit_store:
        _rate_limit_store[identifier] = []
    _rate_limit_store[identifier].append(datetime.now())


def rate_limit(max_requests=5, window_seconds=3600, key_func=None):
    """
    Decorator to apply rate limiting to a Flask route.

    Args:
        max_requests: Maximum number of requests allowed (default: 5)
        window_seconds: Time window in seconds (default: 3600 = 1 hour)
        key_func: Optional function to generate custom identifier

    Usage:
        @rate_limit(max_requests=3, window_seconds=3600)
        def my_route():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get identifier
            if key_func:
                identifier = key_func()
            else:
                identifier = _get_client_identifier()

            # Check rate limit
            is_allowed, remaining, retry_after = check_rate_limit(
                identifier, max_requests, window_seconds
            )

            if not is_allowed:
                return jsonify({
                    "error": "Rate limit exceeded. Please try again later.",
                    "retry_after_seconds": retry_after,
                    "message": f"You can make {max_requests} requests per {window_seconds // 60} minutes."
                }), 429

            # Record this request
            record_request(identifier)

            # Call the original function
            return f(*args, **kwargs)

        return decorated_function
    return decorator


# Specific rate limiters for different use cases
def email_rate_limit(f):
    """
    Rate limiter specifically for email-sending endpoints.
    Allows 5 emails per hour per user/IP.
    """
    return rate_limit(max_requests=5, window_seconds=3600)(f)


def password_reset_rate_limit(f):
    """
    Rate limiter for password reset requests.
    Allows 3 requests per hour per IP (stricter since no auth required).
    """
    return rate_limit(max_requests=3, window_seconds=3600)(f)


def invitation_rate_limit(f):
    """
    Rate limiter for invitation endpoints.
    Allows 10 invitations per hour per user.
    """
    return rate_limit(max_requests=10, window_seconds=3600)(f)


def chat_rate_limit(f):
    """
    Rate limiter for AI chat endpoint.
    Allows 30 messages per hour per user to protect Groq API quota.
    """
    return rate_limit(max_requests=30, window_seconds=3600)(f)


def _get_ip_identifier():
    """Get IP-based identifier for unauthenticated endpoints"""
    return f"ip:{request.remote_addr}"


def registration_rate_limit(f):
    """
    Rate limiter for registration endpoint.
    Allows 5 registrations per hour per IP to prevent spam accounts.
    """
    return rate_limit(max_requests=5, window_seconds=3600, key_func=_get_ip_identifier)(f)


def login_rate_limit(f):
    """
    Rate limiter for login endpoint.
    Allows 10 attempts per 15 minutes per IP for brute force protection.
    """
    return rate_limit(max_requests=10, window_seconds=900, key_func=_get_ip_identifier)(f)
