import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "icon";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  isActive?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  onClick,
  type = "button",
  isActive = false,
}) => {
  const baseClasses = "font-medium transition-all duration-200 ease-in-out";

  const sizeClasses = {
    sm: "py-1.5 px-3 text-sm",
    md: "py-2 px-5 text-base",
    lg: "py-3 px-8 text-lg",
  };

  let variantClass = "";
  if (variant === "icon") {
    variantClass = `relative w-10 h-10 flex items-center justify-center rounded-full dark:hover:bg-gray-800 hover:bg-gray-200 ${
      isActive
        ? "dark:text-white dark:bg-gray-800 bg-gray-200 outline-none"
        : "text-black dark:text-gray-400 dark:hover:text-white"
    }`;
  } else if (variant === "primary") {
    variantClass =
      "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg";
  } else if (variant === "secondary") {
    variantClass =
      "bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg";
  } else if (variant === "outline") {
    variantClass = isActive
      ? "bg-green-200 dark:bg-gray-800 border dark:border-gray-800"
      : "bg-transparent dark:hover:text-white border dark:border-gray-800 border-gray-400 dark:text-white dark:hover:bg-gray-800 hover:bg-gray-200";
  }

  const computedClasses =
    variant === "icon" ? variantClass : `${variantClass} ${sizeClasses[size]}`;

  // Add default rounded-md only if no custom border-radius is provided
  const defaultRounded = className.includes("rounded-") ? "" : "rounded-md";

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseClasses} ${computedClasses} ${defaultRounded} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
