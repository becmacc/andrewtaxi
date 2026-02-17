import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Calculator, MessageCircle, AlertCircle, Loader2, RefreshCw, Calendar, ArrowRight } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY, PRICING_CONFIG, PHONE_NUMBER_CLEAN } from '../constants';

// Declare google types to avoid TS errors
declare global {
  interface Window {
    google: any;
    gm_authFailure?: () => void;
  }
}

interface LocationState {
  address: string;
  placeId: string;
}

interface EstimateResult {
  distanceKm: number;
  durationMins: number;
  priceLow: number;
  priceHigh: number;
}

export const FareEstimator: React.FC = () => {
  const [pickup, setPickup] = useState<LocationState>({ address: '', placeId: '' });
  const [dropoff, setDropoff] = useState<LocationState>({ address: '', placeId: '' });
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [dateTime, setDateTime] = useState('');
  const [waitTimeMins, setWaitTimeMins] = useState(0);
  const [carsCount, setCarsCount] = useState(1);
  const [passengerGroup, setPassengerGroup] = useState<'1-4' | '4+'>('1-4');
  const [vehicleType, setVehicleType] = useState<'car' | 'suv'>('car');
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const pickupInputRef = useRef<HTMLInputElement>(null);
  const dropoffInputRef = useRef<HTMLInputElement>(null);

  // Safe Script Loading
  useEffect(() => {
    // Check if we are in a preview/blob environment
    const isBlob = window.location.protocol === 'blob:' || window.location.hostname.includes('scf.usercontent.goog') || window.location.hostname.includes('webcontainer');
    if (isBlob) {
        setIsPreviewMode(true);
    }

    // Define global error handler for Google Maps Auth failures
    window.gm_authFailure = () => {
      console.error("Google Maps API Auth Failure detected.");
      // If we are in preview mode, this is expected due to referrer restrictions
      if (window.location.protocol === 'blob:' || window.location.hostname.includes('scf.usercontent.goog')) {
          setError("Preview Mode: The map is restricted to the live domain (andrewstaxilb.com). Please use the button below to quote manually.");
      } else {
          setError("Map service unavailable. Please message us on WhatsApp for a quote.");
      }
      setScriptLoaded(false);
    };

    // 1. Check if Maps is already fully loaded
    if (window.google?.maps?.places) {
      setScriptLoaded(true);
      return;
    }

    // 2. Check if script is currently loading
    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (script) {
      script.addEventListener('load', () => setScriptLoaded(true));
      script.addEventListener('error', () => setError("Unable to load estimator."));
      return;
    }

    // 3. Inject new script
    script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      // Script loading error (network or 403)
      setError("Maps unavailable in this preview. This feature works on the live site.");
    };
    document.head.appendChild(script);

  }, []);

  useEffect(() => {
    if (!scriptLoaded) return;

    const initAutocomplete = (input: HTMLInputElement | null, setter: React.Dispatch<React.SetStateAction<LocationState>>) => {
      if (!input || !window.google?.maps?.places) return;
      
      try {
        // Use new PlaceAutocompleteElement (recommended by Google)
        const autocomplete = new window.google.maps.places.Autocomplete(input, {
          componentRestrictions: { country: 'lb' },
          fields: ['formatted_address', 'place_id', 'name'],
          strictBounds: false,
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place && place.place_id) {
            setter({
              address: place.formatted_address || place.name || '',
              placeId: place.place_id,
            });
            setEstimate(null);
            setError(null);
          }
        });
      } catch (e) {
        console.error("Autocomplete init failed", e);
        // Fallback: allow manual entry
        setError(null);
      }
    };

    initAutocomplete(pickupInputRef.current, setPickup);
    initAutocomplete(dropoffInputRef.current, setDropoff);
  }, [scriptLoaded]);

  const calculateFare = () => {
    if (!pickup.placeId || !dropoff.placeId) {
      setError("Please select locations from the suggestions list.");
      return;
    }

    if (pickup.placeId === dropoff.placeId) {
      setError("Pickup and drop-off cannot be the same.");
      return;
    }

    setLoading(true);
    setError(null);

    const service = new window.google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
      {
        origins: [{ placeId: pickup.placeId }],
        destinations: [{ placeId: dropoff.placeId }],
        travelMode: 'DRIVING',
        unitSystem: window.google.maps.UnitSystem.METRIC,
      },
      (response: any, status: string) => {
        setLoading(false);

        if (status !== 'OK' || !response || !response.rows[0].elements[0].distance) {
          setError("Distance calculation failed. Please try again or message us.");
          return;
        }

        const element = response.rows[0].elements[0];
        
        if (element.status !== 'OK') {
          setError("Route not found between these locations.");
          return;
        }

        const distanceKm = element.distance.value / 1000;
        const durationMins = Math.round(element.duration.value / 60);

        const { BASE_FARE_USD, PRICE_PER_KM_USD, MIN_FARE_USD, ESTIMATE_VARIANCE, ROUND_TRIP_DISCOUNT } = PRICING_CONFIG;
        
        let fareBase = 0;
        if (tripType === 'one-way') {
          fareBase = BASE_FARE_USD + (distanceKm * PRICE_PER_KM_USD);
        } else {
          const effectiveDistance = distanceKm * 2;
          const discountedKmCost = (effectiveDistance * PRICE_PER_KM_USD) * (1 - ROUND_TRIP_DISCOUNT);
          fareBase = BASE_FARE_USD + discountedKmCost;
        }

        const finalFare = Math.max(fareBase, MIN_FARE_USD);
        
        const low = Math.round(finalFare * (1 - ESTIMATE_VARIANCE));
        const high = Math.round(finalFare * (1 + ESTIMATE_VARIANCE));

        setEstimate({
          distanceKm: parseFloat(distanceKm.toFixed(1)),
          durationMins,
          priceLow: low,
          priceHigh: high,
        });
      }
    );
  };

  const buildWhatsAppLink = (message: string) => {
    const whatsappMessage = encodeURIComponent(message);
    return `https://wa.me/${PHONE_NUMBER_CLEAN}?text=${whatsappMessage}`;
  };

  const buildQuoteMessage = (includeEstimate: boolean) => {
    const pickupText = pickup.address || 'Not provided';
    const dropoffText = dropoff.address || 'Not provided';
    const whenText = dateTime || 'ASAP';
    const waitText = tripType === 'round-trip' ? `${waitHours} hr` : 'N/A';
    const estimateText = includeEstimate && estimate
      ? `$${estimate.priceLow}-$${estimate.priceHigh}`
      : 'N/A';
    const distanceText = includeEstimate && estimate
      ? `${estimate.distanceKm} km`
      : 'N/A';

    return `*Fare Estimate ${includeEstimate ? 'Booking' : 'Request'}*\n` +
      `Pickup: ${pickupText}\n` +
      `Dropoff: ${dropoffText}\n` +
      `Trip type: ${tripType}\n` +
      `When: ${whenText}\n` +
      `Wait time: ${waitText}\n` +
      `Distance: ${distanceText}\n` +
      `Estimate: ${estimateText}`;
  };

  const handleWhatsAppClick = () => {
    const message = buildQuoteMessage(true);
    window.open(buildWhatsAppLink(message), '_blank');
  };

  const handleManualWhatsApp = () => {
    const message = buildQuoteMessage(false);
    window.open(buildWhatsAppLink(message), '_blank');
  };

  const waitHours = Math.round(waitTimeMins / 60);

  const handleCustomRequest = () => {
    const pickupText = pickup.address ? pickup.address : 'Not provided';
    const dropoffText = dropoff.address ? dropoff.address : 'Not provided';
    const waitText = tripType === 'round-trip' ? `${waitHours} hr` : 'N/A';
    const message = `*Custom Ride Request*\n\nPickup: ${pickupText}\nDropoff: ${dropoffText}\nCars: ${carsCount}\nPassengers: ${passengerGroup}\nVehicle: ${vehicleType.toUpperCase()}\nTrip type: ${tripType}\nWait time: ${waitText}\nWhen: ${dateTime || 'Not provided'}`;
    const whatsappMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${PHONE_NUMBER_CLEAN}?text=${whatsappMessage}`, '_blank');
  };

  return (
    <section id="fare-estimator" className="py-12 md:py-16 border-t border-gray-200/50 scroll-mt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-taxi-yellow text-taxi-dark rounded-full font-bold text-xs tracking-wider uppercase mb-3">
            <Calculator className="w-4 h-4" />
            Fare Estimator
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Estimate Your Fare</h2>
          <p className="mt-2 text-gray-600">Get a quick estimate. Confirm and book on WhatsApp.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
          
          {/* Fallback Overlay for Critical Errors */}
          {error && error.includes("restricted") && (
              <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                 <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                     <AlertCircle className="w-8 h-8" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">Maps Preview Unavailable</h3>
                 <p className="text-gray-600 max-w-md mb-6">
                    {error} <br/>
                    <span className="text-sm italic mt-2 block text-gray-500">Don't worry, the map will work perfectly on your live domain.</span>
                 </p>
                 <button
                    onClick={handleManualWhatsApp}
                    className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Message for Quote
                 </button>
              </div>
          )}

          <div className="p-6 md:p-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Pickup */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pickup Point</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    ref={pickupInputRef}
                    type="text"
                    disabled={!!error}
                    placeholder="Search pickup in Lebanon..."
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-taxi-yellow focus:border-taxi-yellow text-sm disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Dropoff */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Drop-off Destination</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Navigation className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    ref={dropoffInputRef}
                    type="text"
                    disabled={!!error}
                    placeholder="Search destination..."
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-taxi-yellow focus:border-taxi-yellow text-sm disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
               {/* Trip Type */}
               <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Trip Type</label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => { setTripType('one-way'); setEstimate(null); setWaitTimeMins(0); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tripType === 'one-way' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    One-way
                  </button>
                  <button
                    onClick={() => { setTripType('round-trip'); setEstimate(null); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tripType === 'round-trip' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Round Trip
                  </button>
                </div>
              </div>

              {/* Date Time Optional */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">When? (Optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => { setDateTime(e.target.value); setEstimate(null); }}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-taxi-yellow focus:border-taxi-yellow text-sm"
                  />
                </div>
              </div>
            </div>

            {tripType === 'round-trip' && (
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estimated wait time (hours)</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={4}
                    step={1}
                    value={waitHours}
                    onChange={(e) => {
                      const value = Math.max(0, Math.min(4, Number(e.target.value)));
                      setWaitTimeMins(Number.isNaN(value) ? 0 : value * 60);
                      setEstimate(null);
                    }}
                    className="block w-full pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-taxi-yellow focus:border-taxi-yellow text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">First 50 min free. Extra wait time confirmed on WhatsApp.</p>
              </div>
            )}

            {error && !error.includes("restricted") && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm flex flex-col gap-2">
                <div className="flex items-center gap-2 font-semibold">
                   <AlertCircle className="w-5 h-5 flex-shrink-0" />
                   {error}
                </div>
                <button 
                  onClick={handleManualWhatsApp}
                  className="mt-1 text-sm font-bold underline hover:text-red-900 self-start flex items-center gap-1"
                >
                  Message us directly <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {!estimate ? (
              <button
                onClick={calculateFare}
                disabled={loading || !scriptLoaded || !!error}
                className="w-full bg-taxi-yellow hover:bg-yellow-400 text-taxi-dark font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
                Calculate Estimate
              </button>
            ) : (
              <div className="animate-fade-in-up">
                <div className="bg-taxi-dark text-white rounded-xl p-6 mb-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Estimated Range</p>
                      <p className="text-4xl font-extrabold text-taxi-yellow">${estimate.priceLow} – ${estimate.priceHigh}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Distance</p>
                      <p className="text-xl font-bold">{estimate.distanceKm} km</p>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-800 pt-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                       <div className="w-1.5 h-1.5 rounded-full bg-taxi-yellow"></div>
                       Estimated fare. Final price confirmed on WhatsApp.
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                       <div className="w-1.5 h-1.5 rounded-full bg-taxi-yellow"></div>
                       Traffic, tolls, and waiting time may affect final price.
                    </div>
                    {tripType === 'round-trip' && (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-taxi-yellow"></div>
                        {waitTimeMins > 50
                          ? `Wait time ${waitHours} hr. First 50 min free; extra time confirmed on WhatsApp.`
                          : `Wait time ${waitHours} hr. First 50 min free.`}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleWhatsAppClick}
                    className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-4 rounded-xl shadow-md transition-all"
                  >
                    <MessageCircle className="w-6 h-6" />
                    Book on WhatsApp
                  </button>
                  <button
                    onClick={() => { setEstimate(null); setError(null); }}
                    className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 font-semibold py-4 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Clear / New Quote
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          *Estimates are calculated using Google Maps standard driving routes. Minimum fare of $6.00 applies to all trips.
        </p>

        <div className="mt-10 bg-white border border-gray-200 rounded-2xl shadow-md p-6 md:p-8">
          <div className="text-center">
            <h3 className="text-2xl font-extrabold text-gray-900">Custom Request</h3>
            <p className="mt-2 text-gray-600">Tell us what you need and we will contact you directly.</p>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-taxi-yellow/15 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-taxi-dark" fill="currentColor" aria-hidden="true">
                    <path d="M7 4h10l3 6v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-1H9v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7l3-6zm1.5 2L7 9h10l-1.5-3h-7zM6 11v3h2v-3H6zm10 0v3h2v-3h-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Vehicle Type</p>
                  <p className="text-xs text-gray-500">Choose car or SUV</p>
                </div>
              </div>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as 'car' | 'suv')}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-taxi-yellow focus:border-taxi-yellow text-sm bg-white"
              >
                <option value="car">Car</option>
                <option value="suv">SUV</option>
              </select>
            </div>

            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-taxi-yellow/15 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-taxi-dark" fill="currentColor" aria-hidden="true">
                    <path d="M16 11c1.66 0 3 1.34 3 3v3h-2v-3a1 1 0 0 0-2 0v3h-2v-3c0-1.66 1.34-3 3-3zM8 11c1.66 0 3 1.34 3 3v3H9v-3a1 1 0 0 0-2 0v3H5v-3c0-1.66 1.34-3 3-3zM12 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Passengers</p>
                  <p className="text-xs text-gray-500">Let us know group size</p>
                </div>
              </div>
              <select
                value={passengerGroup}
                onChange={(e) => setPassengerGroup(e.target.value as '1-4' | '4+')}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-taxi-yellow focus:border-taxi-yellow text-sm bg-white"
              >
                <option value="1-4">1-4 passengers</option>
                <option value="4+">4+ passengers</option>
              </select>
            </div>

            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-taxi-yellow/15 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-taxi-dark" fill="currentColor" aria-hidden="true">
                    <path d="M4 6h9a3 3 0 0 1 3 3v1h4v8h-2v-2H6v2H4V6zm2 8h10v-2a1 1 0 0 0-1-1H6v3zm9-6a1 1 0 0 0-1-1H6v2h9V8zm2 6h2v-2h-2v2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Number of Cars</p>
                  <p className="text-xs text-gray-500">Book multiple cars</p>
                </div>
              </div>
              <input
                type="number"
                min={1}
                max={5}
                step={1}
                value={carsCount}
                onChange={(e) => {
                  const value = Math.max(1, Math.min(5, Number(e.target.value)));
                  setCarsCount(Number.isNaN(value) ? 1 : value);
                }}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-taxi-yellow focus:border-taxi-yellow text-sm"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              onClick={handleCustomRequest}
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105"
            >
              <MessageCircle className="w-5 h-5" />
              Contact Us on WhatsApp
            </button>
            <p className="text-xs text-gray-500">We will contact you directly for special requests.</p>
          </div>
        </div>
      </div>
    </section>
  );
};