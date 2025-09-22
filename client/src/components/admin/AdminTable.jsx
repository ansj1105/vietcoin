import { forwardRef } from 'react';

const AdminTable = forwardRef(({
    children,
    className = '',
    ...props
}, ref) => {
    return (
        <div className={`overflow-x-auto ${className}`}>
            <table
                ref={ref}
                className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
                {...props}
            >
                {children}
            </table>
        </div>
    );
});

AdminTable.displayName = 'AdminTable';

const AdminTableHeader = forwardRef(({ children, className = '', ...props }, ref) => {
    return (
        <thead ref={ref} className="bg-gray-50 dark:bg-gray-700" {...props}>
            {children}
        </thead>
    );
});

AdminTableHeader.displayName = 'AdminTableHeader';

const AdminTableBody = forwardRef(({ children, className = '', ...props }, ref) => {
    return (
        <tbody ref={ref} className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700" {...props}>
            {children}
        </tbody>
    );
});

AdminTableBody.displayName = 'AdminTableBody';

const AdminTableRow = forwardRef(({ children, className = '', hover = true, ...props }, ref) => {
    const hoverClass = hover ? 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors' : '';
    return (
        <tr ref={ref} className={`${hoverClass} ${className}`} {...props}>
            {children}
        </tr>
    );
});

AdminTableRow.displayName = 'AdminTableRow';

const AdminTableHead = forwardRef(({ children, className = '', ...props }, ref) => {
    return (
        <th
            ref={ref}
            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${className}`}
            {...props}
        >
            {children}
        </th>
    );
});

AdminTableHead.displayName = 'AdminTableHead';

const AdminTableCell = forwardRef(({ children, className = '', ...props }, ref) => {
    return (
        <td ref={ref} className={`px-6 py-4 whitespace-nowrap text-sm ${className}`} {...props}>
            {children}
        </td>
    );
});

AdminTableCell.displayName = 'AdminTableCell';

export {
    AdminTable,
    AdminTableHeader,
    AdminTableBody,
    AdminTableRow,
    AdminTableHead,
    AdminTableCell
};
