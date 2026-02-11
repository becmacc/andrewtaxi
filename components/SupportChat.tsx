import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, MessageCircle, Mic, MicOff } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface SupportChatProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBooking?: () => void;
}

export const SupportChat: React.FC<SupportChatProps> = ({ isOpen, onClose, onOpenBooking }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi there! 👋 How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true); // Assume available until proven otherwise
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const recognitionInitialized = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeSpeechRecognition = () => {
    if (recognitionInitialized.current) return true;

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setMicAvailable(false);
      return false;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev + (prev ? ' ' : '') + transcript);
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        
        if (event.error === 'aborted') return;
        
        // Network errors are common and don't mean the feature is broken
        // Just disable the button silently and let user continue typing
        if (event.error === 'network') {
          setMicAvailable(false);
          return; // Don't show error message for network issues
        }
        
        let errorMessage = '';
        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            errorMessage = '⚠️ Microphone access denied. Please type your message.';
            setMicAvailable(false);
            break;
          case 'no-speech':
            // Don't show error for no-speech, let user try again
            return;
          default:
            // Silently disable for other errors
            setMicAvailable(false);
            return;
        }
        
        if (errorMessage) {
          const errorMsg: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: errorMessage,
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionInitialized.current = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      setMicAvailable(false);
      return false;
    }
  };

  const handleVoiceInput = () => {
    if (!micAvailable) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ Voice input is not available. Please type your message.',
      };
      setMessages((prev) => [...prev, errorMsg]);
      return;
    }

    // Initialize speech recognition on first use
    if (!recognitionRef.current) {
      if (!initializeSpeechRecognition()) {
        const errorMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '⚠️ Voice input is not supported in your browser. Please type your message.',
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }
    }

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
      setIsRecording(false);
    } else {
      try {
        setIsRecording(true);
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        setIsRecording(false);
        setMicAvailable(false);
        const errorMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '⚠️ Could not start voice input. Please type your message instead.',
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    }
  };

  const handleQuickAction = (action: string, label: string) => {
    setShowQuickActions(false);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: label,
    };
    setMessages((prev) => [...prev, userMessage]);
    
    // Execute action immediately
    if (action === 'open_booking') {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Perfect! Opening the booking chatbot for you now 🚕',
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setTimeout(() => executeAction(action), 500);
    } else if (action === 'scroll_fare_estimator') {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Let me show you our fare calculator! ✨',
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setTimeout(() => executeAction(action), 500);
    } else if (action === 'scroll_custom_request') {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Taking you to our custom request form 🚕',
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setTimeout(() => executeAction(action), 500);
    } else if (action === 'open_whatsapp') {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Opening WhatsApp for you! 💬',
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setTimeout(() => executeAction(action), 500);
    }
  };

  const executeAction = (action: string) => {
    switch (action) {
      case 'open_booking':
        onOpenBooking?.();
        onClose();
        break;
      case 'scroll_fare_estimator':
        document.getElementById('fare-estimator')?.scrollIntoView({ behavior: 'smooth' });
        onClose();
        break;
      case 'scroll_custom_request':
        const fareSection = document.getElementById('fare-estimator');
        if (fareSection) {
          fareSection.scrollIntoView({ behavior: 'smooth' });
          setTimeout(() => {
            window.scrollBy(0, 600);
          }, 500);
        }
        onClose();
        break;
      case 'scroll_services':
        document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
        onClose();
        break;
      case 'scroll_reviews':
        document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' });
        onClose();
        break;
      case 'open_whatsapp':
        window.open('https://wa.me/96176301019', '_blank');
        break;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    setShowQuickActions(false);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey || apiKey === 'your_openai_api_key_here') {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ AI chat is currently unavailable. Please use the quick actions above or contact us directly on WhatsApp for immediate assistance! 💬',
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsLoading(false);
        return;
      }

      const systemPrompt = `You are a friendly and professional customer support assistant for Andrew's Taxi, Lebanon's premier taxi service. Your goal is to provide helpful, warm, and efficient assistance.

⚠️ CRITICAL: When triggering actions, ALWAYS start your response with [ACTION:action_name] on the FIRST line.

MANDATORY ACTIONS:
When user wants to:
- Book/reserve a ride → ALWAYS use: [ACTION:open_booking]
- Get price/estimate/fare/calculate cost → ALWAYS use: [ACTION:scroll_fare_estimator]
- Multiple cars/SUV/4+ passengers/special needs → ALWAYS use: [ACTION:scroll_custom_request]
- See services/what you offer → ALWAYS use: [ACTION:scroll_services]
- Check reviews/reputation → ALWAYS use: [ACTION:scroll_reviews]
- Talk to human/urgent help → ALWAYS use: [ACTION:open_whatsapp]

CORRECT FORMAT:
"[ACTION:open_booking] Perfect! Opening the booking chatbot for you now 🚕"
"[ACTION:scroll_fare_estimator] Let me show you our fare calculator! ✨"
"[ACTION:scroll_custom_request] I'll take you to our custom request form for multiple cars 🚕"
NOT: "I'll open the booking chatbot [ACTION:open_booking]" ❌
NOT: "Click Book on WhatsApp to get started" ❌

PERSONALITY & TONE:
- Be warm, approachable, and conversational
- Use emojis sparingly (🚕 ⭐ ✨ 👍)
- Keep responses 2-3 sentences maximum
- Be proactive - trigger actions immediately when relevant
- Show enthusiasm about helping
- ⚠️ NEVER give generic responses like "How can I help?" or "What can I do for you?"
- ALWAYS be specific: suggest an action, answer directly, or ask a clarifying question
- If unclear what user wants, offer specific options (e.g., "Would you like to book a ride or get a fare estimate?")


SERVICES:
- Airport Transfers: Reliable pickups and drop-offs at Beirut-Rafic Hariri International Airport. We track flights.
- City Rides: Quick and comfortable rides anywhere in Lebanon for daily commutes, shopping, visiting friends.
- Professional Service: Experienced drivers for business meetings, full-day bookings, or special events.

PRICING:
- Base fare: $2.00
- Rate per km: $1.10
- Minimum fare: $6.00
- Round trips: First 50 minutes wait time free, extra time negotiated on WhatsApp
- Fixed pricing with no hidden fees

WEBSITE FEATURES:
1. Instant Booking Chatbot: Click "Book on WhatsApp" anywhere on site to open our chatbot. It guides you step-by-step:
   - Pickup location (with autocomplete, GPS, or map pin)
   - Dropoff location (with autocomplete or map pin)
   - Date & time (quick presets: ASAP, +15min, +30min, +1hr, or custom)
   - Preferences (quick tags: 4+ passengers, lots of luggage, quiet ride, no conversation, need rest/sleep, help with bags)
   - Your name
   - Review and send to WhatsApp
   
2. Fare Estimator: Get instant price estimates before booking:
   - Enter pickup and dropoff (Lebanon locations)
   - Choose one-way or round-trip
   - Add wait time for round trips (in hours)
   - See estimated fare range and distance
   - Then book on WhatsApp

3. Custom Requests: For special needs (multiple cars, 4+ passengers, SUV):
   - Scroll to Custom Request section under Fare Estimator
   - Select vehicle type (Car or SUV)
   - Choose passenger count (1-4 or 4+)
   - Specify number of cars (1-5)
   - Send request directly to WhatsApp for personalized service

WEBSITE SECTIONS:
- Home/Hero: Shows weather in Beirut, Google rating, CTAs for booking and fare estimator
- Services: Airport, City, Professional service details
- Fare Estimator: Interactive price calculator
- Why Us: 24/7 availability, fixed pricing, professional drivers
- How It Works: Simple 3-step process
- Reviews: Real 5-star Google reviews from customers
- Contact: WhatsApp, email, phone

WHY CHOOSE US:
- Available 24/7 (early flights, late nights)
- Fixed pricing (no surprises)
- Professional drivers (experienced, polite, know routes)
- Clean cars with working AC
- Safe and reliable

CONTACT:
- WhatsApp: +961 76 301 019 (preferred for booking)
- Email: andrewstaxilb@gmail.com
- Direct call: +961 76 301 019
- Book instantly through our website chatbot

Answer questions professionally and concisely. Guide users to the right website feature for their needs. For bookings, encourage using the chatbot or WhatsApp button.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage.content },
          ],
          temperature: 0.8,
          max_tokens: 250,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      let content = data.choices[0]?.message?.content || 'Sorry, I could not process that.';
      
      // Check for action commands
      const actionMatch = content.match(/\[ACTION:(\w+)\]/);
      if (actionMatch) {
        const action = actionMatch[1];
        content = content.replace(/\[ACTION:\w+\]\s*/, '');
        setTimeout(() => executeAction(action), 500);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please contact us directly on WhatsApp.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-taxi-dark to-gray-800 text-white p-4 rounded-t-2xl flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-taxi-yellow rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-taxi-dark" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Live Support</h3>
              <p className="text-xs text-gray-300">AI-powered assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-full transition-all duration-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-taxi-yellow text-taxi-dark'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          
          {showQuickActions && messages.length === 1 && (
            <div className="space-y-2 animate-fadeIn">
              <button
                onClick={() => handleQuickAction('open_booking', 'Book a ride')}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-taxi-yellow hover:bg-taxi-yellow/5 transition-all text-left flex items-center gap-3 group"
              >
                <span className="text-2xl">🚕</span>
                <div>
                  <p className="font-semibold text-gray-800 group-hover:text-taxi-dark">Book a ride</p>
                  <p className="text-xs text-gray-500">Start booking process</p>
                </div>
              </button>
              <button
                onClick={() => handleQuickAction('scroll_fare_estimator', 'Get fare estimate')}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-taxi-yellow hover:bg-taxi-yellow/5 transition-all text-left flex items-center gap-3 group"
              >
                <span className="text-2xl">💰</span>
                <div>
                  <p className="font-semibold text-gray-800 group-hover:text-taxi-dark">Get fare estimate</p>
                  <p className="text-xs text-gray-500">Calculate trip cost</p>
                </div>
              </button>
              <button
                onClick={() => handleQuickAction('scroll_custom_request', 'Custom request')}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-taxi-yellow hover:bg-taxi-yellow/5 transition-all text-left flex items-center gap-3 group"
              >
                <span className="text-2xl">✨</span>
                <div>
                  <p className="font-semibold text-gray-800 group-hover:text-taxi-dark">Custom request</p>
                  <p className="text-xs text-gray-500">Multiple cars, SUV, 4+ passengers</p>
                </div>
              </button>
              <button
                onClick={() => handleQuickAction('open_whatsapp', 'Talk to us directly')}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-taxi-yellow hover:bg-taxi-yellow/5 transition-all text-left flex items-center gap-3 group"
              >
                <span className="text-2xl">💬</span>
                <div>
                  <p className="font-semibold text-gray-800 group-hover:text-taxi-dark">Talk to us directly</p>
                  <p className="text-xs text-gray-500">Open WhatsApp</p>
                </div>
              </button>
            </div>
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-4 py-2.5 rounded-2xl flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                <span className="text-sm text-gray-600">Typing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-taxi-yellow disabled:bg-gray-100 transition-all duration-200"
            />
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={isLoading || !micAvailable}
              className={`p-2.5 rounded-xl transition-all ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : micAvailable
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              } disabled:opacity-50`}
              title={micAvailable ? 'Voice input' : 'Voice input unavailable'}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-taxi-yellow hover:bg-yellow-400 text-taxi-dark p-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            AI responses may not be accurate. For bookings, use WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
};
