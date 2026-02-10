import React from 'react';
import { Button } from './Button';
import { WHATSAPP_LINK } from '../constants';
import { MessageCircle, Star } from 'lucide-react';
import { useChatbot } from '../App';

export const Hero: React.FC = () => {
  const { openChatbot } = useChatbot();
  return (
    <div className="relative bg-gray-900 h-[90vh] min-h-[600px] flex items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop"
          alt="Taxi driving on road"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center md:text-left pt-16">
        <div className="md:max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-taxi-yellow text-gray-900 rounded-full font-bold text-xs tracking-wider uppercase mb-4 animate-fade-in-up">
            <Star className="w-3 h-3 fill-gray-900" />
            5-Star Rated on Google
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
            Reliable Rides, <br className="hidden md:block" />
            <span className="text-taxi-yellow">Every Time.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-xl mx-auto md:mx-0 leading-relaxed">
            Reliable airport transfers, comfortable city rides, and professional drivers 24/7. Skip the stress and book instantly on WhatsApp.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Button onClick={openChatbot} variant="whatsapp" className="gap-2">
              <MessageCircle className="w-5 h-5" />
              Book on WhatsApp
            </Button>
            <Button href="#services" variant="hero">
              Explore Services
            </Button>
          </div>

          <div className="mt-10 flex items-center justify-center md:justify-start gap-6 text-gray-300 text-sm font-medium">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Available Now
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-taxi-yellow"></div>
              Fixed Rates
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Clean Cars
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};