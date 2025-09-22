import { forwardRef } from 'react';

const AdminInput = forwardRef(({
    label,
    error,
    helperText,
    className = '',
    ...props
}, ref) => {
    return (
        <div className="space-y-1">
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                </label>
            )}

            <input
                ref={ref}
                className={`
          w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
          placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 
          focus:border-transparent transition-all duration-200
          ${error
                        ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    } 
          ${className}
        `}
                {...props}
            />

            {error && (
                <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}

            {helperText && !error && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {helperText}
                </p>
            )}
        </div>
    );
});

AdminInput.displayName = 'AdminInput';

export default AdminInput;
