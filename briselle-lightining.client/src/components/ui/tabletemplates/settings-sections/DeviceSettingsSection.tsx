import React, { useState } from 'react';
import { Monitor, Smartphone, Tablet, Clock } from 'lucide-react';

const DeviceSettingsSection: React.FC = () => {
    const [selectedDevice, setSelectedDevice] = useState('laptop');

    const devices = [
        {
            id: 'laptop',
            name: 'Laptop',
            icon: Monitor,
            description: 'Desktop and laptop computers',
            enabled: true,
            status: 'Active'
        },
        {
            id: 'tablet',
            name: 'Tablet',
            icon: Tablet,
            description: 'iPad and Android tablets',
            enabled: false,
            status: 'Coming Soon'
        },
        {
            id: 'mobile',
            name: 'Mobile',
            icon: Smartphone,
            description: 'Mobile phones and small screens',
            enabled: false,
            status: 'Coming Soon'
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Device Configuration</h3>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Select Device Type</h4>
                <p className="text-sm text-gray-600 mb-4">
                    Configure table settings for different device types. Currently, only laptop configuration is available.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {devices.map((device) => {
                        const IconComponent = device.icon;
                        return (
                            <div
                                key={device.id}
                                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                    selectedDevice === device.id && device.enabled
                                        ? 'border-blue-500 bg-blue-50'
                                        : device.enabled
                                        ? 'border-gray-200 bg-white hover:border-gray-300'
                                        : 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                                }`}
                                onClick={() => device.enabled && setSelectedDevice(device.id)}
                            >
                                <div className="text-center">
                                    <div className="flex justify-center mb-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                            device.enabled 
                                                ? selectedDevice === device.id 
                                                    ? 'bg-blue-100' 
                                                    : 'bg-gray-100'
                                                : 'bg-gray-200'
                                        }`}>
                                            <IconComponent 
                                                size={24} 
                                                className={
                                                    device.enabled 
                                                        ? selectedDevice === device.id 
                                                            ? 'text-blue-600' 
                                                            : 'text-gray-600'
                                                        : 'text-gray-400'
                                                } 
                                            />
                                        </div>
                                    </div>
                                    <h5 className="font-semibold text-gray-900 mb-1">{device.name}</h5>
                                    <p className="text-xs text-gray-500 mb-2">{device.description}</p>
                                    
                                    {device.enabled ? (
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            selectedDevice === device.id
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-green-100 text-green-800'
                                        }`}>
                                            {selectedDevice === device.id ? 'Selected' : device.status}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            <Clock size={12} className="mr-1" />
                                            {device.status}
                                        </span>
                                    )}
                                </div>
                                
                                {selectedDevice === device.id && device.enabled && (
                                    <div className="absolute top-2 right-2">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Current Device Info */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-md font-semibold text-blue-800 mb-2">Current Configuration</h4>
                <div className="text-sm text-blue-700">
                    <p className="mb-2">
                        <strong>Active Device:</strong> {devices.find(d => d.id === selectedDevice)?.name}
                    </p>
                    <p className="mb-2">
                        All table settings and configurations are currently applied to the laptop view.
                    </p>
                    <p>
                        Tablet and mobile configurations will be available in future updates, allowing you to customize the table experience for different screen sizes.
                    </p>
                </div>
            </div>

            {/* Future Features */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Planned Features</h4>
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span>Responsive table layouts for tablets</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span>Mobile-optimized card view</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span>Touch-friendly interactions</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span>Device-specific column visibility</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeviceSettingsSection;