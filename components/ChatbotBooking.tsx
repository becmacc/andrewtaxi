import React, { useState, useRef, useEffect } from 'react';
import { X, MapPin, Settings, Calendar, User, Check, Edit2 } from 'lucide-react';
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
  pickupPlaceId?: string;
  dropoffPlaceId?: string;
  pickupLatLng?: google.maps.LatLngLiteral;
  dropoffLatLng?: google.maps.LatLngLiteral;
  preferences?: string;
  datetime?: string;
  fare?: number;
  name?: string;
}

type ConversationStep = 'pickup' | 'dropoff' | 'preferences' | 'datetime' | 'name' | 'confirm' | 'edit-menu';

type DistanceLocation = google.maps.LatLngLiteral | { placeId: string };

const PREFERENCE_NOTE_PREFIX = 'Notes:';
const PREFERENCE_TAGS_PREFIX = 'Tags:';

const parsePreferences = (value?: string) => {
  if (!value) return { tags: [] as string[], note: '' };
  const [tagsPart, notePart] = value.split(`; ${PREFERENCE_NOTE_PREFIX} `);
  const tags = tagsPart?.startsWith(PREFERENCE_TAGS_PREFIX)
    ? tagsPart.replace(`${PREFERENCE_TAGS_PREFIX} `, '').split(', ').filter(Boolean)
    : [];
  const note = notePart || (tags.length ? '' : value);
  return { tags, note };
};

const buildPreferences = (tags: string[], note: string) => {
  const cleanNote = note.trim();
  if (!tags.length && !cleanNote) return '';
  if (tags.length && cleanNote) {
    return `${PREFERENCE_TAGS_PREFIX} ${tags.join(', ')}; ${PREFERENCE_NOTE_PREFIX} ${cleanNote}`;
  }
  if (tags.length) {
    return `${PREFERENCE_TAGS_PREFIX} ${tags.join(', ')}`;
  }
  return cleanNote;
};

