import { forwardRef, useState, useEffect } from "react";
import type { InputHTMLAttributes } from "react";
import type { FieldError } from "react-hook-form";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

// Types
interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: FieldError;
  leftIcon?: React.ReactNode;
  showToggle?: boolean; // default: true
  showStrength?: boolean; // default: false
}

const getPasswordScore = (password: string): number => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
const strengthColors = ["red", "yellow", "blue", "green"];

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      error,
      leftIcon,
      showToggle = true,
      showStrength = false,
      className,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [password, setPassword] = useState("");
    const [score, setScore] = useState(0);

    useEffect(() => {
      if (showStrength && typeof props.value === "string") {
        setPassword(props.value);
        setScore(getPasswordScore(props.value));
      }
    }, [props.value, showStrength]);

    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </label>
        )}

        <div className="relative">
          {/* Icon */}
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            {leftIcon || <Lock className="w-5 h-5 text-gray-400" />}
          </div>

          {/* Input */}
          <input
            ref={ref}
            type={showPassword ? "text" : "password"}
            className={clsx(
              "w-full pl-10 pr-12 py-3 border rounded-lg transition-colors",
              "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
              "placeholder-gray-500 dark:placeholder-gray-400",
              error
                ? "border-red-500 focus:ring-red-300"
                : "border-gray-300 dark:border-gray-600",
              className,
            )}
            onChange={(e) => {
              setPassword(e.target.value);
              setScore(getPasswordScore(e.target.value));
              props.onChange?.(e);
            }}
            {...props}
          />

          {/* Eye toggle */}
          {showToggle && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Strength meter */}
        {showStrength && password && (
          <div className="mt-2 ml-1">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
              <span>Password Strength</span>
              <span className={`text-${strengthColors[score - 1]}-500`}>
                {strengthLabels[score - 1] || "Very Weak"}
              </span>
            </div>
            <div className="w-full h-2 mt-1 bg-gray-200 rounded">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(score / 4) * 100}%` }}
                className={`h-full rounded bg-${strengthColors[score - 1]}-500 transition-all`}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {error?.message && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
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

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
