import React from 'react';
import { Palette } from 'lucide-react';

interface ThemeSettingsSectionProps {
    config: {
        theme: 'default' | 'professional' | 'modern' | 'minimal' | 'executive' | 'corporate' | 'finance' | 'tech' | 'classic' | 'neutral';
    };
    onChange: (key: string, value: any) => void;
}

const ThemeSettingsSection: React.FC<ThemeSettingsSectionProps> = ({
    config,
    onChange,
}) => {
    const themes = [
        { id: 'default', name: 'Default', description: 'Clean and simple design', color: '#6b7280' },
        { id: 'professional', name: 'Professional', description: 'Business-focused styling', color: '#D4E0EE' },
        { id: 'modern', name: 'Modern', description: 'Contemporary and sleek', color: '#ccd9ec' },
        { id: 'minimal', name: 'Minimal', description: 'Clean and minimal approach', color: '#f8e7c2' },
        { id: 'executive', name: 'Executive', description: 'Premium executive styling', color: '#d6ccaf' },
        { id: 'corporate', name: 'Corporate', description: 'Corporate environment design', color: '#e0e0e0' },
        { id: 'finance', name: 'Finance', description: 'Financial industry focused', color: '#d4d5af' },
        { id: 'tech', name: 'Tech', description: 'Technology-oriented design', color: '#9ec5f0' },
        { id: 'classic', name: 'Classic', description: 'Light gray palette', color: '#e5e5e5' },
        { id: 'neutral', name: 'Neutral', description: 'Soft neutral tones', color: '#d8d8d8' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Theme & Styling</h3>
            </div>

            {/* Theme Selection */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                    <Palette size={18} className="mr-2" />
                    Select Theme
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    {themes.map((theme) => (
                        <div
                            key={theme.id}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                config.theme === theme.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                            onClick={() => onChange('theme', theme.id)}
                        >
                            <div className="flex items-center space-x-3">
                                <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: theme.color }}
                                ></div>
                                <div className="flex-grow">
                                    <div className="font-medium text-sm text-gray-900">{theme.name}</div>
                                    <div className="text-xs text-gray-500">{theme.description}</div>
                                </div>
                                {config.theme === theme.id && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ThemeSettingsSection;