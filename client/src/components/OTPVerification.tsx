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
