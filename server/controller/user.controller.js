import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { Chat } from "../models/chat.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import cloudinary from "../config/cloudinary.js";
import { bufferToStream } from "../utils/bufferToStream.js";
import {
  sendEmailOTP,
  sendPhoneOTP,
  sendPasswordResetOTP,
} from "../utils/otp.js";
import mongoose from "mongoose";
const SENSITIVE_FIELDS = ["username", "email", "contact"];

// Helper to generate tokens and save refreshToken
const generateAccessAndRefreshTokens = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");
  user.refreshToken = user.generateRefreshToken();
  await user.save({ validateBeforeSave: false });
  return {
    accessToken: user.generateAccessToken(),
    refreshToken: user.generateRefreshToken(),
  };
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, name, contact, dateOfBirth } = req.body;

  const existedUser = await User.findOne({
    $or: [{ username }, { email }, { contact }],
  });
  if (existedUser)
    throw new ApiError(
      409,
      "User with email, username or contact already exists",
    );

  const user = new User({
    email,
    password,
    username,
    name,
    contact,
    dateOfBirth,
  });

  await sendEmailOTP(user); // Sends email + logs request
  await sendPhoneOTP(user); // Sends SMS + logs request
  await user.save({ validateBeforeSave: false });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailOTP -emailOTPExpiry -phoneOTP -phoneOTPExpiry -passwordResetOTP -passwordResetOTPExpiry",
  );
  if (!createdUser) throw new ApiError(500, "User registration failed");

  return res.status(201).json(
    new ApiResponse(
      200,
      {
        user: createdUser,
        message:
          "Please verify both your email and phone number to complete registration.",
      },
      "User registered successfully.",
    ),
  );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  if (!username && !email)
    throw new ApiError(400, "Username or email is required");

  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) throw new ApiError(404, "User does not exist");

  if (!user.isEmailVerified) {
    throw new ApiError(401, "Please verify your email before logging in.");
  }
  if (!user.isContactVerified) {
    throw new ApiError(
      401,
      "Please verify your phone number before logging in.",
    );
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
  const sanitizedUser = await User.findById(user._id).select(
    "-password -refreshToken -emailOTP -emailOTPExpiry -phoneOTP -phoneOTPExpiry -passwordResetOTP -passwordResetOTPExpiry",
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: sanitizedUser, accessToken, refreshToken },
        "User logged in successfully",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: "" } });
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError(400, "Email and OTP are required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  const { success, message } = user.verifyEmailOTP(otp);
  if (!success) throw new ApiError(400, message);
  await user.save({ validateBeforeSave: false });
  return res.status(200).json(new ApiResponse(200, {}, message));
});

const verifyPhone = asyncHandler(async (req, res) => {
  const { contact, otp } = req.body;
  if (!contact || !otp)
    throw new ApiError(400, "Phone number and OTP are required");

  const user = await User.findOne({ contact });
  if (!user) throw new ApiError(404, "User not found");

  const { success, message } = user.verifyPhoneOTP(otp);
  if (!success) throw new ApiError(400, message);
  await user.save({ validateBeforeSave: false });
  return res.status(200).json(new ApiResponse(200, {}, message));
});

const resendEmailOTP = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, "Email is already verified");
  }

  await sendEmailOTP(user);
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Email OTP has been resent"));
});

const resendPhoneOTP = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isContactVerified) {
    throw new ApiError(400, "Phone number is already verified");
  }

  const phoneOTP = await sendPhoneOTP(user);
  await user.save({ validateBeforeSave: false });

  // Replace this with actual SMS provider like Twilio or MSG91
  console.log(`OTP to ${user.contact}: ${phoneOTP}`);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Phone OTP has been resent"));
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  const otp = user.generatePasswordResetOTP();
  await user.save({ validateBeforeSave: false });

  await sendPasswordResetOTP(user);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset OTP sent"));
});

const resetForgottenPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    throw new ApiError(400, "All fields are required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  const { success, message } = user.verifyPasswordResetOTP(otp);
  if (!success) throw new ApiError(400, message);

  user.password = newPassword;
  await user.save();
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!(await user.isPasswordCorrect(oldPassword)))
    throw new ApiError(400, "Invalid old password");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res, next) => {
  if (!req.file) throw new ApiError(400, "Avatar image is required");

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const stream = cloudinary.uploader.upload_stream(
    {
      folder: "avatars",
      public_id: `user_${user._id}`,
      overwrite: true,
      resource_type: "image",
    },
    async (error, result) => {
      if (error) {
        console.error("Cloudinary error:", error);
        return next(
          new ApiError(500, `Cloudinary upload failed: ${error.message}`),
        );
      }

      try {
        user.avatar = {
          url: result.secure_url,
          localPath: result.public_id,
        };
        await user.save();
        res
          .status(200)
          .json(new ApiResponse(200, user, "Avatar uploaded successfully"));
      } catch (saveError) {
        console.error("Database save error:", saveError);
        return next(new ApiError(500, "Failed to save user avatar"));
      }
    },
  );

  bufferToStream(req.file.buffer).pipe(stream);
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const updates = req.body;

  const updatingSensitive = SENSITIVE_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(updates, field),
  );

  if (updatingSensitive) {
    if (!updates.token)
      throw new ApiError(401, "2FA token is required for sensitive updates");

    const is2FAValid = user.verifyTwoFAToken(updates.token);
    if (!is2FAValid) throw new ApiError(401, "Invalid 2FA token");

    delete updates.token; // remove token before updating
  }

  const allowedFields = ["name", "username", "email", "contact"];
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      user[field] = updates[field];
    }
  });

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile updated successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);
    user.refreshToken = newRefreshToken;
    await user.save();

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed",
        ),
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const toggleFavorites = asyncHandler(async (req, res) => {
  const { chatId } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, "Chat not found");

  // Check if the chat is already in favorites by comparing the chat field
  const existingFavorite = user.favorites.find(
    (fav) => fav.user.toString() === chatId.toString(), // Assuming your schema has 'user' field storing chatId
  );

  let updatedUser;
  let message;

  if (existingFavorite) {
    // Remove from favorites
    updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { favorites: { user: chatId } } },
      { new: true },
    );
    message = "Removed from favorites";
  } else {
    // Add to favorites
    updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { favorites: { user: chatId } } },
      { new: true },
    );
    message = "Added to favorites";
  }

  res.status(200).json({
    success: true,
    message: message,
    favorites: updatedUser.favorites,
  });
});

const toggleBlockContact = asyncHandler(async (req, res) => {
  const { chatId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    throw new ApiError(400, "Invalid chat ID");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  let updatedUser;
  if (user.blockedUsers.includes(chatId)) {
    // Remove from favorites
    updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { blockedUsers: chatId } },
      { new: true },
    );
  } else {
    // Add to favorites
    updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { blockedUsers: chatId } },
      { new: true },
    );
  }

  res.status(200).json({
    success: true,
    message: user.blockedUsers.includes(chatId)
      ? "Unblocked Contact"
      : "Blocked Contact",
    blockedUsers: updatedUser.blockedUsers,
  });
});

export {
  registerUser,
  loginUser,
  logoutUser,
  verifyEmail,
  verifyPhone,
  resendEmailOTP,
  resendPhoneOTP,
  forgotPasswordRequest,
  refreshAccessToken,
  resetForgottenPassword,
  changeCurrentPassword,
  getCurrentUser,
  updateUserAvatar,
  updateProfile,
  toggleFavorites,
  toggleBlockContact,
};
