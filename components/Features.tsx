import React from 'react';
import { FEATURES } from '../constants';

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-20 bg-white scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          
          <div className="mb-12 lg:mb-0">
             <div className="relative rounded-2xl overflow-hidden shadow-2xl h-[500px] group">
               <img 
                 src="/featured.jpeg" 
                 alt="Passenger enjoying a comfortable and safe ride"
                 loading="lazy"
                 className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
               />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex items-end p-6 sm:p-8">
                <div className="text-white bg-black/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 max-w-xl">
                    <p className="font-bold text-xl mb-2 text-taxi-yellow">Ride with Confidence</p>
                    <p className="font-medium text-gray-100 text-lg">“Experience the comfort, punctuality, and safety you deserve on every journey.”</p>
                  </div>
               </div>
             </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-taxi-dark tracking-wide uppercase mb-2">Why Choose Us</h2>
            <h3 className="text-3xl font-extrabold text-gray-900 mb-6">
              More than just a ride.
            </h3>
            <p className="text-lg text-gray-500 mb-10">
              We understand that transportation in Lebanon can be stressful. We are here to change that with a reliable, professional, and transparent service.
            </p>

            <div className="space-y-8">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.id} className="flex">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 rounded-md bg-taxi-dark text-white">
                        <Icon className="h-6 w-6 text-taxi-yellow" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg leading-6 font-bold text-gray-900">{feature.title}</h4>
                      <p className="mt-2 text-base text-gray-500">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};