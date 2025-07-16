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

const Register = ({ switchToLogin }: { switchToLogin: () => void }) => {
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
            <button
              onClick={switchToLogin}
              className="text-blue-500 hover:text-blue-600 font-semibold"
            >
              Login
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
