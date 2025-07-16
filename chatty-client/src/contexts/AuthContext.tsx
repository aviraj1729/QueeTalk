import React, { createContext, useContext, useEffect, useState } from "react";
import type { UserInterface } from "../interfaces/User";
import { LocalStorage, requestHandler } from "../utils";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import {
  loginUser,
  logoutUser,
  registerUser,
  changeUserPassword,
  forgotUserPassword,
  sendOTP as sendOTPApi,
  verifyOTP as verifyOTPApi,
  currentUser,
} from "../api";

const AuthContext = createContext<{
  user: UserInterface | null;
  token: string | null;
  login: (data: {
    username: string;
    password: string;
    email: string;
  }) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    full_name: string;
    contact: string;
    date_of_birth: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (data: {
    email: string;
    old_password: string;
    new_password: string;
  }) => Promise<void>;
  forgotPassword: (data: { email: string; password: string }) => Promise<void>;
  sendOTP: (data: {
    type: "email" | "phone";
    value: string;
  }) => Promise<string | null>;
  verifyOTP: (data: { otpId: string; otp: string }) => Promise<boolean>;
}>({
  user: null,
  token: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  changePassword: async () => {},
  sendOTP: async () => null,
  verifyOTP: async () => false,
  forgotPassword: async () => {},
});

const useAuth = () => useContext(AuthContext);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<UserInterface | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const navigate = useNavigate();

  //function to handle login
  const login = async (data: {
    email?: string;
    username?: string;
    password: string;
  }) => {
    const payload: any = {
      password: data.password,
    };
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(data.username)) {
      payload.email = data.username;
    } else payload.username = data.username;

    await requestHandler(
      () => loginUser(payload),
      setIsLoading,
      (res) => {
        const { data } = res;
        setUser(data.user);
        setToken(data.accessToken);
        LocalStorage.set("user", data.user);
        LocalStorage.set("token", data.accessToken);
        navigate("/chat");
      },
      alert,
    );
  };

  const forgotPassword = async (data: { email: string; password: string }) => {
    await requestHandler(
      async () => await forgotUserPassword(data),
      setIsLoading,
      () => {
        alert("Password reset successfully");
        navigate("/login");
      },
      alert,
    );
  };

  //function ti handle user register
  const register = async (data: {
    email: string;
    username: string;
    password: string;
    full_name: string;
    contact: string;
    date_of_birth: string;
  }) => {
    const { full_name } = data;
    await requestHandler(
      async () => await registerUser(data),
      setIsLoading,
      () => {
        alert(
          `Welcome ${full_name.split(" ")[0]}, your account is  created successfully.`,
        );
        navigate("/login");
      },
      alert,
    );
  };

  // Function to handle user logout
  const logout = async () => {
    await requestHandler(
      async () => await logoutUser(),
      setIsLoading,
      () => {
        setUser(null);
        setToken(null);
        LocalStorage.clear(); // Clear local storage on logout
        navigate("/login"); // Redirect to the login page after successful logout
      },
      alert, // Display error alerts on request failure
    );
  };
  const changePassword = async (data: {
    email: string;
    old_password: string;
    new_password: string;
  }) => {
    await requestHandler(
      () => changeUserPassword(data),
      setIsLoading,
      () => {
        alert("Password changed successfully.");
      },
      alert,
    );
  };

  const sendOTP = async (data: { type: "email" | "phone"; value: string }) => {
    let otpId: string | null = null;
    await requestHandler(
      () => sendOTPApi(data),
      setIsLoading,
      (res) => {
        otpId = res.data.otpId;
        alert(`OTP sent to your ${data.type}`);
      },
      alert,
    );
    return otpId;
  };

  const verifyOTP = async (data: { otpId: string; otp: string }) => {
    let isVerified = false;
    await requestHandler(
      () => verifyOTPApi(data),
      setIsLoading,
      (res) => {
        if (res.data.verified && res.data.user && res.data.accessToken) {
          setUser(res.data.user);
          setToken(res.data.accessToken);
          LocalStorage.set("user", res.data.user);
          LocalStorage.set("token", res.data.accessToken);
          isVerified = true;
        } else {
          alert("OTP verified, but no login credentials returned.");
        }
      },
      alert,
    );
    return isVerified;
  };

  // Check for saved user and token in local storage during component initialization
  useEffect(() => {
    setIsLoading(true);
    const _token = LocalStorage.get("token");
    const _user = LocalStorage.get("user");
    if (_token && _user?._id) {
      setUser(_user);
      setToken(_token);
    }
    setIsLoading(false);
  }, []);

  // Provide authentication-related data and functions through the context
  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        token,
        changePassword,
        forgotPassword,
        sendOTP,
        verifyOTP,
      }}
    >
      {isLoading ? <Loader /> : children} {/* Display a loader while loading */}
    </AuthContext.Provider>
  );
};

// Export the context, provider component, and custom hook
export { AuthContext, AuthProvider, useAuth };
