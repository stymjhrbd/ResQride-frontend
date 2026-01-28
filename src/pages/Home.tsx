import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Clock, MapPin, Wrench, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export const Home: React.FC = () => {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
          <img
            src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
            alt="Car Breakdown"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-32 md:py-48">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              Stuck on the Road? <br />
              <span className="text-primary-500">We've Got Your Back.</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl">
              Professional on-demand mechanic and roadside assistance services. Fast, reliable, and just a click away.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/service-request"
                className="bg-primary-600 text-white hover:bg-primary-700 px-8 py-4 rounded-md text-lg font-semibold text-center transition-all shadow-lg hover:shadow-primary-500/30"
              >
                Request Assistance Now
              </Link>
              <Link
                to="/register"
                className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 rounded-md text-lg font-semibold text-center transition-all"
              >
                Join as Mechanic
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose ResQride?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We connect you with the nearest professional mechanics to get you back on the road safely and quickly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Clock className="h-10 w-10 text-primary-600" />}
              title="Fast Response"
              description="Our smart dispatch system connects you with the nearest available mechanic in minutes."
            />
            <FeatureCard
              icon={<Shield className="h-10 w-10 text-primary-600" />}
              title="Verified Professionals"
              description="All our mechanics and service providers are vetted, insured, and highly rated."
            />
            <FeatureCard
              icon={<MapPin className="h-10 w-10 text-primary-600" />}
              title="Real-time Tracking"
              description="Track your service provider in real-time and know exactly when help will arrive."
            />
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="w-full md:w-1/2">
              <img
                src="https://images.unsplash.com/photo-1530124566582-a618bc2615dc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
                alt="Mechanic working"
                className="rounded-lg shadow-xl w-full"
              />
            </div>
            <div className="w-full md:w-1/2">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Comprehensive Roadside Services</h2>
              <ul className="space-y-4">
                <ServiceItem text="Emergency Towing & Recovery" />
                <ServiceItem text="Flat Tire Change & Repair" />
                <ServiceItem text="Battery Jump Start & Replacement" />
                <ServiceItem text="Fuel Delivery" />
                <ServiceItem text="Lockout Services" />
                <ServiceItem text="On-site Mechanical Repairs" />
              </ul>
              <div className="mt-8">
                <Link to="/services" className="text-primary-600 font-semibold hover:text-primary-700 flex items-center">
                  View all services <Wrench className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-700 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied users who trust ResQride for their roadside assistance needs.
          </p>
          <Link
            to="/register"
            className="bg-white text-primary-700 hover:bg-gray-100 px-8 py-3 rounded-md text-lg font-semibold shadow-md transition-colors inline-block"
          >
            Create Your Account
          </Link>
        </div>
      </section>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
    <div className="mb-4 bg-primary-50 w-16 h-16 rounded-full flex items-center justify-center">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const ServiceItem: React.FC<{ text: string }> = ({ text }) => (
  <li className="flex items-center text-gray-700">
    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
    <span className="text-lg">{text}</span>
  </li>
);
