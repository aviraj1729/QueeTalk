import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose, { Schema } from "mongoose";
import { USER_TEMPORARY_TOKEN_EXPIRY, UserLoginType } from "../constants.js";
import validator from "validator";
import dotenv from "dotenv";
dotenv.config();
const MINIMUM_AGE = 10;
const OTP_EXPIRY_MINUTES = 5; // OTP expires in 5 minutes

const userSchema = new Schema(
  {
    avatar: {
      type: {
        url: String,
        localPath: String,
      },
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      minlength: [3, "Username must be at least 3 characters long"],
      maxlength: [20, "Username cannot exceed 20 characters"],
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9_]+$/.test(v);
        },
        message: "Username can only contain letters, numbers, and underscores",
      },
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: validator.isEmail,
        message: (props) => `${props.value} is not a valid email!`,
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      validate: {
        validator: function (v) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(
            v,
          );
        },
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      },
    },
    contact: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid phone number! Must be 10 digits.`,
      },
    },
    loginType: {
      type: String,
      enum: [UserLoginType.EMAIL_PASSWORD],
      default: UserLoginType.EMAIL_PASSWORD,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isContactVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function (dob) {
          if (!dob) return true;
          const today = new Date();
          const age = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            return age - 1 >= MINIMUM_AGE;
          }
          return age >= MINIMUM_AGE;
        },
        message: (props) => `User must be at least ${MINIMUM_AGE} years old.`,
      },
    },
    emailOTP: {
      type: String,
    },
    emailOTPExpiry: {
      type: Date,
    },
    phoneOTP: {
      type: String,
    },
    phoneOTPExpiry: {
      type: Date,
    },
    passwordResetOTP: {
      type: String,
    },
    passwordResetOTPExpiry: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
    indexes: [
      { email: 1 },
      { username: 1 },
      { contact: 1 },
      { isEmailVerified: 1 },
      { isContactVerified: 1 },
    ],
  },
);

userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
  );
};

userSchema.methods.generateEmailOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
  this.emailOTP = hashedOTP;
  this.emailOTPExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  return otp;
};

userSchema.methods.generatePhoneOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
  this.phoneOTP = hashedOTP;
  this.phoneOTPExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  return otp;
};

userSchema.methods.generatePasswordResetOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
  this.passwordResetOTP = hashedOTP;
  this.passwordResetOTPExpiry = new Date(
    Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
  );
  return otp;
};

userSchema.methods.verifyEmailOTP = function (otp) {
  if (!this.emailOTP || !this.emailOTPExpiry) {
    return {
      success: false,
      message: "No OTP found. Please request a new one.",
    };
  }
  if (Date.now() > this.emailOTPExpiry) {
    return {
      success: false,
      message: "OTP has expired. Please request a new one.",
    };
  }
  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
  if (this.emailOTP !== hashedOTP) {
    return { success: false, message: "Invalid OTP." };
  }
  this.emailOTP = undefined;
  this.emailOTPExpiry = undefined;
  this.isEmailVerified = true;
  return { success: true, message: "Email verified successfully." };
};

userSchema.methods.verifyPhoneOTP = function (otp) {
  if (!this.phoneOTP || !this.phoneOTPExpiry) {
    return {
      success: false,
      message: "No OTP found. Please request a new one.",
    };
  }
  if (Date.now() > this.phoneOTPExpiry) {
    return {
      success: false,
      message: "OTP has expired. Please request a new one.",
    };
  }
  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
  if (this.phoneOTP !== hashedOTP) {
    return { success: false, message: "Invalid OTP." };
  }
  this.phoneOTP = undefined;
  this.phoneOTPExpiry = undefined;
  this.isContactVerified = true;
  return { success: true, message: "Phone number verified successfully." };
};

userSchema.methods.verifyPasswordResetOTP = function (otp) {
  if (!this.passwordResetOTP || !this.passwordResetOTPExpiry) {
    return {
      success: false,
      message: "No OTP found. Please request a new one.",
    };
  }
  if (Date.now() > this.passwordResetOTPExpiry) {
    return {
      success: false,
      message: "OTP has expired. Please request a new one.",
    };
  }
  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
  if (this.passwordResetOTP !== hashedOTP) {
    return { success: false, message: "Invalid OTP." };
  }
  this.passwordResetOTP = undefined;
  this.passwordResetOTPExpiry = undefined;
  return {
    success: true,
    message: "OTP verified. You can now reset your password.",
  };
};

userSchema.methods.incLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 };
  }
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

userSchema.statics.findByEmailOrUsername = function (identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() },
    ],
  });
};

export const User = mongoose.model("User", userSchema);
