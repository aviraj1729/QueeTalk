// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import { useAuth } from "./contexts/AuthContext";
import Register from "./pages/Register";
import PrivateRoute from "./components/PrivateRoute";
import PublicRoute from "./components/PublicRoute";
import Layout from "./components/Layout";

const App = () => {
  const { token, user } = useAuth();
  return (
    <Routes>
      <Route
        path="/"
        element={
          token && user._id ? <Navigate to="/chat" /> : <Navigate to="/login" />
        }
      ></Route>
      <Route
        path="/chat"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      />

      {/* Public login route: Accessible by everyone */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Public register route: Accessible by everyone */}
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Wildcard route for undefined paths. Shows a 404 error */}
      <Route path="*" element={<p>404 Not found</p>} />
    </Routes>
  );
};

export default App;




// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "var(--toast-bg)",
                color: "var(--toast-color)",
                border: "1px solid var(--toast-border)",
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);




// src/vite-env.d.ts
/// <reference types="vite/client" />




// src/utils/index.ts
import type { AxiosResponse } from "axios";
import type { UserInterface } from "../interfaces/User";
import type { APIInterface } from "../interfaces/APIInterface";

//function to handle API requests with loading, success and error handelling
export const requestHandler = async (
  api: () => Promise<AxiosResponse<APIInterface, any>>,
  setLoading: ((loading: boolean) => void) | null,
  onSuccess: (data: APIInterface) => void,
  onError: (error: string) => void,
) => {
  setLoading && setLoading(true);
  try {
    const response = await api();
    const { data } = response;
    if (data?.success || data?.data) {
      onSuccess(data);
    } else {
      onError("Unexpected API format");
    }
  } catch (error: any) {
    if ([401, 403].includes(error?.response?.data?.statusCode)) {
      localStorage.clear();
      if (isBrowser) window.location.href = "/login";
    }
    onError(error?.response?.data?.message || "Something went wrong");
  } finally {
    setLoading && setLoading(false);
  }
};

//check if the code is running in the browser.
export const isBrowser = typeof window !== "undefined";

