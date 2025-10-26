import React, { useState, useEffect } from 'react';
import { XIcon, FolderKanbanIcon, ToolLibraryIcon, MessageSquareIcon, ArrowLeftIcon, ArrowRightIcon, SparklesIcon } from './icons';

const ONBOARDING_KEY = 'geminiCreativeSuite_hasCompletedOnboarding';

const tourSteps = [
    {
        icon: SparklesIcon,
        title: "Welcome to the Gemini Creative Suite!",
        content: "This quick tour will guide you through the key features to help you get started on your creative journey."
    },
    {
        icon: FolderKanbanIcon,
        title: "The Project Hub",
        content: "This is where you'll start. Create new projects to organize your work. Each project is a dedicated workspace for your ideas, assets, and creations."
    },
    {
        icon: ToolLibraryIcon,
        title: "The Creative Tools",
        content: "Inside each project, you'll find a library of powerful AI tools. From editing images and creating stickers to boosting your stories, this is your creative toolbox."
    },
    {
        icon: MessageSquareIcon,
        title: "Your AI Assistant",
        content: "Need help or inspiration? The chat assistant is always available. It's context-aware, meaning it knows which tool you're using and can provide relevant advice!"
    }
];

export const OnboardingTour: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const hasOnboarded = localStorage.getItem(ONBOARDING_KEY);
        if (!hasOnboarded) {
            setIsOpen(true);
        }
    }, []);

    const handleFinish = () => {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        setIsOpen(false);
    };

    const handleNext = () => {
        if (step < tourSteps.length - 1) {
            setStep(s => s + 1);
        } else {
            handleFinish();
        }
    };

    const handlePrev = () => {
        if (step > 0) {
            setStep(s => s - 1);
        }
    };

    if (!isOpen) {
        return null;
    }

    const currentStep = tourSteps[step];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md relative text-center">
                <button onClick={handleFinish} className="absolute top-4 right-4 p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                    <XIcon className="w-5 h-5" />
                </button>
                
                <div className="mb-6 text-indigo-500">
                    <currentStep.icon className="w-16 h-16 mx-auto" />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">{currentStep.title}</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 min-h-[72px]">{currentStep.content}</p>

                <div className="flex items-center justify-between">
                    <button onClick={handlePrev} disabled={step === 0} className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                        <ArrowLeftIcon className="w-4 h-4" />
                        <span>Prev</span>
                    </button>

                    <div className="flex space-x-2">
                        {tourSteps.map((_, i) => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-full ${i === step ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                        ))}
                    </div>

                    <button onClick={handleNext} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center space-x-2">
                        <span>{step === tourSteps.length - 1 ? "Finish" : "Next"}</span>
                        {step < tourSteps.length - 1 && <ArrowRightIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};
