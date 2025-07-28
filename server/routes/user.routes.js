import {
  registerUser,
  loginUser,
  logoutUser,
  verifyEmail,
  verifyPhone,
  resendEmailOTP,
  resendPhoneOTP,
  forgotPasswordRequest,
  resetForgottenPassword,
  changeCurrentPassword,
  getCurrentUser,
  updateUserAvatar,
  refreshAccessToken,
} from "../controller/user.controller.js";

import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  userRegisterValidator,
  userLoginValidator,
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userResetForgottenPasswordValidator,
} from "../validators/user.validators.js";
import { validate } from "../validators/validate.js";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();

//Public Routes

router.post("/register", userRegisterValidator(), validate, registerUser);
router.post("/login", userLoginValidator(), validate, loginUser);
router.post("/refresh-token", refreshAccessToken);

router.post(
  "/forgot-password",
  userForgotPasswordValidator(),
  validate,
  forgotPasswordRequest,
);
router.post(
  "/reset-password",
  userResetForgottenPasswordValidator(),
  validate,
  resetForgottenPassword,
);

//OTP Verification Routes

router.post("/verify-email", verifyEmail);
router.post("/verify-phone", verifyPhone);

router.post("/resend-email-otp", verifyJWT, resendEmailOTP);
router.post("/resend-phone-otp", verifyJWT, resendPhoneOTP);

//Authenticated Routes

router.post("/logout", verifyJWT, logoutUser);
router.get("/current-user", verifyJWT, getCurrentUser);

router.post(
  "/change-password",
  verifyJWT,
  userChangeCurrentPasswordValidator(),
  validate,
  changeCurrentPassword,
);

router.patch("/avatar", verifyJWT, upload.single("avatar"), updateUserAvatar);

export default router;
