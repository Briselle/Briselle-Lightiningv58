import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Settings, ExternalLink, AlertTriangle, Trash2, Edit } from 'lucide-react';
import { supabase } from '../../utils/supabase'; // Ensure alias or adjust path

interface dobj {
    [key: string]: any;
}

const fieldMappings: { [key: string]: string } = {
    //dobj_id: "dobj Id",
    dobj_name_display: "Name",
    dobj_name_system: "API Name",
    //dobj_configuration: "dobj Configuration",
    dobj_description: "Description",
    dobj_status: "Status",
    // dobj_created_at: "Created",
    dobj_updated_at: "Last Modified",
    isCustom: "Is Custom",
};

function ObjectsList() {
    const [Objects, setObjects] = useState<dobj[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchObjects() {
            setLoading(true);
            const { data, error } = await supabase.from('dobj').select('*');

            if (error || !data) {
                setError('Failed to fetch data from Supabase');
                setLoading(false);
                return;
            }

            const filtered = data.map((item: any) => {
                const dobj: Partial<dobj> = {};
                for (const key of Object.keys(fieldMappings)) {
                    dobj[key as keyof dobj] = item[key];
                }
                return dobj as dobj;
            });

            setObjects(filtered);
            setLoading(false);
        }

        fetchObjects();
    }, []);

    const filteredObjects = Objects.filter((dobj) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (dobj.dobj_name?.toLowerCase() ?? '').includes(searchLower) ||
            (dobj.dobj_api_name?.toLowerCase() ?? '').includes(searchLower) ||
            (dobj.dobj_description?.toLowerCase() ?? '').includes(searchLower)
        );
    });

    return (
        <div className="fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="page-title mb-0">Objects</h1>
                <button className="btn btn-primary">
                    <Plus size={16} className="mr-2" /> New dobj
                </button>
            </div>

            <div className="card mb-6">
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search Objects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 input"
                        />
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading...</div>
                ) : error ? (
                    <div className="p-6 text-center text-red-500">{error}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {Object.entries(fieldMappings)
                                        .filter(([key]) => key !== 'isCustom')
                                        .map(([key, label]) => (
                                            <th key={key}>{label}</th>
                                        ))}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredObjects.map((dobj, idx) => (
                                    <tr key={idx}>
                                        {Object.keys(fieldMappings)
                                            .filter((key) => key !== 'isCustom')
                                            .map((key, colIndex) => (
                                                <td
                                                    key={key}
                                                    className={`text-sm text-start ${colIndex === 0
                                                        ? 'font-semibold text-gray-800'
                                                        : 'text-gray-600'
                                                        }`}
                                                >
                                                    {colIndex === 0 ? (
                                                        <div className="flex items-center">
                                                            {dobj[key]?.toString() || '-'}
                                                            {(dobj.isCustom === true || dobj.isCustom === 1) && (
                                                                <span className="ml-2 px-2 py-0.5 text-xs bg-accent text-white rounded-full">
                                                                    Custom
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        dobj[key]?.toString() || '-'
                                                    )}
                                                </td>
                                            ))}
                                        <td>
                                            <div className="flex space-x-2">
                                                <Link
                                                    to={`/dobj/${dobj.dobj_id}/config`}
                                                    className="p-1 text-gray-500 hover:text-primary"
                                                    title="Configure"
                                                >
                                                    <Settings size={16} />
                                                </Link>
                                                <Link
                                                    to={`/dobj/${dobj.dobj_id}`}
                                                    className="p-1 text-gray-500 hover:text-primary"
                                                    title="View Record"
                                                >
                                                    <ExternalLink size={16} />
                                                </Link>
                                                <Link
                                                    to={`/dobj/${dobj.dobj_id}/config`}
                                                    className="p-1 text-gray-500 hover:text-primary transition-colors"
                                                    title="Edit Record"
                                                >
                                                    <Edit size={16} />
                                                </Link>

                                                <Link
                                                    to={`/dobj/${dobj.dobj_id}/config`}
                                                    className="p-1 text-gray-500 hover:text-primary transition-colors"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 size={16} />
                                                </Link>

                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredObjects.length === 0 && (
                            <div className="py-8 text-center">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                                    <AlertTriangle size={24} className="text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">
                                    No Objects found
                                </h3>
                                <p className="text-gray-500">
                                    Try adjusting your search or create a new dobj.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

}


export default ObjectsList;
