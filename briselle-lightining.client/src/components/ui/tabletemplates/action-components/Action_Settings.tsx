import React from 'react';
import { Settings } from 'lucide-react';

interface Action_SettingsProps {
    settingsButtonType: 'icon' | 'button';
    settingsButtonAlign: 'left' | 'right';
    onSettingsClick: () => void;
}

const Action_Settings: React.FC<Action_SettingsProps> = ({
    settingsButtonType,
    settingsButtonAlign,
    onSettingsClick,
}) => {
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

    return (
        <button
            type="button"
            onClick={onSettingsClick}
            className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
        >
            {getButtonContent(
                <Settings size={16} />,
                'Settings',
                settingsButtonType || 'icon'
            )}
        </button>
    );
};

export default Action_Settings;
