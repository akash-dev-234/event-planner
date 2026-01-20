'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, Sparkles } from 'lucide-react';

interface EventData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  datetime_formatted: string;
}

interface RSVPResponse {
  success?: boolean;
  already_responded?: boolean;
  message: string;
  status: 'accepted' | 'declined';
  guest_name: string;
  event: EventData;
  error?: string;
}

export default function EventRSVPPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const response = searchParams.get('response');
  
  const [rsvpData, setRsvpData] = useState<RSVPResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const processRSVP = async () => {
      try {
        // Use POST to prevent accidental RSVPs from link previews/email clients
        const apiResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/events/rsvp/${token}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ response }),
          }
        );
        const data = await apiResponse.json();

        if (!apiResponse.ok) {
          setError(data.error || 'Failed to process RSVP');
          return;
        }

        setRsvpData(data);

        // Show confetti for accepted invitations
        if (data.status === 'accepted' && !data.already_responded) {
          setShowConfetti(true);
          // Hide confetti after 4 seconds
          setTimeout(() => setShowConfetti(false), 4000);
        }

      } catch (err) {
        setError('Failed to process your response. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (token && response) {
      processRSVP();
    } else {
      setError('Invalid invitation link');
      setLoading(false);
    }
  }, [token, response]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Processing your response...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <XCircle className="mr-2 h-6 w-6" />
              Oops!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{error}</p>
            <Button 
              className="mt-4 w-full" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!rsvpData) return null;

  const isAccepted = rsvpData.status === 'accepted';
  const bgGradient = isAccepted 
    ? 'from-green-50 to-emerald-50' 
    : 'from-orange-50 to-red-50';
  
  const headerColor = isAccepted ? 'text-green-600' : 'text-orange-600';
  const iconColor = isAccepted ? 'text-green-500' : 'text-orange-500';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} flex items-center justify-center p-4 relative overflow-hidden`}>
      
      {/* Enhanced Confetti Animation */}
      {showConfetti && isAccepted && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(80)].map((_, i) => {
            const colors = ['text-yellow-400', 'text-pink-400', 'text-blue-400', 'text-green-400', 'text-purple-400', 'text-red-400', 'text-orange-400', 'text-indigo-400'];
            const animations = ['animate-bounce', 'animate-pulse', 'animate-ping'];
            const sizes = ['h-3 w-3', 'h-4 w-4', 'h-5 w-5'];
            
            return (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${1 + Math.random() * 2}s`
                }}
              >
                <Sparkles 
                  className={`${colors[Math.floor(Math.random() * colors.length)]} ${sizes[Math.floor(Math.random() * sizes.length)]} ${animations[Math.floor(Math.random() * animations.length)]}`}
                />
              </div>
            );
          })}
          
          {/* Floating emoji */}
          {['🎉', '🎊', '✨', '🌟', '💫', '🎈'].map((emoji, i) => (
            <div
              key={`emoji-${i}`}
              className="absolute text-4xl animate-bounce"
              style={{
                left: `${Math.random() * 90}%`,
                top: `${Math.random() * 90}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 1}s`
              }}
            >
              {emoji}
            </div>
          ))}
        </div>
      )}

      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className={`flex items-center justify-center text-2xl font-bold ${headerColor}`}>
            {isAccepted ? (
              <>
                <CheckCircle className="mr-3 h-8 w-8" />
                🎉 You're Going!
              </>
            ) : (
              <>
                <XCircle className="mr-3 h-8 w-8" />
                Response Recorded
              </>
            )}
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {rsvpData.already_responded 
              ? `Hi ${rsvpData.guest_name}, you've already responded to this invitation.`
              : `Hi ${rsvpData.guest_name}, thank you for your response!`
            }
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Response Message */}
          <div className={`p-4 rounded-lg ${isAccepted ? 'bg-green-100 border border-green-200' : 'bg-orange-100 border border-orange-200'}`}>
            <p className={`text-center font-medium ${isAccepted ? 'text-green-800' : 'text-orange-800'}`}>
              {rsvpData.message}
            </p>
          </div>

          {/* Event Details */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{rsvpData.event.title}</h3>
            
            <div className="space-y-3">
              <div className="flex items-center text-gray-600">
                <Calendar className="mr-3 h-5 w-5 text-blue-500" />
                <span>{rsvpData.event.datetime_formatted}</span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <MapPin className="mr-3 h-5 w-5 text-red-500" />
                <span>{rsvpData.event.location}</span>
              </div>
            </div>

            {rsvpData.event.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-gray-700">{rsvpData.event.description}</p>
              </div>
            )}
          </div>

          {/* Additional Message */}
          {isAccepted && !rsvpData.already_responded && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-blue-800 text-center">
                🗓️ We'll send you a reminder as the event approaches. See you there!
              </p>
            </div>
          )}

          {/* Action Button */}
          <div className="text-center pt-4">
            <Button 
              onClick={() => window.close()}
              variant="outline"
              className="px-6"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}