const formatDateTimeLocal = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const parseDateTimeInput = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTimeDisplay = (value?: string) => {
  if (!value) return 'Not set';
  const date = parseDateTimeInput(value);
  if (!date) return 'Not set';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatLatLngDisplay = (latLng?: google.maps.LatLngLiteral) => {
  if (!latLng) return '';
  return `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`;
};

export interface ChatbotRef {
  open: () => void;
}

export const ChatbotBooking = React.forwardRef<ChatbotRef>((_, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<ConversationStep>('pickup');
  const [bookingData, setBookingData] = useState<BookingData>({});
  const [input, setInput] = useState('');
  const [preferenceTags, setPreferenceTags] = useState<string[]>([]);
  const [preferenceNote, setPreferenceNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const distanceMatrixServiceRef = useRef<google.maps.DistanceMatrixService | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const minDateTime = formatDateTimeLocal(new Date());

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

    // Clean up existing autocomplete instance
    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

    // Only initialize autocomplete for location fields
    if (inputRef.current && (currentStep === 'pickup' || currentStep === 'dropoff')) {
      try {
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'lb' },
          fields: ['formatted_address', 'place_id', 'geometry'],
          strictBounds: false,
        });

        autocompleteRef.current = autocomplete;

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place?.formatted_address && place?.place_id) {
            setInput(place.formatted_address);
            // Store the placeId for later use
            if (currentStep === 'pickup') {
              setBookingData(prev => ({
                ...prev,
                pickupPlaceId: place.place_id,
                pickupLatLng: undefined,
              }));
            } else if (currentStep === 'dropoff') {
              setBookingData(prev => ({
                ...prev,
                dropoffPlaceId: place.place_id,
                dropoffLatLng: undefined,
              }));
            }
          }
        });
      } catch (error) {
        console.error('Autocomplete init failed:', error);
      }
    }

    // Cleanup function
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [scriptLoaded, isOpen, currentStep]);

  useEffect(() => {
    const isMapStep = currentStep === 'pickup' || currentStep === 'dropoff';
    if (!scriptLoaded || !isMapStep || !mapContainerRef.current) return;

    const isPickup = currentStep === 'pickup';
    const savedLatLng = isPickup ? bookingData.pickupLatLng : bookingData.dropoffLatLng;
    const defaultCenter = savedLatLng || { lat: 33.8938, lng: 35.5018 };
    const map = new google.maps.Map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: savedLatLng ? 16 : 13,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    });

    mapRef.current = map;
    markerRef.current = new google.maps.Marker({
      map,
      position: savedLatLng || undefined,
    });

    mapClickListenerRef.current = map.addListener('click', event => {
      if (!event.latLng) return;
      const position = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      };
      markerRef.current?.setPosition(position);
      const geocoder = window.google?.maps?.Geocoder ? new google.maps.Geocoder() : null;
      const coords = formatLatLngDisplay(position);

      if (!geocoder) {
        setInput(`Pinned location (${coords})`);
        setBookingData(prev => ({
          ...prev,
          ...(isPickup
            ? {
                pickup: `Pinned location (${coords})`,
                pickupLatLng: position,
                pickupPlaceId: undefined,
              }
            : {
                dropoff: `Pinned location (${coords})`,
                dropoffLatLng: position,
                dropoffPlaceId: undefined,
              }),
        }));
        return;
      }

      geocoder.geocode({ location: position }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const result = results[0];
          const address = result.formatted_address || `Pinned location (${coords})`;
          setInput(address);
          setBookingData(prev => ({
            ...prev,
            ...(isPickup
              ? {
                  pickup: address,
                  pickupLatLng: position,
                  pickupPlaceId: result.place_id,
                }
              : {
                  dropoff: address,
                  dropoffLatLng: position,
                  dropoffPlaceId: result.place_id,
                }),
          }));
        } else {
          setInput(`Pinned location (${coords})`);
          setBookingData(prev => ({
            ...prev,
            ...(isPickup
              ? {
                  pickup: `Pinned location (${coords})`,
                  pickupLatLng: position,
                  pickupPlaceId: undefined,
                }
              : {
                  dropoff: `Pinned location (${coords})`,
                  dropoffLatLng: position,
                  dropoffPlaceId: undefined,
                }),
          }));
        }
      });
    });

    return () => {
      if (mapClickListenerRef.current) {
        google.maps.event.removeListener(mapClickListenerRef.current);
      }
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [scriptLoaded, currentStep, bookingData.pickupLatLng, bookingData.dropoffLatLng]);

  useEffect(() => {
    if (currentStep !== 'datetime' || input.trim()) return;
    if (bookingData.datetime) {
      setInput(bookingData.datetime);
      return;
    }
    const defaultDate = new Date(Date.now() + 15 * 60 * 1000);
    setInput(formatDateTimeLocal(defaultDate));
  }, [currentStep, bookingData.datetime, input]);

  useEffect(() => {
    if (currentStep !== 'preferences') return;
    const parsed = parsePreferences(bookingData.preferences);
    setPreferenceTags(parsed.tags);
    setPreferenceNote(parsed.note);
  }, [currentStep, bookingData.preferences]);

  // No Geocoding needed - we use placeId from autocomplete directly

  const getDistanceLocation = (placeId?: string, latLng?: google.maps.LatLngLiteral): DistanceLocation | null => {
    if (placeId) return { placeId };
    if (latLng) return latLng;
    return null;
  };

  const calculateFare = async (pickup: DistanceLocation, dropoff: DistanceLocation): Promise<number | null> => {
    try {
      if (!distanceMatrixServiceRef.current) {
        distanceMatrixServiceRef.current = new google.maps.DistanceMatrixService();
      }

      const response = await distanceMatrixServiceRef.current.getDistanceMatrix({
        origins: [pickup],
        destinations: [dropoff],
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

  const handleEditField = (field: ConversationStep) => {
    // Pre-populate input with existing value
    switch (field) {
      case 'pickup':
        setInput(bookingData.pickup || '');
        break;
      case 'dropoff':
        setInput(bookingData.dropoff || '');
        break;
      case 'datetime':
        setInput(bookingData.datetime || '');
        break;
      case 'preferences':
        {
          const parsed = parsePreferences(bookingData.preferences);
          setPreferenceTags(parsed.tags);
          setPreferenceNote(parsed.note);
        }
        break;
      case 'name':
        setInput(bookingData.name || '');
        break;
    }
    setCurrentStep(field);
  };

  const getPreviousStep = (step: ConversationStep): ConversationStep => {
    switch (step) {
      case 'dropoff':
        return 'pickup';
      case 'datetime':
        return 'dropoff';
      case 'preferences':
        return 'datetime';
      case 'name':
        return 'preferences';
      case 'confirm':
        return 'name';
      default:
        return 'pickup';
    }
  };

  const handleBack = () => {
    if (currentStep === 'pickup') {
      setIsOpen(false);
      return;
    }

    const previousStep = getPreviousStep(currentStep);
    handleEditField(previousStep);
  };

  const setPresetMinutes = (minutes: number) => {
    const date = new Date(Date.now() + minutes * 60 * 1000);
    setInput(formatDateTimeLocal(date));
  };

  const isDateTimeValid = (value: string) => {
    const date = parseDateTimeInput(value);
    if (!date) return false;
    return date.getTime() >= Date.now();
  };

  const togglePreferenceTag = (tag: string) => {
    setPreferenceTags(prev =>
      prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag]
    );
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    if (!window.google?.maps) {
      alert('Maps are still loading. Please try again in a moment.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      position => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        const geocoder = window.google?.maps?.Geocoder ? new google.maps.Geocoder() : null;
        if (!geocoder) {
          const coords = formatLatLngDisplay(location);
          setInput(`Current location (${coords})`);
          setBookingData(prev => ({
            ...prev,
            pickup: `Current location (${coords})`,
            pickupLatLng: location,
            pickupPlaceId: undefined,
          }));
          setIsLocating(false);
          return;
        }

        geocoder.geocode({ location }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const result = results[0];
            const address = result.formatted_address || 'Current location';
            setInput(address);
            setBookingData(prev => ({
              ...prev,
              pickup: address,
              pickupPlaceId: result.place_id,
              pickupLatLng: location,
            }));
          } else {
            const coords = formatLatLngDisplay(location);
            setInput(`Current location (${coords})`);
            setBookingData(prev => ({
              ...prev,
              pickup: `Current location (${coords})`,
              pickupLatLng: location,
              pickupPlaceId: undefined,
            }));
          }
          setIsLocating(false);
        });
      },
      () => {
        alert('Location permission was denied.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleNext = async () => {
    if (isLoading) return;
    if (currentStep !== 'preferences' && !input.trim()) return;

    setIsLoading(true);
    let nextStep = currentStep;
    let updatedBookingData = { ...bookingData };
    let errorMsg = '';

    try {
      switch (currentStep) {
        case 'pickup': {
          if (updatedBookingData.pickupPlaceId || updatedBookingData.pickupLatLng) {
            updatedBookingData.pickup = input || updatedBookingData.pickup || 'Current location';
            // If editing, recalculate fare if dropoff exists
            const pickupLocation = getDistanceLocation(
              updatedBookingData.pickupPlaceId,
              updatedBookingData.pickupLatLng
            );
            const dropoffLocation = getDistanceLocation(
              updatedBookingData.dropoffPlaceId,
              updatedBookingData.dropoffLatLng
            );

            if (pickupLocation && dropoffLocation) {
              const fare = await calculateFare(pickupLocation, dropoffLocation);
              updatedBookingData.fare = fare || 0;
              nextStep = 'confirm';
            } else {
              nextStep = 'dropoff';
            }
          } else {
            errorMsg = 'Please select a location from the suggestions, use your current location, or drop a pin on the map.';
          }
          break;
        }

        case 'dropoff': {
          if (updatedBookingData.dropoffPlaceId || updatedBookingData.dropoffLatLng) {
            updatedBookingData.dropoff = input || updatedBookingData.dropoff || 'Pinned location';

            // Calculate fare using placeIds
            const pickupLocation = getDistanceLocation(
              updatedBookingData.pickupPlaceId,
              updatedBookingData.pickupLatLng
            );
            const dropoffLocation = getDistanceLocation(
              updatedBookingData.dropoffPlaceId,
              updatedBookingData.dropoffLatLng
            );

            if (pickupLocation && dropoffLocation) {
              const fare = await calculateFare(pickupLocation, dropoffLocation);
              updatedBookingData.fare = fare || 0;
            }
            // If editing, return to confirm
            nextStep = updatedBookingData.name ? 'confirm' : 'datetime';
          } else {
            errorMsg = 'Please select a location from the suggestions or drop a pin on the map.';
          }
          break;
        }

        case 'datetime': {
          if (isDateTimeValid(input)) {
            updatedBookingData.datetime = input;
            nextStep = updatedBookingData.name ? 'confirm' : 'preferences';
          } else {
            errorMsg = 'Please choose a future date and time.';
          }
          break;
        }

        case 'preferences': {
          updatedBookingData.preferences = buildPreferences(preferenceTags, preferenceNote);
          nextStep = updatedBookingData.name ? 'confirm' : 'name';
          break;
        }

        case 'name': {
          updatedBookingData.name = input;
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

  const handleSendClick = (e: React.FormEvent) => {
    e.preventDefault();
    handleNext();
  };

  const handleConfirm = () => {
    const formattedDateTime = formatDateTimeDisplay(bookingData.datetime);
    const message = `*Andrew's Taxi Booking Request*\n\n📍 *Pickup:* ${bookingData.pickup}\n📍 *Dropoff:* ${bookingData.dropoff}\n${bookingData.preferences ? `✨ *Preferences:* ${bookingData.preferences}\n` : ''}🕒 *Time:* ${formattedDateTime}\n💰 *Estimated Fare:* $${bookingData.fare?.toFixed(2)}\n\n*Customer Name:* ${bookingData.name}`;

    const whatsappMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${PHONE_NUMBER.replace(/\D/g, '')}?text=${whatsappMessage}`, '_blank');
    
    setIsOpen(false);
  };

  const getTitle = () => {
    switch (currentStep) {
      case 'pickup': return 'Where are you starting from?';
      case 'dropoff': return 'Where are you going?';
      case 'datetime': return 'When do you need the ride?';
      case 'preferences': return 'Any preferences? (optional)';
      case 'name': return 'Your name?';
      case 'confirm': return 'Confirm your booking';
      case 'edit-menu': return 'Edit booking details';
      default: return '';
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 'pickup': return <MapPin className="text-taxi-yellow" size={24} />;
      case 'dropoff': return <MapPin className="text-taxi-yellow" size={24} />;
      case 'datetime': return <Calendar className="text-taxi-yellow" size={24} />;
      case 'preferences': return <Settings className="text-taxi-yellow" size={24} />;
      case 'name': return <User className="text-taxi-yellow" size={24} />;
      case 'confirm': return <Check className="text-green-500" size={24} />;
      case 'edit-menu': return <Edit2 className="text-blue-500" size={24} />;
      default: return null;
    }
  };

  const getProgress = () => {
    const steps: ConversationStep[] = ['pickup', 'dropoff', 'datetime', 'preferences', 'name', 'confirm'];
    const currentIndex = steps.indexOf(currentStep);
    return currentIndex === -1 ? 100 : ((currentIndex + 1) / steps.length) * 100;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-hidden animate-slideUp flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-taxi-dark to-gray-800 text-white p-5 relative flex-shrink-0">
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="font-bold text-xl">Book Your Ride</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-2 rounded-full transition-all duration-200 hover:rotate-90"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
          {/* Progress Bar */}
          <div className="relative h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-taxi-yellow rounded-full transition-all duration-500 ease-out"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className={currentStep === 'confirm' || currentStep === 'edit-menu' ? 'p-5 overflow-y-auto flex-1' : 'p-6 overflow-y-auto flex-1'}>
          {currentStep === 'edit-menu' ? (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-100 rounded-full">
                  <Edit2 className="text-blue-600" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Edit Details</h2>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleEditField('pickup')}
                  className="w-full flex items-center justify-between p-3.5 bg-white border-2 border-gray-200 rounded-xl hover:border-taxi-yellow hover:bg-taxi-yellow/5 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="text-green-500" size={18} />
                    <div className="text-left">
                      <p className="text-xs text-gray-500 font-medium">Pickup Location</p>
                      <p className="text-sm font-semibold text-gray-800">{bookingData.pickup}</p>
                    </div>
                  </div>
                  <Edit2 className="text-gray-400 group-hover:text-taxi-yellow transition-colors" size={16} />
                </button>

                <button
                  onClick={() => handleEditField('dropoff')}
                  className="w-full flex items-center justify-between p-3.5 bg-white border-2 border-gray-200 rounded-xl hover:border-taxi-yellow hover:bg-taxi-yellow/5 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="text-red-500" size={18} />
                    <div className="text-left">
                      <p className="text-xs text-gray-500 font-medium">Dropoff Location</p>
                      <p className="text-sm font-semibold text-gray-800">{bookingData.dropoff}</p>
                    </div>
                  </div>
                  <Edit2 className="text-gray-400 group-hover:text-taxi-yellow transition-colors" size={16} />
                </button>

                <button
                  onClick={() => handleEditField('datetime')}
                  className="w-full flex items-center justify-between p-3.5 bg-white border-2 border-gray-200 rounded-xl hover:border-taxi-yellow hover:bg-taxi-yellow/5 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="text-purple-500" size={18} />
                    <div className="text-left">
                      <p className="text-xs text-gray-500 font-medium">Date & Time</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {formatDateTimeDisplay(bookingData.datetime)}
                      </p>
                    </div>
                  </div>
                  <Edit2 className="text-gray-400 group-hover:text-taxi-yellow transition-colors" size={16} />
                </button>

                <button
                  onClick={() => handleEditField('preferences')}
                  className="w-full flex items-center justify-between p-3.5 bg-white border-2 border-gray-200 rounded-xl hover:border-taxi-yellow hover:bg-taxi-yellow/5 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="text-orange-500" size={18} />
                    <div className="text-left">
                      <p className="text-xs text-gray-500 font-medium">Preferences</p>
                      <p className="text-sm font-semibold text-gray-800">{bookingData.preferences || 'None'}</p>
                    </div>
                  </div>
                  <Edit2 className="text-gray-400 group-hover:text-taxi-yellow transition-colors" size={16} />
                </button>

                <button
                  onClick={() => handleEditField('name')}
                  className="w-full flex items-center justify-between p-3.5 bg-white border-2 border-gray-200 rounded-xl hover:border-taxi-yellow hover:bg-taxi-yellow/5 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <User className="text-indigo-500" size={18} />
                    <div className="text-left">
                      <p className="text-xs text-gray-500 font-medium">Your Name</p>
                      <p className="text-sm font-semibold text-gray-800">{bookingData.name}</p>
                    </div>
                  </div>
                  <Edit2 className="text-gray-400 group-hover:text-taxi-yellow transition-colors" size={16} />
                </button>
              </div>

              <button
                onClick={() => setCurrentStep('confirm')}
                className="w-full mt-4 px-5 py-3 bg-gradient-to-r from-taxi-yellow to-yellow-400 hover:from-yellow-400 hover:to-yellow-500 text-taxi-dark rounded-xl transition-all duration-200 font-bold shadow-md hover:shadow-lg"
              >
                Back to Confirmation
              </button>
            </div>
          ) : currentStep === 'confirm' ? (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-green-100 rounded-full">
                  <Check className="text-green-600" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Review & Confirm</h2>
              </div>
              
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3.5 rounded-xl space-y-2.5 border border-gray-200">
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg">
                    <MapPin className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 font-medium">Pickup</p>
                      <p className="text-sm font-semibold text-gray-800 break-words">{bookingData.pickup}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg">
                    <MapPin className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 font-medium">Dropoff</p>
                      <p className="text-sm font-semibold text-gray-800 break-words">{bookingData.dropoff}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 p-2.5 bg-white rounded-lg">
                    <Calendar className="text-purple-500 flex-shrink-0 mt-0.5" size={14} />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Time</p>
                      <p className="text-xs font-semibold text-gray-800 break-words">{formatDateTimeDisplay(bookingData.datetime)}</p>
                    </div>
                  </div>
                  
                  {bookingData.preferences && (
                    <div className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg">
                      <Settings className="text-orange-500 flex-shrink-0 mt-0.5" size={16} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500 font-medium">Preferences</p>
                        <p className="text-sm text-gray-800 break-words">{bookingData.preferences}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg">
                    <User className="text-indigo-500 flex-shrink-0 mt-0.5" size={16} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 font-medium">Your Name</p>
                      <p className="text-sm font-semibold text-gray-800 break-words">{bookingData.name}</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-300 pt-2.5 mt-2.5">
                  <div className="bg-gradient-to-r from-taxi-yellow to-yellow-400 p-3 rounded-lg text-center">
                    <p className="text-xs text-taxi-dark/70 font-medium mb-0.5">Estimated Fare</p>
                    <p className="text-2xl font-bold text-taxi-dark">${bookingData.fare?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('edit-menu')}
                  className="flex-1 px-5 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold text-gray-700 hover:border-gray-400"
                >
                  Edit Details
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Send to WhatsApp
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-taxi-yellow/10 rounded-xl">
                  {getStepIcon()}
                </div>
                <h2 className="text-lg font-bold text-gray-800">{getTitle()}</h2>
              </div>
              
              {currentStep === 'datetime' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPresetMinutes(10)}
                      className="px-3 py-2.5 rounded-xl border-2 border-gray-200 hover:border-taxi-yellow hover:bg-taxi-yellow/5 transition-all duration-200 text-sm font-semibold text-gray-700"
                    >
                      ASAP
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetMinutes(15)}
                      className="px-3 py-2.5 rounded-xl border-2 border-gray-200 hover:border-taxi-yellow hover:bg-taxi-yellow/5 transition-all duration-200 text-sm font-semibold text-gray-700"
                    >
                      +15 min
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetMinutes(30)}
                      className="px-3 py-2.5 rounded-xl border-2 border-gray-200 hover:border-taxi-yellow hover:bg-taxi-yellow/5 transition-all duration-200 text-sm font-semibold text-gray-700"
                    >
                      +30 min
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetMinutes(60)}
                      className="px-3 py-2.5 rounded-xl border-2 border-gray-200 hover:border-taxi-yellow hover:bg-taxi-yellow/5 transition-all duration-200 text-sm font-semibold text-gray-700"
                    >
                      +1 hour
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Pick a time</label>
                    <input
                      key={currentStep}
                      type="datetime-local"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleNext()}
                      disabled={isLoading}
                      min={minDateTime}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 focus:outline-none focus:border-taxi-yellow focus:ring-4 focus:ring-taxi-yellow/10 disabled:bg-gray-100 transition-all duration-200 text-base"
                      autoComplete="off"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500">Local time shown in your device settings.</p>
                    {input && !isDateTimeValid(input) && (
                      <p className="text-xs font-semibold text-red-500">Please choose a future time.</p>
                    )}
                  </div>
                </div>
              ) : currentStep === 'preferences' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      '4+ passengers',
                      'Lots of luggage',
                      'Quiet ride',
                      'No conversation',
                      'Need rest/sleep',
                      'Help with bags',
                    ].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => togglePreferenceTag(tag)}
                        className={`px-3 py-2.5 rounded-xl border-2 transition-all duration-200 text-sm font-semibold ${
                          preferenceTags.includes(tag)
                            ? 'border-taxi-yellow bg-taxi-yellow/10 text-taxi-dark'
                            : 'border-gray-200 hover:border-taxi-yellow hover:bg-taxi-yellow/5 text-gray-700'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Any notes</label>
                    <textarea
                      rows={3}
                      value={preferenceNote}
                      onChange={e => setPreferenceNote(e.target.value)}
                      placeholder="Other"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-taxi-yellow focus:ring-4 focus:ring-taxi-yellow/10 transition-all duration-200 text-base resize-none"
                    />
                    <p className="text-xs text-gray-500">Optional. This will be shared with your driver.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      key={currentStep}
                      ref={(currentStep === 'pickup' || currentStep === 'dropoff') ? inputRef : null}
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleNext()}
                      disabled={isLoading}
                      placeholder="Type here..."
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 focus:outline-none focus:border-taxi-yellow focus:ring-4 focus:ring-taxi-yellow/10 disabled:bg-gray-100 transition-all duration-200 text-base"
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  {currentStep === 'pickup' && (
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocating}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl hover:border-taxi-yellow hover:bg-taxi-yellow/5 transition-all duration-200 text-sm font-semibold text-gray-700 disabled:opacity-60"
                    >
                      {isLocating ? 'Detecting your location...' : 'Use my current location'}
                    </button>
                  )}
                  {(currentStep === 'pickup' || currentStep === 'dropoff') && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">
                        {currentStep === 'pickup' ? 'Tap the map to set your pickup pin.' : 'Tap the map to drop a pin.'}
                      </p>
                      <div
                        ref={mapContainerRef}
                        className="w-full h-48 rounded-xl border-2 border-gray-200"
                      />
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 px-5 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold text-gray-700 hover:border-gray-400"
                >
                  {currentStep === 'pickup' ? 'Cancel' : 'Back'}
                </button>
                <button
                  onClick={handleNext}
                  disabled={
                    isLoading ||
                    (currentStep !== 'preferences' && !input.trim()) ||
                    (currentStep === 'datetime' && !isDateTimeValid(input))
                  }
                  className="flex-1 px-5 py-2.5 bg-gradient-to-r from-taxi-yellow to-yellow-400 hover:from-yellow-400 hover:to-yellow-500 text-taxi-dark rounded-xl transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-pulse">●</span>
                      <span className="animate-pulse delay-100">●</span>
                      <span className="animate-pulse delay-200">●</span>
                    </span>
                  ) : 'Continue'}
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
