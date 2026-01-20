import React from 'react';
import { BarChart3 } from 'lucide-react';

interface Action_ChartProps {
    enableChart: boolean;
    chartButtonType: 'icon' | 'button';
    chartButtonAlign: 'left' | 'right';
    onChartClick: () => void;
}

const Action_Chart: React.FC<Action_ChartProps> = ({
    enableChart,
    chartButtonType,
    chartButtonAlign,
    onChartClick,
}) => {
    if (!enableChart) return null;

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
            onClick={onChartClick}
            className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
        >
            {getButtonContent(<BarChart3 size={16} />, 'Chart', chartButtonType || 'icon')}
        </button>
    );
};

export default Action_Chart;
