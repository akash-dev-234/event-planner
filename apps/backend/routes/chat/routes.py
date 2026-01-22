from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
import re
import os

from . import chat_bp
from utils.validators import sanitize_input

GROQ_API_KEY = os.environ.get('GROK_API_KEY')  # Using same env var name
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Project-specific context to prevent hallucination
PROJECT_CONTEXT = """
You are an AI assistant for an Event Planning application. You can only help with:
- Event planning and management
- Organization features 
- User authentication and profiles
- General event-related questions

You cannot and will not:
- Provide information about other systems or applications
- Share sensitive data like API keys, passwords, or personal information
- Generate code or technical implementation details
- Discuss topics unrelated to event planning

Keep responses focused on event planning functionality only.
"""


def filter_response(response_text):
    """Filter response to ensure no sensitive information leaks"""
    if not response_text:
        return "I can only help with event planning questions."
    
    # Check for potential sensitive information
    sensitive_indicators = [
        'api key', 'password', 'secret', 'token', 'database',
        'server', 'localhost', 'port', 'http://', 'https://',
        'config', '.env', 'credential'
    ]
    
    response_lower = response_text.lower()
    for indicator in sensitive_indicators:
        if indicator in response_lower:
            return "I can only provide general information about event planning features."
    
    return response_text

@chat_bp.route('/message', methods=['POST'])
@jwt_required()
def chat_message():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Check if API key is available
        if not GROQ_API_KEY:
            return jsonify({'error': 'AI service not configured'}), 500
        
        # Debug: Print full request details
        print(f"API key length: {len(GROQ_API_KEY) if GROQ_API_KEY else 0}")
        print(f"API key starts with: {GROQ_API_KEY[:10] if GROQ_API_KEY else 'None'}...")
        print(f"Request URL: {GROQ_API_URL}")
        print(f"Model: llama-3.1-8b-instant")
        
        # Sanitize input
        user_message = sanitize_input(user_message)
        
        # Prepare request to Groq API
        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'messages': [
                {
                    'role': 'system',
                    'content': PROJECT_CONTEXT
                },
                {
                    'role': 'user', 
                    'content': user_message
                }
            ],
            'model': 'llama-3.1-8b-instant',
            'stream': False,
            'temperature': 0.3
        }
        
        # Make request to Groq API
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
        
        if response.status_code != 200:
            print(f"Groq API error: {response.status_code} - {response.text}")
            return jsonify({'error': f'AI service error: {response.status_code}'}), 500
        
        response_data = response.json()
        ai_message = response_data.get('choices', [{}])[0].get('message', {}).get('content', '')
        
        # Filter response for security
        filtered_message = filter_response(ai_message)
        
        return jsonify({
            'response': filtered_message,
            'success': True
        })
        
    except requests.exceptions.Timeout:
        return jsonify({'error': 'AI service timeout. Please try again.'}), 504
    except requests.exceptions.RequestException as e:
        print(f"Request error: {str(e)}")
        return jsonify({'error': 'AI service unavailable. Please try again later.'}), 503
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return jsonify({'error': 'An error occurred processing your request'}), 500

@chat_bp.route('/health', methods=['GET'])
def chat_health():
    return jsonify({'status': 'healthy', 'service': 'chat'})