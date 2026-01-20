import React, { useState, useRef, useEffect } from 'react';
import { Bookmark, Star, ChevronDown } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

export interface TablePreset {
    id: string;
    name: string;
    config: any;
    isDefault?: boolean;
    presetId: string;
}

interface Action_PresetProps {
    enablePresetSelector: boolean;
    presetButtonType: 'icon' | 'button';
    presetButtonAlign: 'left' | 'right';
    presets: TablePreset[];
    onPresetClick: () => void;
    onPresetApply: (preset: TablePreset) => void;
}

const Action_Preset: React.FC<Action_PresetProps> = ({
    enablePresetSelector,
    presetButtonType,
    presetButtonAlign,
    presets,
    onPresetClick,
    onPresetApply,
}) => {
    const [showPresetDropdown, setShowPresetDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowPresetDropdown(false);
            }
        };

        if (showPresetDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPresetDropdown]);

    // Close dropdown when another button is clicked
    useEffect(() => {
        const handleButtonClick = () => {
            setShowPresetDropdown(false);
        };
        document.addEventListener('actionButtonClick', handleButtonClick);
        return () => {
            document.removeEventListener('actionButtonClick', handleButtonClick);
        };
    }, []);

    if (!enablePresetSelector) return null;

    const getButtonContent = (icon: React.ReactNode, text: string, buttonType: 'icon' | 'button') => {
        if (buttonType === 'button') {
            return (
                <span className="flex items-center">
                    {icon}
                    <span className="ml-2">{text}</span>
                </span>
            );
        }
        return icon;
    };

    const handlePresetClick = () => {
        // Dispatch event to close other dropdowns
        document.dispatchEvent(new CustomEvent('actionButtonClick'));
        setShowPresetDropdown(!showPresetDropdown);
        onPresetClick();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handlePresetClick();
                }}
                className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 h-10"
            >
                {getButtonContent(<Bookmark size={16} />, 'Presets', presetButtonType || 'icon')}
                <ChevronDown size={14} className="ml-1" />
            </button>

            {showPresetDropdown && (
                <div
                    className={cn(
                        "absolute top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50",
                        presetButtonAlign === 'left' ? 'left-0' : 'right-0'
                    )}
                >
                    <div className="py-1">
                        {presets.map((preset) => (
                            <button
                                key={preset.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPresetApply(preset);
                                    setShowPresetDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                            >
                                {preset.name}
                                {preset.isDefault && <Star size={12} className="ml-2 text-yellow-500" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Action_Preset;
