'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { apiClient } from '@/lib/api';
import { Send, Bot, User, MessageCircle, X, Minimize2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatWidget() {
  const { user } = useReduxAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Add welcome message when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hi${user?.first_name ? ` ${user.first_name}` : ''}! I'm your Event Planning Assistant. How can I help you today?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, user?.first_name, messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await apiClient.sendChatMessage(userMessage.content);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If chat is minimized or closed, show unread indicator
      if (!isOpen || isMinimized) {
        setUnreadCount((prev) => prev + 1);
      }
    } catch {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChat = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
      setUnreadCount(0);
    } else if (isMinimized) {
      setIsMinimized(false);
      setUnreadCount(0);
    } else {
      setIsOpen(false);
    }
  };

  const minimizeChat = () => {
    setIsMinimized(true);
  };

  // Only show for users with organization
  if (!user?.organization_id) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Window */}
      {isOpen && !isMinimized && (
        <div className="mb-3 w-80 sm:w-96 h-[450px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Event Assistant</h3>
                <p className="text-xs text-purple-200">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={minimizeChat}
                className="h-7 w-7 p-0 hover:bg-white/20 text-white"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 p-0 hover:bg-white/20 text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-purple-600" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  <span className={`text-[10px] mt-1 block ${
                    message.role === 'user' ? 'text-purple-200' : 'text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {message.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-purple-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-200">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                disabled={isLoading}
                className="flex-1 text-sm h-9"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="sm"
                className="h-9 w-9 p-0 bg-purple-600 hover:bg-purple-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Minimized Bar */}
      {isOpen && isMinimized && (
        <div
          onClick={() => setIsMinimized(false)}
          className="mb-3 w-64 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <span className="text-sm font-medium">Event Assistant</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="h-6 w-6 p-0 hover:bg-white/20 text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Chat Button */}
      <Button
        onClick={toggleChat}
        className={`w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700'
            : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
        }`}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        )}
      </Button>
    </div>
  );
}
