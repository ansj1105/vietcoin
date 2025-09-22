import { forwardRef } from 'react';

const AdminBadge = forwardRef(({
    children,
    variant = 'default',
    size = 'md',
    className = '',
    ...props
}, ref) => {
    const baseClasses = 'inline-flex items-center font-medium rounded-full';

    const variants = {
        default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
        success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
        danger: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm',
        lg: 'px-3 py-1 text-sm'
    };

    const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
        <span ref={ref} className={classes} {...props}>
            {children}
        </span>
    );
});

AdminBadge.displayName = 'AdminBadge';

export default AdminBadge;
