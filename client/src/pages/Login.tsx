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

const Login: React.FC = ({
  switchToRegister,
}: {
  switchToRegister: () => void;
}) => {
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
              Sign in to continue your conversations on QueeTalk
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
              <button
                onClick={switchToRegister}
                className="text-blue-500 hover:text-blue-600 font-semibold transition-colors"
              >
                Register
              </button>
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
