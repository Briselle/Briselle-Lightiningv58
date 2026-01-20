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
        if (sortCriteria.length === 0) return filteredEntities;
        
        const sorted = [...filteredEntities].sort((a, b) => {
            for (const sort of sortCriteria) {
                const columnKey = sort.column;
                const aVal = a[columnKey];
                const bVal = b[columnKey];

                // Handle null/undefined/empty values - place them at the end
                if (aVal == null && bVal == null) {
                    continue; // Both null, check next sort criteria
                }
                if (aVal == null || aVal === undefined || aVal === '') {
                    return sort.order === 'asc' ? 1 : -1; // Null goes to end
                }
                if (bVal == null || bVal === undefined || bVal === '') {
                    return sort.order === 'asc' ? -1 : 1; // Null goes to end
                }

                let comparison = 0;
                
                // Try to parse as number if both values look like numbers
                const aStr = String(aVal).trim();
                const bStr = String(bVal).trim();
                const aNum = !isNaN(Number(aStr)) && aStr !== '' ? Number(aStr) : NaN;
                const bNum = !isNaN(Number(bStr)) && bStr !== '' ? Number(bStr) : NaN;
                
                // If both are valid numbers, compare numerically
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    comparison = aNum - bNum;
                } else if (typeof aVal === 'number' && typeof bVal === 'number') {
                    comparison = aVal - bVal;
                } else {
                    // String comparison with proper locale-aware numeric sorting
                    comparison = aStr.localeCompare(bStr, undefined, { 
                        numeric: true, 
                        sensitivity: 'base',
                        ignorePunctuation: true
                    });
                }

                if (comparison !== 0) {
                    return sort.order === 'asc' ? comparison : -comparison;
                }
            }
            return 0;
        });
        
        return sorted;
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
