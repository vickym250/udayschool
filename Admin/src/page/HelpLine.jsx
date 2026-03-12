import React from 'react';
import { Mail, MessageCircle, Phone, LifeBuoy, ChevronRight } from 'lucide-react';

const HelpPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Main Card Section */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Side: Teri Photo aur Profile Info */}
          <div className="md:w-1/3 bg-blue-600 p-8 text-center flex flex-col items-center justify-center text-white">
            <div className="relative">
              {/* Apni photo ka path yahan daalna */}
              <img 
                src="manger.png" 
                alt="Profile" 
                className="w-40 h-40 rounded-full border-4 border-white/30 object-cover shadow-2xl mb-6"
              />
              <span className="absolute bottom-8 right-4 bg-green-500 w-5 h-5 rounded-full border-2 border-blue-600"></span>
            </div>
            <h2 className="text-2xl font-bold">Vikram Maurya</h2>
            <p className="text-blue-100 mt-2">Vtech250 Company CEO</p>
            <div className="mt-6 space-y-2 text-sm opacity-90">
              <p>Average response time: 2 Hours</p>
              <p>Available:24/7</p>
            </div>
          </div>

          {/* Right Side: Help Options */}
          <div className="md:w-2/3 p-8 md:p-12">
            <div className="mb-10">
              <h1 className="text-3xl font-extrabold text-slate-800">Help & Support Center</h1>
              <p className="text-slate-500 mt-2">Hum hamesha aapki madad ke liye taiyar hain. Niche diye gaye options mein se chunain.</p>
            </div>

            <div className="grid gap-4">
              {/* Option 1: Live Chat */}
              

              {/* Option 2: Email */}
              <button className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <Mail size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-800">Email Support</h3>
                    <p className="text-sm text-slate-500">vicky998474@gmail.com</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-400" />
              </button>

              {/* Option 3: Phone */}
              <button className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-lg text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                    <Phone size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-800">Call Karein</h3>
                    <p className="text-sm text-slate-500">+91 9984745195</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-400" />
              </button>
            </div>

            {/* Bottom Note */}
            <div className="mt-8 p-4 bg-slate-50 rounded-xl flex items-center gap-3">
              <LifeBuoy className="text-blue-600" size={20} />
              <p className="text-xs text-slate-600 font-medium">
                Aap hamare <span className="text-blue-600 underline cursor-pointer">FAQs</span> section ko bhi dekh sakte hain.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HelpPage;