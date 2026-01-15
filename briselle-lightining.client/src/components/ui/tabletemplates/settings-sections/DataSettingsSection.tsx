import React from 'react';
import { Database, Link as LinkIcon } from 'lucide-react';

interface DataSettingsSectionProps {
    config: any;
    onChange: (key: string, value: any) => void;
}

const DataSettingsSection: React.FC<DataSettingsSectionProps> = ({
    config,
    onChange,
}) => {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Data Settings</h3>
            </div>

            {/* Relationships Section */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 text-center">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <Database size={32} className="text-blue-600" />
                    </div>
                </div>
                <h4 className="text-lg font-semibold text-blue-800 mb-2">Relationships</h4>
                <p className="text-blue-700 mb-4">
                    In the future, we will show the relationships with other datasets like a table.
                </p>
                <div className="flex justify-center space-x-2">
                    <LinkIcon size={16} className="text-blue-600" />
                    <span className="text-sm text-blue-600 font-medium">Coming Soon</span>
                </div>
            </div>

            {/* Future Features Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Planned Features</h4>
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span>Table relationships and foreign key management</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span>Data validation rules and constraints</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span>Advanced data import/export options</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span>Real-time data synchronization</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataSettingsSection;