import ConfigurableListTemplate, { TableConfig } from "../../components/ui/tabletemplates/ConfigurableListTemplate";
import { supabase } from '../../utils/supabase';
import { useEffect, useState } from "react";

const fieldMappings = {
    dobj_name_display: "Name",
    dobj_name_system: "API Name",
    dobj_description: "Description",
    dobj_status: "Status",
    dobj_updated_at: "Last Modified",
};

const defaultConfig: TableConfig = {
    // Core Features
    enableSort: true,
    enableHeader: true,
    enableRowNumber: false,
    enableRowSelection: true,
    enableMassSelection: true,
    enableRowHoverHighlight: true,
    enableStripedRows: false,
    enableRowDivider: true,
    enableColumnDivider: false,
    enableColumnResize: true,

    // Advanced Features
    enableSearch: true,
    enableFilter: true,
    enableExport: true,
    enableImport: false,
    enableRefresh: true,
    enablePagination: true,
    enableColumnVisibility: true,
    enableColumnReorder: false,
    enableInlineEdit: ['dobj_name_display', 'dobj_description'],
    enableRowActions: true,
    enableBulkActions: true,
    //enableQuickActions: true,

    // Display Options
    //enableCompactMode: false,
    enableWrapText: false,
    enableTooltips: true,
    //enableRowExpansion: false,
    //enableGrouping: false,
    enableStickyHeader: true,
    //enableStickyColumns: [],

    // Pagination Settings
    pageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],

    // Theme and Styling
    theme: 'default',
    //density: 'standard',

    // Action Settings
    rowActionsPosition: 'right',
    showRowActionsOnHover: false,
};

export default function TempList() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<TableConfig>(defaultConfig);

    useEffect(() => {
        const fetchEntities = async () => {
            const { data, error } = await supabase.from("dobj").select("*");
            if (error) {
                console.error("Supabase fetch error:", error);
            } else {
                setData(data || []);
            }
            setLoading(false);
        };

        fetchEntities();
    }, []);

    // Load saved config from localStorage
    useEffect(() => {
        const savedConfig = localStorage.getItem('tableConfig');
        if (savedConfig) {
            try {
                const parsedConfig = JSON.parse(savedConfig);
                setConfig({ ...defaultConfig, ...parsedConfig });
            } catch (error) {
                console.error('Error loading saved config:', error);
            }
        }
    }, []);

    // Save config to localStorage when it changes
    const handleConfigChange = (newConfig: TableConfig) => {
        setConfig(newConfig);
        localStorage.setItem('tableConfig', JSON.stringify(newConfig));
    };

    return (
        <ConfigurableListTemplate
            title="Objects"
            data={data}
            fieldMappings={fieldMappings}
            config={config}
            loading={loading}
            onConfigChange={handleConfigChange}
            baseUrl="/objects"
        />
    );
}