// A class that provides utility functions for working with local storage
export class LocalStorage {
  // Get a value from local storage by key
  static get(key: string) {
    if (!isBrowser) return;
    const value = localStorage.getItem(key);
    if (value) {
      try {
        return JSON.parse(value);
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  // Set a value in local storage by key
  static set(key: string, value: any) {
    if (!isBrowser) return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Remove a value from local storage by key
  static remove(key: string) {
    if (!isBrowser) return;
    localStorage.removeItem(key);
  }

  // Clear all items from local storage
  static clear() {
    if (!isBrowser) return;
    localStorage.clear();
  }
}




// src/pages/Login.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Mail, Lock, Smartphone } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import PasswordInput from "../components/PasswordInput";
import OTPVerification from "../components/OTPVerification";

type LoginFormData = {
  email: string;
  password: string;
};

const Login: React.FC = () => {
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">(
    "password",
  );
  const [otpSent, setOtpSent] = useState(false);
  const [emailForOtp, setEmailForOtp] = useState("");
  const [otpId, setOtpId] = useState<string | null>(null);
  const navigate = useNavigate();

  const { login, sendOTP, verifyOTP } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError: setFormError,
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login({ username: data.email, password: data.password });
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const handleSendOTP = async () => {
    try {
      const email = watch("email");
      if (!email) {
        setFormError("email", { type: "manual", message: "Email is required" });
        return;
      }

      const id = await sendOTP({ type: "email", value: email });
      if (id) {
        setEmailForOtp(email);
        setOtpId(id);
        setOtpSent(true);
      }
    } catch (err) {
      console.error("OTP send error:", err);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    try {
      if (!otpId) return false;

      const isValid = await verifyOTP({ otpId, otp });
      if (isValid) {
        // If backend doesn't auto-login, you can call a separate OTP-login endpoint here
        navigate("/");
        return true;
      }
      return false;
    } catch (err) {
      console.error("OTP verification error:", err);
      return false;
    }
  };

  const toggleLoginMethod = () => {
    setLoginMethod((prev) => (prev === "password" ? "otp" : "password"));
    setOtpSent(false);
    setOtpId(null);
    setEmailForOtp("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4"
            >
              <Mail className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to continue your conversations on chatty
            </p>
          </div>

          {loginMethod === "password" ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <FormInput
                label="Email or Username"
                type="text"
                icon={<Mail className="w-5 h-5" />}
                error={errors.email}
                {...register("email", {
                  required: "Email or username is required",
                  validate: (value) => {
                    const isEmail =
                      /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value);
                    const isUsername = /^[a-zA-Z0-9_]{3,}$/.test(value);
                    return (
                      isEmail ||
                      isUsername ||
                      "Must be a valid email or username (min 3 chars)"
                    );
                  },
                })}
              />

              <PasswordInput
                label="Password"
                error={errors.password}
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
              />

              <Button type="submit" variant="primary" className="w-full">
                Sign In
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-blue-600 dark:text-blue-400"
                onClick={toggleLoginMethod}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Sign in with OTP instead
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              {!otpSent ? (
                <>
                  <FormInput
                    label="Email"
                    type="email"
                    icon={<Mail className="w-5 h-5" />}
                    error={errors.email}
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                  />

                  <Button
                    type="button"
                    variant="primary"
                    className="w-full"
                    onClick={handleSendOTP}
                  >
                    Send OTP
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-blue-600 dark:text-blue-400"
                    onClick={toggleLoginMethod}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Sign in with password instead
                  </Button>
                </>
              ) : (
                <OTPVerification
                  onVerify={handleVerifyOTP}
                  onResend={handleSendOTP}
                  onCancel={() => setOtpSent(false)}
                  contactInfo={emailForOtp}
                  isVerifying={false}
                  type="email"
                />
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-blue-500 hover:text-blue-600 font-semibold transition-colors"
              >
                Sign up
              </Link>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              <Link
                to="/forgot-password"
                className="text-blue-500 hover:text-blue-600 font-semibold transition-colors"
              >
                Forgot password?
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;




// src/pages/Register.tsx
import React, { useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import FormInput from "../components/FormInput";
import PasswordInput from "../components/PasswordInput";
import OTPVerification from "../components/OTPVerification";
import Button from "../components/Button";
import {
  MessageCircle,
  User,
  Mail,
  Calendar,
  Phone,
  ArrowLeft,
  Shield,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Loader from "../components/Loader";
import { useForm } from "react-hook-form";

// Constants
const STEP_TITLES = {
  1: "Start by creating your account",
  2: "When's your birthday?",
  3: "Verify your email address",
  4: "Verify your phone number",
};

const MIN_AGE = 10;

const VALIDATION_RULES = {
  fullname: {
    required: "Full name is required",
    minLength: {
      value: 3,
      message: "Name must be at least 3 characters",
    },
  },
  username: {
    required: "Username is required",
    minLength: {
      value: 3,
      message: "Username must be at least 3 characters",
    },
    pattern: {
      value: /^[a-zA-Z0-9_]+$/,
      message: "Username can only contain letters, numbers and underscores",
    },
  },
  email: {
    required: "Email is required",
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: "Invalid email address",
    },
  },
  password: {
    required: "Password is required",
    minLength: { value: 8, message: "Minimum 8 characters" },
    validate: {
      hasUpper: (val: string) =>
        /[A-Z]/.test(val) || "Must include uppercase letter",
      hasDigit: (val: string) => /\d/.test(val) || "Must include number",
      hasSymbol: (val: string) =>
        /[^A-Za-z0-9]/.test(val) || "Must include special character",
    },
  },
  birthday: {
    required: "Birthday is required",
    validate: (val: string) => {
      if (!val) return true;
      const today = new Date();
      const dob = new Date(val);
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const dayDiff = today.getDate() - dob.getDate();

      return (
        age > MIN_AGE ||
        (age === MIN_AGE && monthDiff > 0) ||
        (age === MIN_AGE && monthDiff === 0 && dayDiff >= 0) ||
        `You must be at least ${MIN_AGE} years old to register`
      );
    },
  },
  phone: {
    required: "Phone number is required",
    pattern: {
      value: /^[\+]?[1-9][\d]{0,15}$/,
      message: "Invalid phone number format",
    },
  },
};

type FormData = {
  fullname: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  birthday: string;
  phone: string;
  emailOtp: string;
  phoneOtp: string;
};

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState({
    email: false,
    phone: false,
  });
  const {
    register: registerUser,
    sendOTP,
    verifyOTP,
    loading: authLoading,
    error: authError,
    clearError: clearAuthError, // Renamed to avoid conflict
  } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    formState: { errors },
    setError: setFormError, // Renamed to avoid conflict
    clearErrors,
  } = useForm<FormData>({
    mode: "onChange",
  });

  const password = watch("password");

  // Memoized confirm password validation
  const confirmPasswordValidation = useMemo(
    () => ({
      required: "Please confirm your password",
      validate: (val: string) => val === password || "Passwords do not match",
    }),
    [password],
  );

  // Optimized step validation
  const validateCurrentStep = useCallback(async () => {
    const fieldsToValidate = {
      1: ["fullname", "username", "email", "password", "confirmPassword"],
      2: ["birthday", "phone"],
      3: ["emailOtp"],
      4: ["phoneOtp"],
    };

    const fields = fieldsToValidate[step as keyof typeof fieldsToValidate];
    if (!fields) return false;

    const isStepValid = await trigger(fields as any);
    return isStepValid;
  }, [step, trigger]);

  // Handle OTP sending
  const handleSendOTP = useCallback(
    async (type: "email" | "phone") => {
      try {
        setIsSendingOTP(true);
        clearAuthError(); // Using the renamed clearError from useAuth

        const contact = watch(type);
        if (!contact) {
          setFormError(type === "email" ? "email" : "phone", {
            type: "manual",
            message: `${type === "email" ? "Email" : "Phone"} is required`,
          });
          return;
        }

        await sendOTP(contact, type);
      } catch (error) {
        console.error(`Error sending ${type} OTP:`, error);
      } finally {
        setIsSendingOTP(false);
      }
    },
    [watch, sendOTP, clearAuthError, setFormError],
  );

  const handleVerifyOTP = useCallback(
    async (otp: string, type: "email" | "phone") => {
      try {
        clearAuthError(); // Use clearAuthError instead of clearError
        const contact = watch(type);

        if (!contact) {
          setFormError(type, {
            type: "manual",
            message: `${type === "email" ? "Email" : "Phone"} is required`,
          });
          return false;
        }

        await verifyOTP(contact, otp, type);
        setVerificationStatus((prev) => ({ ...prev, [type]: true }));
        return true;
      } catch (error) {
        console.error(`Error verifying ${type} OTP:`, error);
        return false;
      }
    },
    [watch, verifyOTP, clearAuthError, setFormError],
  );

  // Optimized step navigation
  const handleNext = useCallback(async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    if (step === 2) {
      await handleSendOTP("email");
    }

    setStep((prev) => prev + 1);
    clearErrors();
  }, [step, validateCurrentStep, handleSendOTP, clearErrors]);

  const handleBack = useCallback(() => {
    setStep((prev) => prev - 1);
    clearErrors();
    clearAuthError(); // Use clearAuthError instead of clearError
  }, [clearErrors, clearAuthError]);

  // Final registration after both verifications
  const handleFinalRegistration = useCallback(
    async (data: FormData) => {
      try {
        clearAuthError();
        await registerUser(
          data.username,
          data.email,
          data.password,
          data.fullname,
          data.phone,
          data.birthday,
        );
        navigate("/", { replace: true });
      } catch (error) {
        console.error("Registration error:", error);
        setFormError("root", {
          type: "manual",
          message:
            error instanceof Error
              ? error.message
              : "Registration failed. Please try again.",
        });
      }
    },
    [registerUser, navigate, clearAuthError, setFormError],
  );

  // Memoized step content
  const stepContent = useMemo(() => {
    switch (step) {
      case 1:
        return (
          <>
            <FormInput
              icon={<User className="w-5 h-5" />}
              placeholder="Full Name"
              {...register("fullname", VALIDATION_RULES.fullname)}
              error={errors.fullname}
            />
            <FormInput
              icon={<User className="w-5 h-5" />}
              placeholder="Username"
              {...register("username", VALIDATION_RULES.username)}
              error={errors.username}
            />
            <FormInput
              icon={<Mail className="w-5 h-5" />}
              type="email"
              placeholder="Email"
              {...register("email", VALIDATION_RULES.email)}
              error={errors.email}
            />
            <PasswordInput
              placeholder="Password"
              {...register("password", VALIDATION_RULES.password)}
              error={errors.password}
            />
            <PasswordInput
              placeholder="Confirm Password"
              {...register("confirmPassword", confirmPasswordValidation)}
              error={errors.confirmPassword}
            />
          </>
        );
      case 2:
        return (
          <>
            <FormInput
              icon={<Calendar className="w-5 h-5" />}
              type="date"
              max={new Date().toISOString().split("T")[0]}
              {...register("birthday", VALIDATION_RULES.birthday)}
              error={errors.birthday}
            />
            <FormInput
              icon={<Phone className="w-5 h-5" />}
              type="tel"
              placeholder="Phone Number"
              {...register("phone", VALIDATION_RULES.phone)}
              error={errors.phone}
            />
          </>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Mail className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Verify Your Email
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We've sent a 6-digit code to {watch("email")}
              </p>
            </div>
            <OTPVerification
              onVerify={(otp) => handleVerifyOTP(otp, "email")}
              onResend={() => handleSendOTP("email")}
              onCancel={handleBack}
              error={authError}
              contactInfo={watch("email")}
              isVerifying={authLoading}
              isVerified={verificationStatus.email}
              type="email"
            />
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Phone className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Verify Your Phone
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We've sent a 6-digit code to {watch("phone")}
              </p>
            </div>
            <OTPVerification
              onVerify={(otp) => handleVerifyOTP(otp, "phone")}
              onResend={() => handleSendOTP("phone")}
              onCancel={handleBack}
              error={authError}
              contactInfo={watch("phone")}
              isVerifying={authLoading}
              isVerified={verificationStatus.phone}
              type="phone"
            />

            {verificationStatus.email && verificationStatus.phone && (
              <Button
                onClick={handleSubmit(handleFinalRegistration)}
                className="w-full"
                disabled={authLoading}
              >
                {authLoading ? <Loader size="sm" /> : "Complete Registration"}
              </Button>
            )}
          </div>
        );
      default:
        return null;
    }
  }, [
    step,
    register,
    errors,
    confirmPasswordValidation,
    watch,
    authError,
    authLoading,
    verificationStatus,
    handleVerifyOTP,
    handleSendOTP,
    handleBack,
    handleSubmit,
    handleFinalRegistration,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4"
            >
              {step <= 2 ? (
                <MessageCircle className="w-8 h-8 text-white" />
              ) : (
                <Shield className="w-8 h-8 text-white" />
              )}
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Join Chatty
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {STEP_TITLES[step as keyof typeof STEP_TITLES]}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex justify-center mb-6">
            <div className="flex space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i <= step ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Verification status indicators */}
          {(step === 3 || step === 4) && (
            <div className="flex justify-center space-x-4 mb-4">
              <div
                className={`flex items-center text-sm ${verificationStatus.email ? "text-green-600" : "text-gray-400"}`}
              >
                <Mail className="w-4 h-4 mr-1" />
                Email {verificationStatus.email ? "✓" : "○"}
              </div>
              <div
                className={`flex items-center text-sm ${verificationStatus.phone ? "text-green-600" : "text-gray-400"}`}
              >
                <Phone className="w-4 h-4 mr-1" />
                Phone {verificationStatus.phone ? "✓" : "○"}
              </div>
            </div>
          )}

          {/* Form */}
          {step < 3 ? (
            <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
              {stepContent}

              {/* Global error display */}
              {authError && (
                <div className="text-red-500 text-sm text-center">
                  {authError}
                </div>
              )}

              {/* For form errors */}
              {errors.root && (
                <div className="text-red-500 text-sm text-center">
                  {errors.root.message}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex gap-2">
                {step > 1 && (
                  <Button
                    type="button"
                    onClick={handleBack}
                    variant="secondary"
                    className="flex-1"
                  >
                    <ArrowLeft className="inline w-4 h-4 mr-1" /> Back
                  </Button>
                )}

                <Button
                  type="submit"
                  className="flex-1"
                  disabled={authLoading || isSendingOTP}
                >
                  {authLoading || isSendingOTP ? <Loader size="sm" /> : "Next"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {stepContent}

              {/* Global error display */}
              {authError && (
                <div className="text-red-500 text-sm text-center">
                  {authError}
                </div>
              )}
            </div>
          )}

          {/* Login link */}
          <div className="mt-6 text-center text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-500 hover:text-blue-600 font-semibold"
            >
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;




// src/pages/chat.tsx
function ChatPage() {
  return (
    <div>
      <h1 className="text-red-700">hello this is chat page</h1>
    </div>
  );
}

export default ChatPage;




// src/interfaces/APIInterface.ts
export interface APIInterface<T = any> {
  data: T;
  message: string;
  statusCode: number;
  success: boolean;
}




// src/interfaces/User.ts
export interface UserInterface {
  _id: string;
  avatar: {
    url: string;
    localPath: string;
    _id: string;
  };
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}




// src/contexts/AuthContext.tsx
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

    if (data.email) payload.email = data.email;
    else if (data.username) payload.username = data.username;

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




// src/contexts/ThemeContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme;
    return (
      stored ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light")
    );
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);

    // Set CSS custom properties for toast styling
    const style = root.style;
    if (theme === "dark") {
      style.setProperty("--toast-bg", "#374151");
      style.setProperty("--toast-color", "#f9fafb");
      style.setProperty("--toast-border", "#4b5563");
    } else {
      style.setProperty("--toast-bg", "#ffffff");
      style.setProperty("--toast-color", "#111827");
      style.setProperty("--toast-border", "#e5e7eb");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};




// src/components/Button.tsx
import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  onClick,
}) => {
  const baseClasses =
    "rounded-md font-medium transition-all duration-200 ease-in-out";

  const variantClasses = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg",
    secondary:
      "bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg",
    outline:
      "bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50",
  };

  const sizeClasses = {
    sm: "py-1.5 px-3 text-sm",
    md: "py-2 px-5 text-base",
    lg: "py-3 px-8 text-lg",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;




// src/components/FormInput.tsx
// components/FormInput.tsx
import { forwardRef, InputHTMLAttributes } from "react";
import type { FieldError } from "react-hook-form";
import { motion } from "framer-motion";
import clsx from "clsx";

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
            className={clsx(
              "w-full py-3 pr-10 border rounded-lg transition-colors placeholder-gray-500 dark:placeholder-gray-400",
              "bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
              "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
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




// src/components/Layout.tsx
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 flex flex-1 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;




// src/components/Loader.tsx
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




// src/components/OTPVerification.tsx
import React, { useState, useEffect } from "react";
import { RotateCw, ArrowLeft, CheckCircle, ShieldCheck } from "lucide-react";
import Button from "./Button";
import Loader from "./Loader";

type OTPVerificationProps = {
  onVerify: (otp: string) => Promise<boolean>;
  onResend: () => Promise<void>;
  onCancel?: () => void;
  error?: string | null;
  contactInfo: string;
  isVerifying: boolean;
  isVerified?: boolean;
  type: "email" | "phone";
  length?: number;
};

const OTPVerification: React.FC<OTPVerificationProps> = ({
  onVerify,
  onResend,
  onCancel,
  error,
  contactInfo,
  isVerifying,
  isVerified = false,
  type = "email",
  length = 6,
}) => {
  const [otp, setOtp] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, length);
    setOtp(value);
  };

  const handleVerify = async () => {
    if (otp.length !== length) return;
    const success = await onVerify(otp);
    if (success) {
      setOtp("");
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      setIsResending(true);
      await onResend();
      setResendCooldown(30); // 30-second cooldown
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (isVerified) {
    return (
      <div className="flex items-center justify-center text-green-600 dark:text-green-400">
        <CheckCircle className="w-5 h-5 mr-2" />
        {type === "email" ? "Email" : "Phone"} verified successfully!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        <div className="relative w-full">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={otp}
            onChange={handleChange}
            disabled={isVerifying}
            className="w-full text-center text-2xl font-mono tracking-widest bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="------"
            maxLength={length}
            autoFocus
          />
          {isVerifying && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 bg-opacity-50 rounded-lg">
              <Loader size="sm" />
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Enter {length}-digit code sent to {contactInfo}
        </div>
      </div>

      {error && <div className="text-red-500 text-sm text-center">{error}</div>}

      <Button
        onClick={handleVerify}
        className="w-full"
        disabled={otp.length !== length || isVerifying}
      >
        {isVerifying ? (
          <Loader size="sm" />
        ) : (
          <>
            <ShieldCheck className="w-4 h-4 mr-2" />
            Verify
          </>
        )}
      </Button>

      <div className="flex justify-between items-center">
        {onCancel && (
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        )}

        <Button
          onClick={handleResend}
          variant="ghost"
          size="sm"
          disabled={resendCooldown > 0 || isResending}
          className="text-blue-600 dark:text-blue-400"
        >
          {isResending ? (
            <Loader size="sm" />
          ) : (
            <>
              <RotateCw className="w-4 h-4 mr-1" />
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend Code"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default OTPVerification;




// src/components/PasswordInput.tsx
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




// src/components/PrivateRoute.tsx
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




// src/components/PublicRoute.tsx
import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const PublicRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  if (token && user?._id) return <Navigate to="/chat" replace />;
  return children;
};

export default PublicRoute;




// src/components/Sidebar.tsx
import React, { useState } from "react";
import { MdOutlineChat } from "react-icons/md";
import { MdUpdate } from "react-icons/md";
import { GoGear } from "react-icons/go";
import { CgProfile } from "react-icons/cg";

const Sidebar = () => {
  const [activeItem, setActiveItem] = useState("chat");

  const topItems = [
    { id: "chat", icon: <MdOutlineChat size={20} />, label: "chat" },
    { id: "status", icon: <MdUpdate size={20} />, label: "status" },
  ];

  const bottomItems = [
    { id: "setting", icon: <GoGear size={20} />, label: "setting" },
    { id: "profile", icon: <CgProfile size={20} />, label: "profile" },
  ];

  return (
    <aside className="flex flex-col w-16 h-screen bg-gray-900 pt-8 border-r border-gray-800">
      <nav className="flex flex-col justify-between flex-1 items-center px-2 py-4">
        {/* Top Items */}
        <div className="flex flex-col items-center space-y-6">
          {topItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveItem(item.id)}
              className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-gray-800 ${
                activeItem === item.id
                  ? "text-white bg-gray-800 outline-none"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {item.icon}
              {activeItem === item.id && <div className="absolute" />}
            </button>
          ))}
        </div>

        {/* Bottom Items */}
        <div className="flex flex-col items-center space-y-6">
          {bottomItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveItem(item.id)}
              className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-gray-800 ${
                activeItem === item.id
                  ? "text-white bg-gray-800 outline-none"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {item.icon}
              {activeItem === item.id && <div className="absolute" />}
            </button>
          ))}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;




// src/api/index.ts
// Import necessary modules and utilities
import type { APIInterface } from "../interfaces/APIInterface";
import { requestHandler } from "../utils";
import axios from "axios";
import { LocalStorage } from "../utils";

// create an axios instance for API requests
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  withCredentials: true,
  timeout: 120000,
});

// Add interceptor to set authorization header with user token before requests
apiClient.interceptors.request.use(
  function (config) {
    //Retrive user token from local storage
    const token = LocalStorage.get("token");
    // set authorization header with bearer token
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  function (error) {
    return Promise.reject(error);
  },
);

//API functions for diffirent requests
const loginUser = (data: {
  username?: string;
  email?: string;
  password: string;
}) => {
  return apiClient.post("/users/login", data);
};

const registerUser = (data: {
  email: string;
  password: string;
  username: string;
  contact: string;
  full_name: string;
  date_of_birth: string;
}) => {
  return apiClient.post("/users/register", data);
};

const changeUserPassword = (data: {
  email: string;
  old_password: string;
  new_password: string;
}) => {
  return apiClient.post("/users/change-password", data);
};

const forgotUserPassword = (data: { email: string; password: string }) => {
  return apiClient.post("/users/forgot-password", data);
};

const sendOTP = (data: { type: "email" | "phone"; value: string }) => {
  return requestHandler<APIInterface<{ otpId: string }>>(
    apiClient.post("/otp/send", data),
  );
};

const verifyOTP = (data: { otpId: string; otp: string }) => {
  return requestHandler<APIInterface<{ verified: boolean }>>(
    apiClient.post("/otp/verify", data),
  );
};

const logoutUser = () => apiClient.post("/users/logout");

export {
  registerUser,
  loginUser,
  changeUserPassword,
  logoutUser,
  sendOTP,
  verifyOTP,
  forgotUserPassword,
};




