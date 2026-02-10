import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY, PHONE_NUMBER, BOOKING_PRICES } from '../constants';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface BookingData {
  pickup?: string;
  dropoff?: string;
  pickupCoords?: { lat: number; lng: number };
  dropoffCoords?: { lat: number; lng: number };
  passengers?: number;
  preferences?: string;
  datetime?: string;
  fare?: number;
}

type ConversationStep = 'greeting' | 'pickup' | 'dropoff' | 'passengers' | 'preferences' | 'datetime' | 'confirm';

export const ChatbotBooking: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Welcome to Andrew\'s Taxi! 👋 Where are you traveling from today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<ConversationStep>('pickup');
  const [bookingData, setBookingData] = useState<BookingData>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const distanceMatrixServiceRef = useRef<google.maps.DistanceMatrixService | null>(null);

  // Initialize Google Maps services
  useEffect(() => {
    if (isOpen && !placesServiceRef.current && GOOGLE_MAPS_API_KEY) {
      const mapDiv = document.createElement('div');
      const map = new google.maps.Map(mapDiv);
      placesServiceRef.current = new google.maps.places.PlacesService(map);
      distanceMatrixServiceRef.current = new google.maps.DistanceMatrixService();
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address });
      
      if (result.results.length > 0) {
        const location = result.results[0].geometry.location;
        return {
          lat: location.lat(),
          lng: location.lng(),
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const calculateFare = async (pickup: { lat: number; lng: number }, dropoff: { lat: number; lng: number }): Promise<number | null> => {
    try {
      if (!distanceMatrixServiceRef.current) {
        distanceMatrixServiceRef.current = new google.maps.DistanceMatrixService();
      }

      const response = await distanceMatrixServiceRef.current.getDistanceMatrix({
        origins: [new google.maps.LatLng(pickup.lat, pickup.lng)],
        destinations: [new google.maps.LatLng(dropoff.lat, dropoff.lng)],
        travelMode: google.maps.TravelMode.DRIVING,
      });

      if (response.rows[0]?.elements[0]?.distance) {
        const distanceKm = response.rows[0].elements[0].distance.value / 1000;
        const baseFare = BOOKING_PRICES.BASE_FARE;
        const perKmRate = BOOKING_PRICES.RATE_PER_KM;
        return Math.round((baseFare + distanceKm * perKmRate) * 100) / 100;
      }
      return null;
    } catch (error) {
      console.error('Distance Matrix error:', error);
      return null;
    }
  };

  const handleUserInput = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let botResponse = '';
    let nextStep = step;
    let updatedBookingData = { ...bookingData };

    try {
      switch (step) {
        case 'pickup': {
          const coords = await geocodeAddress(input);
          if (coords) {
            updatedBookingData.pickup = input;
            updatedBookingData.pickupCoords = coords;
            botResponse = `Great! Pickup at ${input}. 📍\n\nWhere would you like to go?`;
            nextStep = 'dropoff';
          } else {
            botResponse = `Sorry, I couldn't find that location. Could you try a different address or landmark?`;
          }
          break;
        }

        case 'dropoff': {
          const coords = await geocodeAddress(input);
          if (coords) {
            updatedBookingData.dropoff = input;
            updatedBookingData.dropoffCoords = coords;

            // Calculate fare
            if (updatedBookingData.pickupCoords && updatedBookingData.dropoffCoords) {
              const fare = await calculateFare(updatedBookingData.pickupCoords, updatedBookingData.dropoffCoords);
              updatedBookingData.fare = fare || 0;
            }

            botResponse = `Perfect! Dropoff at ${input}. 📍\n\nEstimated fare: $${updatedBookingData.fare?.toFixed(2) || 'TBD'}\n\nHow many passengers?`;
            nextStep = 'passengers';
          } else {
            botResponse = `Sorry, I couldn't find that location. Could you try a different address or landmark?`;
          }
          break;
        }

        case 'passengers': {
          const num = parseInt(input);
          if (num > 0 && num <= 8) {
            updatedBookingData.passengers = num;
            botResponse = `${num} passenger${num > 1 ? 's' : ''} noted. ✓\n\nAny special preferences? (e.g., "AC preferred", "quiet ride", or "skip" to continue)`;
            nextStep = 'preferences';
          } else {
            botResponse = `Please enter a number between 1 and 8 passengers.`;
          }
          break;
        }

        case 'preferences': {
          if (input.toLowerCase() !== 'skip') {
            updatedBookingData.preferences = input;
          }
          botResponse = `Got it! ✓\n\nWhen do you need the ride? (e.g., "now", "in 30 minutes", "tomorrow at 3pm")`;
          nextStep = 'datetime';
          break;
        }

        case 'datetime': {
          updatedBookingData.datetime = input;
          botResponse = `Perfect! Let me confirm your booking:\n\n📍 Pickup: ${updatedBookingData.pickup}\n📍 Dropoff: ${updatedBookingData.dropoff}\n👥 Passengers: ${updatedBookingData.passengers}\n${updatedBookingData.preferences ? `✨ Preferences: ${updatedBookingData.preferences}\n` : ''}🕒 Time: ${input}\n💰 Est. Fare: $${updatedBookingData.fare?.toFixed(2)}\n\nReply "confirm" to book or "cancel" to start over.`;
          nextStep = 'confirm';
          break;
        }

        case 'confirm': {
          if (input.toLowerCase() === 'confirm') {
            const bookingSummary = `Booking Summary:\nFrom: ${updatedBookingData.pickup}\nTo: ${updatedBookingData.dropoff}\nPassengers: ${updatedBookingData.passengers}\n${updatedBookingData.preferences ? `Preferences: ${updatedBookingData.preferences}\n` : ''}Time: ${updatedBookingData.datetime}\nEst. Fare: $${updatedBookingData.fare?.toFixed(2)}`;
            
            // Send to WhatsApp
            const whatsappMessage = encodeURIComponent(
              `Hi Andrew's Taxi! I'd like to book a ride.\n\n${bookingSummary}`
            );
            window.open(
              `https://wa.me/${PHONE_NUMBER}?text=${whatsappMessage}`,
              '_blank'
            );

            botResponse = `✅ Booking confirmed! Opening WhatsApp to finalize your ride. See you soon! 🚕`;
            nextStep = 'greeting';
            updatedBookingData = {};
          } else if (input.toLowerCase() === 'cancel') {
            botResponse = `Booking cancelled. Where are you traveling from today?`;
            nextStep = 'pickup';
            updatedBookingData = {};
          } else {
            botResponse = `Please reply "confirm" to complete the booking or "cancel" to start over.`;
          }
          break;
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      botResponse = 'Sorry, something went wrong. Please try again.';
    }

    setBookingData(updatedBookingData);
    setStep(nextStep);

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: botResponse,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
  };

  const handleSendClick = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleUserInput();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-taxi-yellow hover:bg-yellow-500 text-taxi-dark rounded-full p-4 shadow-lg z-40 transition-transform hover:scale-110"
        aria-label="Open chat"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-96 bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="bg-taxi-dark text-white p-4 rounded-t-lg flex justify-between items-center">
        <h3 className="font-bold text-lg">Andrew's Taxi Booking</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-white/20 p-1 rounded transition-colors"
          aria-label="Close chat"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.type === 'user'
                  ? 'bg-taxi-yellow text-taxi-dark'
                  : 'bg-white border border-gray-300 text-gray-800'
              } whitespace-pre-wrap text-sm`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendClick} className="border-t border-gray-200 p-4 bg-white rounded-b-lg flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isLoading}
          placeholder="Type your message..."
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-taxi-yellow disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-taxi-yellow hover:bg-yellow-500 text-taxi-dark rounded px-4 py-2 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {isLoading ? <div className="w-4 h-4 border-2 border-taxi-dark border-t-transparent rounded-full animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
};
