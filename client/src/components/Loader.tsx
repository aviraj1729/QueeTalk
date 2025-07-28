import React from "react";
import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
}

const Loader: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  color = "blue",
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const colorClasses = {
    blue: "border-blue-500",
    white: "border-white",
    gray: "border-gray-500",
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={`${sizeClasses[size]} border-2 ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} border-t-transparent rounded-full`}
    />
  );
};

export default Loader;
