import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User } from "@/api/entities";
import { http } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Eye, EyeOff, Phone, Mail, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Login() {
  const navigate = useNavigate();

  // UI State
  const [loginMode, setLoginMode] = useState("phone"); // "phone" or "email"
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Form State - Phone Mode
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");

  // Form State - Email Mode
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  /**
   * Format phone number as 09XX-XXX-XXX
   */
  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 4) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    return `${numbers.slice(0, 4)}-${numbers.slice(4, 7)}-${numbers.slice(7, 10)}`;
  };

  /**
   * Validate phone number format
   */
  const validatePhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length === 10 && cleaned.startsWith("09");
  };

  /**
   * Validate email format
   */
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  /**
   * Handle phone number input change
   */
  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError("");
  };

  /**
   * Handle OTP input change (6 digits only)
   */
  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
    setError("");
  };

  /**
   * Request OTP for phone login
   */
  const handleRequestOtp = async () => {
    // Validate phone number
    if (!validatePhoneNumber(phoneNumber)) {
      setError("請輸入有效的手機號碼（格式：09XX-XXX-XXX）");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Clean phone number for API
      const cleanedPhone = phoneNumber.replace(/\D/g, "");

      // Call request-otp endpoint
      await http.post("/auth/request-otp", {
        phone_number: cleanedPhone,
        purpose: "login"
      });

      setOtpSent(true);
      setError("");
    } catch (err) {
      console.error("Failed to request OTP:", err);
      setError(err.body || err.message || "發送驗證碼失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle phone + OTP login
   */
  const handlePhoneLogin = async (e) => {
    e.preventDefault();

    // Validate OTP
    if (otp.length !== 6) {
      setError("請輸入 6 位數驗證碼");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Clean phone number for API
      const cleanedPhone = phoneNumber.replace(/\D/g, "");

      // Call login endpoint
      const response = await http.post("/auth/login", {
        phone_number: cleanedPhone,
        otp: otp
      });

      // Store tokens in localStorage
      if (response.accessToken) {
        localStorage.setItem("accessToken", response.accessToken);
      }
      if (response.refreshToken) {
        localStorage.setItem("refreshToken", response.refreshToken);
      }

      // Redirect to dashboard
      navigate("/");
    } catch (err) {
      console.error("Phone login failed:", err);
      setError(err.body || err.message || "登入失敗，請檢查驗證碼是否正確");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle email + password login
   */
  const handleEmailLogin = async (e) => {
    e.preventDefault();

    // Validate email
    if (!validateEmail(email)) {
      setError("請輸入有效的電子郵件地址");
      return;
    }

    // Validate password
    if (password.length < 6) {
      setError("密碼至少需要 6 個字元");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Call login endpoint
      const response = await http.post("/auth/login", {
        email: email,
        password: password
      });

      // Store tokens in localStorage
      if (response.accessToken) {
        localStorage.setItem("accessToken", response.accessToken);
      }
      if (response.refreshToken) {
        localStorage.setItem("refreshToken", response.refreshToken);
      }

      // Redirect to dashboard
      navigate("/");
    } catch (err) {
      console.error("Email login failed:", err);
      setError(err.body || err.message || "登入失敗，請檢查電子郵件和密碼");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Switch login mode and reset state
   */
  const switchMode = (mode) => {
    setLoginMode(mode);
    setError("");
    setOtpSent(false);
    setPhoneNumber("");
    setOtp("");
    setEmail("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <MapPin className="w-8 h-8 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">鏟子英雄</h1>
          <p className="text-gray-600">花蓮颱風救援對接平台</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">登入</CardTitle>
            <CardDescription className="text-center">
              {loginMode === "phone" ? "使用手機號碼登入" : "使用電子郵件登入"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Mode Switcher */}
            <div className="flex gap-2 mb-6">
              <Button
                type="button"
                variant={loginMode === "phone" ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  loginMode === "phone" && "bg-blue-600 hover:bg-blue-700"
                )}
                onClick={() => switchMode("phone")}
              >
                <Phone className="w-4 h-4 mr-2" />
                手機登入
              </Button>
              <Button
                type="button"
                variant={loginMode === "email" ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  loginMode === "email" && "bg-blue-600 hover:bg-blue-700"
                )}
                onClick={() => switchMode("email")}
              >
                <Mail className="w-4 h-4 mr-2" />
                管理員登入
              </Button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Phone Login Form */}
            {loginMode === "phone" && (
              <form onSubmit={handlePhoneLogin} className="space-y-4">
                {/* Phone Number Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    手機號碼
                  </label>
                  <Input
                    type="tel"
                    placeholder="09XX-XXX-XXX"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    disabled={loading || otpSent}
                    className="text-base"
                    maxLength={12}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    請輸入您的 10 位數手機號碼
                  </p>
                </div>

                {/* Send OTP Button */}
                {!otpSent && (
                  <Button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading || !phoneNumber}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        發送中...
                      </>
                    ) : (
                      "發送驗證碼"
                    )}
                  </Button>
                )}

                {/* OTP Input (shown after OTP is sent) */}
                {otpSent && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        驗證碼
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="請輸入 6 位數驗證碼"
                        value={otp}
                        onChange={handleOtpChange}
                        disabled={loading}
                        className="text-base text-center tracking-widest text-lg font-semibold"
                        maxLength={6}
                        autoFocus
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        驗證碼已發送至 {phoneNumber}
                      </p>
                    </div>

                    {/* Login Button */}
                    <Button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          登入中...
                        </>
                      ) : (
                        "登入"
                      )}
                    </Button>

                    {/* Resend OTP Link */}
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp("");
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        重新發送驗證碼
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {/* Email Login Form */}
            {loginMode === "email" && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                {/* Email Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    電子郵件
                  </label>
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    disabled={loading}
                    className="text-base"
                    autoComplete="email"
                  />
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    密碼
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="請輸入密碼"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      disabled={loading}
                      className="text-base pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      登入中...
                    </>
                  ) : (
                    "登入"
                  )}
                </Button>
              </form>
            )}

            {/* Additional Links */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600">
                還沒有帳號？{" "}
                <Link
                  to="/register"
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  立即註冊
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>使用手機號碼登入適用於志工和求助者</p>
          <p>使用電子郵件登入適用於系統管理員</p>
          <p className="mt-4">© 2024 鏟子英雄 - 花蓮颱風救援對接平台</p>
        </div>
      </div>
    </div>
  );
}
