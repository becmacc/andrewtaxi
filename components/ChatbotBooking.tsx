import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY, PHONE_NUMBER, BOOKING_PRICES } from '../constants';

// Declare google types
declare global {
  interface Window {
    google: any;
  }
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
  name?: string;
  email?: string;
  phone?: string;
}

type ConversationStep = 'pickup' | 'dropoff' | 'passengers' | 'preferences' | 'datetime' | 'name' | 'email' | 'phone' | 'confirm';

export interface ChatbotRef {
  open: () => void;
}

export const ChatbotBooking = React.forwardRef<ChatbotRef>((_, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<ConversationStep>('pickup');
  const [bookingData, setBookingData] = useState<BookingData>({});
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const distanceMatrixServiceRef = useRef<google.maps.DistanceMatrixService | null>(null);

  // Expose open method to parent components
  React.useImperativeHandle(ref, () => ({
    open: () => {
      setIsOpen(true);
      setCurrentStep('pickup');
      setBookingData({});
      setInput('');
    },
  }));

  // Load Google Maps script (same as FareEstimator)
  useEffect(() => {
    // Check if Maps is already loaded
    if (window.google?.maps?.places) {
      setScriptLoaded(true);
      return;
    }

    // Check if script is already loading
    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (script) {
      script.addEventListener('load', () => setScriptLoaded(true));
      return;
    }

    // Create and append new script
    script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Initialize Google Maps services when script is ready
  useEffect(() => {
    if (!scriptLoaded || !isOpen) return;

    if (!autocompleteRef.current && window.google?.maps?.places) {
      try {
        autocompleteRef.current = new google.maps.places.AutocompleteService();
        distanceMatrixServiceRef.current = new google.maps.DistanceMatrixService();
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    }
  }, [scriptLoaded, isOpen]);

  // Handle autocomplete suggestions for pickup/dropoff
  useEffect(() => {
    if ((currentStep !== 'pickup' && currentStep !== 'dropoff') || !input.trim()) {
      setSuggestions([]);
      return;
    }

    if (!autocompleteRef.current) {
      return;
    }

    const getAutocomplete = () => {
      autocompleteRef.current!.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: 'lb' },
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
          } else {
            setSuggestions([]);
          }
        }
      );
    };

    const debounceTimer = setTimeout(getAutocomplete, 300);
    return () => clearTimeout(debounceTimer);
  }, [input, currentStep]);

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

  const handleNext = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    let nextStep = currentStep;
    let updatedBookingData = { ...bookingData };
    let errorMsg = '';

    try {
      switch (currentStep) {
        case 'pickup': {
          const coords = await geocodeAddress(input);
          if (coords) {
            updatedBookingData.pickup = input;
            updatedBookingData.pickupCoords = coords;
            nextStep = 'dropoff';
            setSuggestions([]);
          } else {
            errorMsg = 'Location not found. Try another address.';
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
            nextStep = 'passengers';
            setSuggestions([]);
          } else {
            errorMsg = 'Location not found. Try another address.';
          }
          break;
        }

        case 'passengers': {
          const num = parseInt(input);
          if (num > 0 && num <= 8) {
            updatedBookingData.passengers = num;
            nextStep = 'preferences';
          } else {
            errorMsg = 'Please enter 1-8 passengers.';
          }
          break;
        }

        case 'preferences': {
          updatedBookingData.preferences = input === 'skip' ? '' : input;
          nextStep = 'datetime';
          break;
        }

        case 'datetime': {
          updatedBookingData.datetime = input;
          nextStep = 'name';
          break;
        }

        case 'name': {
          updatedBookingData.name = input;
          nextStep = 'email';
          break;
        }

        case 'email': {
          updatedBookingData.email = input;
          nextStep = 'phone';
          break;
        }

        case 'phone': {
          updatedBookingData.phone = input;
          nextStep = 'confirm';
          break;
        }
      }

      if (errorMsg) {
        alert(errorMsg);
      } else {
        setBookingData(updatedBookingData);
        setCurrentStep(nextStep);
        setInput('');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    }

    setIsLoading(false);
  };

  const handleSuggestionClick = (suggestion: google.maps.places.AutocompletePrediction) => {
    setInput(suggestion.description);
    setSuggestions([]);
  };

  const handleConfirm = () => {
    const message = `*Andrew's Taxi Booking Request*\n\n📍 *Pickup:* ${bookingData.pickup}\n📍 *Dropoff:* ${bookingData.dropoff}\n👥 *Passengers:* ${bookingData.passengers}\n${bookingData.preferences ? `✨ *Preferences:* ${bookingData.preferences}\n` : ''}🕒 *Time:* ${bookingData.datetime}\n💰 *Estimated Fare:* $${bookingData.fare?.toFixed(2)}\n\n*Customer Info:*\nName: ${bookingData.name}\nEmail: ${bookingData.email}\nPhone: ${bookingData.phone}`;

    const whatsappMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${PHONE_NUMBER.replace(/\D/g, '')}?text=${whatsappMessage}`, '_blank');
    
    setIsOpen(false);
  };

  const getTitle = () => {
    switch (currentStep) {
      case 'pickup': return 'Where are you starting from?';
      case 'dropoff': return 'Where are you going?';
      case 'passengers': return 'How many passengers?';
      case 'preferences': return 'Any preferences? (or type "skip")';
      case 'datetime': return 'When do you need the ride?';
      case 'name': return 'Your full name?';
      case 'email': return 'Your email?';
      case 'phone': return 'Your phone number?';
      case 'confirm': return 'Confirm your booking';
      default: return '';
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-taxi-dark text-white p-6 rounded-t-lg flex justify-between items-center">
          <h3 className="font-bold text-xl">Andrew's Taxi</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 'confirm' ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Confirm Your Booking</h2>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <p><strong>Pickup:</strong> {bookingData.pickup}</p>
                <p><strong>Dropoff:</strong> {bookingData.dropoff}</p>
                <p><strong>Passengers:</strong> {bookingData.passengers}</p>
                {bookingData.preferences && <p><strong>Preferences:</strong> {bookingData.preferences}</p>}
                <p><strong>Time:</strong> {bookingData.datetime}</p>
                <p className="text-lg font-bold text-taxi-yellow">Fare: ${bookingData.fare?.toFixed(2)}</p>
                <hr className="my-2" />
                <p><strong>Name:</strong> {bookingData.name}</p>
                <p><strong>Email:</strong> {bookingData.email}</p>
                <p><strong>Phone:</strong> {bookingData.phone}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('pickup')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-bold"
                >
                  Send to WhatsApp
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">{getTitle()}</h2>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleNext()}
                  disabled={isLoading}
                  placeholder="Type here..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-taxi-yellow disabled:bg-gray-100"
                  autoComplete="off"
                  autoFocus
                />
                {/* Autocomplete suggestions */}
                {suggestions.length > 0 && (currentStep === 'pickup' || currentStep === 'dropoff') && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.25rem', backgroundColor: '#FEF3C7', border: '2px solid #EAB308', borderRadius: '0.5rem', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', maxHeight: '14rem', overflowY: 'auto', zIndex: 50 }}>
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.75rem 1rem',
                          backgroundColor: '#FEF3C7',
                          borderBottom: '1px solid #FCD34D',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FDE047'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FEF3C7'}
                      >
                        <div style={{ fontWeight: 'bold', color: '#1F2937', fontSize: '1rem' }}>{suggestion.main_text}</div>
                        <div style={{ color: '#374151', fontSize: '0.75rem', marginTop: '0.25rem' }}>{suggestion.secondary_text}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNext}
                  disabled={isLoading || !input.trim()}
                  className="flex-1 px-4 py-2 bg-taxi-yellow hover:bg-yellow-500 text-taxi-dark rounded-lg transition-colors font-bold disabled:opacity-50"
                >
                  {isLoading ? '...' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ChatbotBooking.displayName = 'ChatbotBooking';
