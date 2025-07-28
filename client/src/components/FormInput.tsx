// components/FormInput.tsx
import { forwardRef, InputHTMLAttributes } from "react";
import type { FieldError } from "react-hook-form";
import { motion } from "framer-motion";
import { twMerge } from "tailwind-merge";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: FieldError;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    { label, error, icon, className, children, type = "text", ...props },
    ref,
  ) => {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={twMerge(
              "w-full py-3 pr-10 border rounded-lg transition-colors placeholder-gray-500 dark:placeholder-gray-400",
              "bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
              error
                ? "border-red-500 focus:ring-red-300"
                : "border-gray-300 dark:border-gray-600",
              icon && "pl-10",
              className,
            )}
            {...props}
          />
          {children && (
            <div className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              {children}
            </div>
          )}
        </div>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-red-500 text-xs mt-1 ml-1"
          >
            {error.message}
          </motion.div>
        )}
      </div>
    );
  },
);

FormInput.displayName = "FormInput";

export default FormInput;
