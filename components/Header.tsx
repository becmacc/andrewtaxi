import React, { useState, useEffect } from 'react';
import { Menu, X, Phone } from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { Logo } from './Logo';
import { useChatbot } from '../App';

export const Header: React.FC = () => {
  const { openChatbot } = useChatbot();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed w-full z-40 transition-all duration-300 ${
        isScrolled || isOpen ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <a href="#" className="flex items-center">
               {/* Increased height for image logo visibility */}
               <Logo className="h-20 md:h-20" variant={isScrolled || isOpen ? 'dark' : 'light'} />
            </a>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-8">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`text-sm font-medium hover:text-taxi-yellow transition-colors ${
                  isScrolled ? 'text-gray-700' : 'text-white'
                }`}
              >
                {item.label}
              </a>
            ))}
            <button
              onClick={openChatbot}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Book on WhatsApp
            </button>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`inline-flex items-center justify-center p-2 rounded-md focus:outline-none ${
                isScrolled || isOpen ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100' : 'text-white hover:text-yellow-200'
              }`}
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'} bg-white border-t`}>
        <div className="px-4 pt-2 pb-6 space-y-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="block px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <div className="pt-4">
            <button
              onClick={() => {
                openChatbot();
                setIsOpen(false);
              }}
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white px-4 py-3 rounded-lg font-semibold hover:bg-[#20bd5a] transition-colors"
            >
              <Phone className="w-5 h-5" />
              Book on WhatsApp
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};