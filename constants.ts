import { Plane, Car, Award, Clock, MapPin, ShieldCheck, Phone } from 'lucide-react';
import { Service, Testimonial, Feature, NavigationItem } from './types';

export const PHONE_NUMBER = "+961 3 301 019";
export const PHONE_NUMBER_CLEAN = "9613301019";
export const WHATSAPP_MESSAGE = "Hello Andrew's Taxi, I would like to book a ride.";
export const WHATSAPP_LINK = `https://wa.me/${PHONE_NUMBER_CLEAN}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
export const EMAIL = "andrewstaxilb@gmail.com";
export const GOOGLE_MAPS_LINK = "https://share.google/1JkyUvwWTwvJ72SxR";
export const GOOGLE_REVIEWS_LINK = "https://share.google/1JkyUvwWTwvJ72SxR"; // Using the provided share link
export const FACEBOOK_LINK = "https://www.facebook.com/andrwesTaxi/";
export const INSTAGRAM_LINK = "https://www.instagram.com/andrewtaxi6/";

// --- FARE ESTIMATOR CONFIGURATION ---
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export const PRICING_CONFIG = {
  BASE_FARE_USD: 2.00,
  PRICE_PER_KM_USD: 1.10,
  MIN_FARE_USD: 6.00,
  ROUND_TRIP_DISCOUNT: 0.00, // 0 means no discount on the second leg
  ESTIMATE_VARIANCE: 0.12,    // 12% buffer
};

export const BOOKING_PRICES = {
  BASE_FARE: 2.00,
  RATE_PER_KM: 1.10,
  MIN_FARE: 6.00,
};

export const NAV_ITEMS: NavigationItem[] = [
  { label: 'Services', href: '#services' },
  { label: 'Estimate Fare', href: '#fare-estimator' },
  { label: 'Why Us', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Reviews', href: '#testimonials' },
  { label: 'Contact', href: '#contact' },
];

export const SERVICES: Service[] = [
  {
    id: 'airport',
    title: 'Airport Transfers',
    description: 'Reliable pickups and drop-offs at Beirut-Rafic Hariri International Airport. We track your flight to ensure we are there when you land.',
    icon: Plane,
  },
  {
    id: 'city',
    title: 'City Rides',
    description: 'Quick and comfortable rides anywhere in Lebanon. Perfect for daily commutes, shopping trips, or visiting friends.',
    icon: Car,
  },
  {
    id: 'professional',
    title: 'Professional Service',
    description: 'Experienced drivers for business meetings, full-day bookings, or special events. Enjoy a smooth, safe, and high-quality journey.',
    icon: Award,
  },
];

export const FEATURES: Feature[] = [
  {
    id: '247',
    title: 'Available 24/7',
    description: 'Early morning flight? Late night party? We are available around the clock to get you where you need to be.',
    icon: Clock,
  },
  {
    id: 'pricing',
    title: 'Fixed Pricing',
    description: 'No surprises or hidden fees. We offer competitive, fixed rates so you know exactly what you pay before you ride.',
    icon: ShieldCheck,
  },
  {
    id: 'drivers',
    title: 'Professional Drivers',
    description: 'Our drivers are experienced, polite, and know the quickest routes across Lebanon to save you time.',
    icon: MapPin,
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Miller',
    location: 'Airport Transfer',
    content: 'The best taxi experience I have had in Lebanon. Andrew was waiting for me at arrivals with a sign, helped with my heavy bags, and the car was very clean. Highly recommended!',
    stars: 5,
    date: '2 weeks ago',
    initial: 'S'
  },
  {
    id: '2',
    name: 'Karim Hage',
    location: 'Beirut',
    content: 'Very professional service. I booked a ride from Jounieh to the Airport at 3 AM. The driver was 10 minutes early and the drive was smooth. Fair prices too.',
    stars: 5,
    date: '1 month ago',
    initial: 'K'
  },
  {
    id: '3',
    name: 'Elena Costa',
    location: 'Tourist',
    content: 'We used Andrew\'s Taxi for a full day trip to Byblos and Batroun. The driver was so polite and drove very safely. Felt completely at ease. Thank you!',
    stars: 5,
    date: '3 weeks ago',
    initial: 'E'
  },
  {
    id: '4',
    name: 'Jad Khoury',
    location: 'Local Guide',
    content: 'Honest pricing and clean cars. It is hard to find reliable taxis in Beirut sometimes, but these guys are consistent. Booked via WhatsApp in seconds.',
    stars: 5,
    date: '2 months ago',
    initial: 'J'
  },
  {
    id: '5',
    name: 'Mike Peterson',
    location: 'Business Traveler',
    content: 'Professional driver. AC was working perfectly (vital in summer). Smooth ride to my meeting in Downtown. Will use again next time I visit.',
    stars: 5,
    date: '1 week ago',
    initial: 'M'
  },
  {
    id: '6',
    name: 'Nour S.',
    location: 'Regular Client',
    content: 'My go-to taxi service. I feel safe riding alone at night with them. The drivers are respectful and professional.',
    stars: 5,
    date: '3 days ago',
    initial: 'N'
  },
];