import React from 'react';
import { Wrench, Battery, Fuel, Lock, Truck, PenTool as Tool } from 'lucide-react';
import { Link } from 'react-router-dom';

const services = [
  {
    icon: <Truck className="h-12 w-12 text-primary-600" />,
    title: "Emergency Towing",
    description: "24/7 towing service for when your vehicle is completely immobilized. We'll take you to the nearest repair shop or your preferred location."
  },
  {
    icon: <Tool className="h-12 w-12 text-primary-600" />,
    title: "Flat Tire Change",
    description: "Stuck with a flat? We'll come to you and change your tire with your spare or help you get a new one."
  },
  {
    icon: <Battery className="h-12 w-12 text-primary-600" />,
    title: "Battery Jump Start",
    description: "Dead battery? We provide quick jump-start services to get your engine running again in no time."
  },
  {
    icon: <Fuel className="h-12 w-12 text-primary-600" />,
    title: "Fuel Delivery",
    description: "Ran out of gas? We'll deliver enough fuel to get you to the nearest gas station."
  },
  {
    icon: <Lock className="h-12 w-12 text-primary-600" />,
    title: "Lockout Service",
    description: "Locked your keys inside? Our experts can help you regain access to your vehicle without damaging it."
  },
  {
    icon: <Wrench className="h-12 w-12 text-primary-600" />,
    title: "On-site Mechanic",
    description: "For minor mechanical issues, our mobile mechanics can perform repairs right where you are."
  }
];

export const Services: React.FC = () => {
  return (
    <div className="bg-white">
      <div className="bg-primary-900 py-16 text-center text-white">
        <h1 className="text-4xl font-bold mb-4">Our Services</h1>
        <p className="text-xl text-primary-200 max-w-2xl mx-auto px-4">
          Professional, reliable, and fast roadside assistance whenever you need it.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow border border-gray-100">
              <div className="mb-6 bg-white w-20 h-20 rounded-full flex items-center justify-center shadow-sm">
                {service.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
              <p className="text-gray-600 mb-6">{service.description}</p>
              <Link to="/service-request" className="text-primary-600 font-semibold hover:text-primary-700 flex items-center">
                Book Now &rarr;
              </Link>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Not sure what you need?</h2>
          <p className="text-gray-600 mb-8">
            Contact our support team for guidance or describe your issue in the request form.
          </p>
          <Link
            to="/service-request"
            className="bg-primary-600 text-white hover:bg-primary-700 px-8 py-3 rounded-md text-lg font-semibold shadow-md transition-colors"
          >
            Request Help
          </Link>
        </div>
      </div>
    </div>
  );
};
