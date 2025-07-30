import re


def is_valid_email(email):
    """Validate email format"""
    email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return re.match(email_regex, email) is not None


def is_strong_password(password):
    """Validate password strength"""
    return (
        len(password) >= 8
        and re.search(r"[A-Z]", password)
        and re.search(r"[a-z]", password)
        and re.search(r"[0-9]", password)
        and re.search(r"[!@#$%^&*(),.?\":{}|<>]", password)
    )


def sanitize_input(text):
    """Sanitize user input to prevent injection attacks"""
    if not text or not isinstance(text, str):
        return ""
    
    # Remove potential sensitive patterns
    sensitive_patterns = [
        r'api[_-]?key',
        r'password',
        r'secret',
        r'token',
        r'auth',
        r'<script',
        r'javascript:',
        r'eval\(',
        r'exec\(',
    ]
    
    sanitized = text
    for pattern in sensitive_patterns:
        sanitized = re.sub(pattern, '[REDACTED]', sanitized, flags=re.IGNORECASE)
    
    # Limit length
    return sanitized[:1000]