import React, { lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Services } from './components/Services';
import { Features } from './components/Features';
import { HowItWorks } from './components/HowItWorks';
import { Testimonials } from './components/Testimonials';
import { Footer } from './components/Footer';
import { WhatsAppButton } from './components/WhatsAppButton';

const FareEstimator = lazy(() => import('./components/FareEstimator').then(m => ({ default: m.FareEstimator })));

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <Hero />
        <Services />
        <Suspense fallback={<div className="py-20 text-center">Loading...</div>}>
          <FareEstimator />
        </Suspense>
        <Features />
        <HowItWorks />
        <Testimonials />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default App;