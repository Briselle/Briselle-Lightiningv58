import { useMemo } from 'react';
import { SortCriteria } from '../action-components/Action_Sort';
import { FilterCriteria } from '../action-components/Action_Filter';

export const useTableData = (
    data: any[],
    searchTerm: string,
    sortCriteria: SortCriteria[],
    filterCriteria: FilterCriteria[],
    fieldMappings: Record<string, string>,
    groupByColumn: string | null
) => {
    // Apply search
    const filteredBySearch = useMemo(() => {
        if (!searchTerm) return data;
        
        const searchLower = searchTerm.toLowerCase();
        return data.filter((row) => {
            return Object.keys(fieldMappings).some((key) =>
                (row[key]?.toString().toLowerCase() ?? '').includes(searchLower)
            );
        });
    }, [data, searchTerm, fieldMappings]);

    // Apply filters
    const filteredEntities = useMemo(() => {
        if (filterCriteria.length === 0) return filteredBySearch;

        return filteredBySearch.filter((row) => {
            return filterCriteria.every((filter, index) => {
                const value = row[filter.column]?.toString().toLowerCase() ?? '';
                const filterValue = filter.value.toLowerCase();

                let matches = false;
                switch (filter.operator) {
                    case 'equals':
                        matches = value === filterValue;
                        break;
                    case 'contains':
                        matches = value.includes(filterValue);
                        break;
                    case 'startsWith':
                        matches = value.startsWith(filterValue);
                        break;
                    case 'endsWith':
                        matches = value.endsWith(filterValue);
                        break;
                    case 'notEquals':
                        matches = value !== filterValue;
                        break;
                    case 'greaterThan':
                        matches = parseFloat(value) > parseFloat(filterValue);
                        break;
                    case 'lessThan':
                        matches = parseFloat(value) < parseFloat(filterValue);
                        break;
                    default:
                        matches = value.includes(filterValue);
                }

                if (index === 0) return matches;

                const prevResult = true; // This would need more complex logic for proper AND/OR handling
                return filter.logic === 'AND' ? prevResult && matches : prevResult || matches;
            });
        });
    }, [filteredBySearch, filterCriteria]);

    // Apply sorting
    const sortedData = useMemo(() => {
        return [...filteredEntities].sort((a, b) => {
            for (const sort of sortCriteria) {
                const aVal = a[sort.column];
                const bVal = b[sort.column];

                let comparison = 0;
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    comparison = aVal - bVal;
                } else {
                    comparison = String(aVal).localeCompare(String(bVal));
                }

                if (comparison !== 0) {
                    return sort.order === 'asc' ? comparison : -comparison;
                }
            }
            return 0;
        });
    }, [filteredEntities, sortCriteria]);

    // Apply grouping
    const groupedData = useMemo(() => {
        if (!groupByColumn) return null;

        return sortedData.reduce((groups, row) => {
            const key = row[groupByColumn]?.toString() || 'Ungrouped';
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(row);
            return groups;
        }, {} as Record<string, any[]>);
    }, [sortedData, groupByColumn]);

    return {
        filteredBySearch,
        filteredEntities,
        sortedData,
        groupedData,
    };
};
