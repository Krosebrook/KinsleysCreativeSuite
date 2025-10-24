import React from 'react';
import { AnalyticsIcon, ContentStudioIcon, SparklesIcon, ToolLibraryIcon } from './icons';

interface LandingPageProps {
  onSignIn: () => void;
  onStartDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, onStartDemo }) => {
  return (
    <div className="bg-white text-slate-800 font-sans">
      <header className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
            <SparklesIcon className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold">Gemini Creative Suite</span>
        </div>
        <nav>
          <button onClick={onSignIn} className="text-slate-600 font-semibold hover:text-indigo-600 transition">
            Sign In
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="text-center py-20 md:py-32 px-6 bg-slate-50">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
          Unleash Your Creativity with AI
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-8">
          The all-in-one suite that combines powerful AI tools to help you create stunning content, from coloring books to videos, faster than ever before.
        </p>
        <div className="flex justify-center space-x-4">
          <button onClick={onStartDemo} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 shadow-lg">
            Start a Free Demo
          </button>
          <button onClick={onSignIn} className="bg-white text-slate-700 font-bold py-3 px-8 rounded-lg hover:bg-slate-100 transition shadow-md">
            Sign In
          </button>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need in One Place</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="flex justify-center items-center mb-4 bg-indigo-100 rounded-full w-16 h-16 mx-auto">
                <ContentStudioIcon className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Content Studio</h3>
              <p className="text-slate-600">
                Generate personalized coloring books, improve your writing with the Story Booster, and edit images with simple text prompts.
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center items-center mb-4 bg-indigo-100 rounded-full w-16 h-16 mx-auto">
                <ToolLibraryIcon className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Advanced Tool Library</h3>
              <p className="text-slate-600">
                Transform photos into videos with Veo, and engage in real-time voice conversations with our advanced Live Chat assistant.
              </p>
            </div>
            <div className="text-center">
               <div className="flex justify-center items-center mb-4 bg-indigo-100 rounded-full w-16 h-16 mx-auto">
                <AnalyticsIcon className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Grounded & Accurate</h3>
              <p className="text-slate-600">
                Our creative assistant can search the web with Google to provide up-to-date, accurate information and sources for your projects.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-12">Create in 3 Simple Steps</h2>
            <div className="relative">
                {/* Dotted Line for larger screens */}
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-slate-300 border-t-2 border-dashed -translate-y-4"></div>
                <div className="relative grid md:grid-cols-3 gap-12">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <span className="font-bold text-indigo-600 text-lg">Step 1</span>
                        <h3 className="text-xl font-semibold my-2">Select a Tool</h3>
                        <p className="text-slate-600">Choose from a suite of creative tools like the Image Editor or Coloring Book Generator.</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <span className="font-bold text-indigo-600 text-lg">Step 2</span>
                        <h3 className="text-xl font-semibold my-2">Provide Your Prompt</h3>
                        <p className="text-slate-600">Use simple text or your own voice to tell the AI what you want to create or change.</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <span className="font-bold text-indigo-600 text-lg">Step 3</span>
                        <h3 className="text-xl font-semibold my-2">Generate & Refine</h3>
                        <p className="text-slate-600">Let Gemini work its magic. Download, edit, and perfect your creation instantly.</p>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
           <h2 className="text-3xl font-bold text-center mb-12">Loved by Creatives Everywhere</h2>
           <div className="space-y-8">
                <div className="bg-slate-50 p-8 rounded-xl shadow-sm">
                    <p className="text-slate-700 text-lg italic mb-4">"The Coloring Book Generator is a game-changer for my classroom. I can create custom, themed materials in minutes. The kids absolutely love it!"</p>
                    <p className="font-semibold text-slate-800">- Sarah T., Elementary School Teacher</p>
                </div>
                 <div className="bg-slate-50 p-8 rounded-xl shadow-sm">
                    <p className="text-slate-700 text-lg italic mb-4">"As a content creator, the Image and Video editors save me hours. Being able to edit with just text prompts feels like magic. It's an indispensable part of my workflow now."</p>
                    <p className="font-semibold text-slate-800">- Marcus L., Digital Content Creator</p>
                </div>
           </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6 bg-indigo-600 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Creating?</h2>
          <p className="text-lg text-indigo-200 mb-8 max-w-2xl mx-auto">
            Experience the future of content creation. Start your free demo today and see what you can build with the power of Gemini.
          </p>
          <button onClick={onStartDemo} className="bg-white text-indigo-600 font-bold py-3 px-8 rounded-lg hover:bg-slate-100 transition-transform transform hover:scale-105 shadow-2xl">
            Get Started Now
          </button>
        </div>
      </section>

      <footer className="text-center py-6 text-sm text-slate-500">
        <p>© 2024 Gemini Creative Suite. All rights reserved.</p>
      </footer>
    </div>
  );
};
