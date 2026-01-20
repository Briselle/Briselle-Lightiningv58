import React from 'react';
import { Palette, Monitor, Smartphone, Tablet } from 'lucide-react';

interface ThemeSettingsSectionProps {
    config: {
        theme: 'default' | 'professional' | 'modern' | 'minimal' | 'executive' | 'corporate' | 'finance' | 'tech';
        density: 'compact' | 'standard' | 'comfortable' | 'spacious';
        tableView: 'default' | 'card' | 'list';
    };
    modalWidth: number;
    modalOverlayTransparency: number;
    onChange: (key: string, value: any) => void;
    onModalWidthChange: (width: number) => void;
    onModalOverlayTransparencyChange: (transparency: number) => void;
}

const ThemeSettingsSection: React.FC<ThemeSettingsSectionProps> = ({
    config,
    modalWidth,
    modalOverlayTransparency,
    onChange,
    onModalWidthChange,
    onModalOverlayTransparencyChange,
}) => {
    const themes = [
        { id: 'default', name: 'Default', description: 'Clean and simple design', color: '#6b7280' },
        { id: 'professional', name: 'Professional', description: 'Business-focused styling', color: '#0891b2' },
        { id: 'modern', name: 'Modern', description: 'Contemporary and sleek', color: '#10b981' },
        { id: 'minimal', name: 'Minimal', description: 'Clean and minimal approach', color: '#eab308' },
        { id: 'executive', name: 'Executive', description: 'Premium executive styling', color: '#7c3aed' },
        { id: 'corporate', name: 'Corporate', description: 'Corporate environment design', color: '#dc2626' },
        { id: 'finance', name: 'Finance', description: 'Financial industry focused', color: '#059669' },
        { id: 'tech', name: 'Tech', description: 'Technology-oriented design', color: '#2563eb' },
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
            
            {/* Table Density */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Table Density</h4>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { id: 'compact', name: 'Compact', description: 'Tight spacing' },
                        { id: 'standard', name: 'Standard', description: 'Default spacing' },
                        { id: 'comfortable', name: 'Comfortable', description: 'Relaxed spacing' },
                        { id: 'spacious', name: 'Spacious', description: 'Maximum spacing' },
                    ].map((density) => (
                        <div
                            key={density.id}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                config.density === density.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                            onClick={() => onChange('density', density.id)}
                        >
                            <div className="font-medium text-sm text-gray-900">{density.name}</div>
                            <div className="text-xs text-gray-500">{density.description}</div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Table View */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Table View</h4>
                <select 
                    className="input" 
                    value={config.tableView} 
                    onChange={(e) => onChange('tableView', e.target.value)}
                >
                    <option value="default">Default</option>
                    <option value="card">Card View</option>
                    <option value="list">List View</option>
                </select>
            </div>
            
            {/* Modal Pop-up Settings */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Modal Pop-up Settings</h4>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Modal Width ({modalWidth}%)
                        </label>
                        <input 
                            type="range" 
                            min="40" 
                            max="80" 
                            value={modalWidth} 
                            onChange={(e) => onModalWidthChange(Number(e.target.value))} 
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>40%</span>
                            <span>60%</span>
                            <span>80%</span>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Overlay Transparency ({modalOverlayTransparency}%)
                        </label>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={modalOverlayTransparency} 
                            onChange={(e) => onModalOverlayTransparencyChange(Number(e.target.value))} 
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThemeSettingsSection;