import React, { useState } from 'react';

interface AddStyleModalProps {
    onClose: () => void;
    onSave: (name: string) => void;
}

export const AddStyleModal: React.FC<AddStyleModalProps> = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm relative">
                <h3 className="text-xl font-bold text-center mb-4">Add to Style Palette</h3>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter style name..." className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="flex justify-end space-x-2">
                    <button onClick={onClose} className="py-2 px-4 bg-slate-200 dark:bg-slate-600 rounded-lg font-semibold">Cancel</button>
                    <button onClick={() => { if(name.trim()) onSave(name.trim()); }} disabled={!name.trim()} className="py-2 px-4 bg-indigo-600 text-white rounded-lg font-semibold disabled:bg-slate-400">Save</button>
                </div>
            </div>
        </div>
    );
};
