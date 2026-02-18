import React from 'react';
import { Phone } from 'lucide-react';
import { WHATSAPP_LINK } from '../constants';

export const WhatsAppButton: React.FC = () => {
  const handleClick = () => {
    window.gtag?.('event', 'whatsapp_click', {
      event_category: 'engagement',
      event_label: 'floating_book_button',
    });
  };

  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] text-white px-5 py-3 rounded-full shadow-lg hover:bg-[#20bd5a] transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
      aria-label="Book a ride"
    >
      <Phone className="w-6 h-6 fill-current" />
      <span className="font-bold">Book a Ride</span>
    </a>
  );
};