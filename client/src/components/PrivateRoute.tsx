// Import required modules and types from React and react-router-dom libraries
import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

const PrivateRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();

  if (!token || !user?._id) return <Navigate to="/login" replace />;
  return children;
};

export default PrivateRoute;
