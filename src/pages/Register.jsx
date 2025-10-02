import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "@/api/rest/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, UserPlus, AlertCircle, CheckCircle2, Heart, HandHeart } from "lucide-react";

// Volunteer skill options
const VOLUNTEER_SKILLS = [
  { id: "physical_labor", label: "體力勞動 (搬運、挖掘、清理)" },
  { id: "cooking", label: "烹飪 (準備餐點)" },
  { id: "medical", label: "醫療 (基礎護理、急救)" },
  { id: "counseling", label: "心理輔導 (情緒支持)" },
  { id: "driving", label: "駕駛 (物資運送)" },
  { id: "translation", label: "翻譯 (語言協助)" },
];

// Damage level options
const DAMAGE_LEVELS = [
  { value: "minor", label: "輕微 - 小範圍損壞" },
  { value: "moderate", label: "中等 - 需要清理與修復" },
  { value: "severe", label: "嚴重 - 大範圍損壞" },
  { value: "critical", label: "極嚴重 - 結構損壞或危險" },
];

export default function Register() {
  const navigate = useNavigate();

  // Form state
  const [step, setStep] = useState(1); // 1: Role selection, 2: Registration form
  const [role, setRole] = useState(""); // 'volunteer' or 'victim'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // Common fields
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  // Volunteer-specific fields
  const [skills, setSkills] = useState([]);
  const [organization, setOrganization] = useState("");
  const [preferredAreas, setPreferredAreas] = useState("");

  // Victim-specific fields
  const [address, setAddress] = useState("");
  const [damageDescription, setDamageDescription] = useState("");
  const [damageLevel, setDamageLevel] = useState("");

  // Validation
  const validatePhoneNumber = (phone) => {
    // Taiwan phone format: 09XX-XXX-XXX or 09XXXXXXXX
    const phoneRegex = /^09\d{2}-?\d{3}-?\d{3}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  };

  const validateForm = () => {
    const newErrors = {};

    // Common validations
    if (!fullName.trim()) {
      newErrors.fullName = "請輸入姓名";
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = "請輸入手機號碼";
    } else if (!validatePhoneNumber(phoneNumber)) {
      newErrors.phoneNumber = "請輸入有效的手機號碼 (格式: 09XX-XXX-XXX)";
    }

    // Role-specific validations
    if (role === "volunteer") {
      if (skills.length === 0) {
        newErrors.skills = "請至少選擇一項技能";
      }
    } else if (role === "victim") {
      if (!address.trim()) {
        newErrors.address = "請輸入地址";
      }
      if (!damageDescription.trim()) {
        newErrors.damageDescription = "請描述損壞情況";
      }
      if (!damageLevel) {
        newErrors.damageLevel = "請選擇損壞程度";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSkillToggle = (skillId) => {
    setSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(s => s !== skillId)
        : [...prev, skillId]
    );
  };

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setStep(2);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const registrationData = {
        phone_number: phoneNumber.replace(/\s|-/g, ""),
        role,
        full_name: fullName,
        emergency_contact: emergencyContact || undefined,
      };

      // Add role-specific fields
      if (role === "volunteer") {
        registrationData.skills = skills;
        registrationData.organization = organization || undefined;
        registrationData.preferred_areas = preferredAreas || undefined;
      } else if (role === "victim") {
        registrationData.address = address;
        registrationData.damage_description = damageDescription;
        registrationData.damage_level = damageLevel;
      }

      // Call registration API
      const response = await http.post('/auth/register', registrationData);

      setSuccess(true);

      // Redirect to login or OTP verification after 2 seconds
      setTimeout(() => {
        navigate('/login', {
          state: {
            phone: phoneNumber,
            message: 'Registration successful! OTP sent to your phone.'
          }
        });
      }, 2000);

    } catch (error) {
      console.error("Registration failed:", error);
      setErrors({
        submit: error.message || "註冊失敗，請稍後再試"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setRole("");
      setErrors({});
    } else {
      navigate('/login');
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">註冊成功！</h2>
            <p className="text-gray-600 mb-2">
              驗證碼已發送至您的手機
            </p>
            <p className="text-sm text-gray-500">
              正在跳轉至登入頁面...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">鏟子英雄</h1>
                <p className="text-sm text-gray-600">花蓮颱風救援對接平台</p>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  1
                </div>
                <span className="text-sm font-medium">選擇身份</span>
              </div>
              <div className={`h-0.5 w-16 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  2
                </div>
                <span className="text-sm font-medium">填寫資料</span>
              </div>
            </div>
          </div>

          {/* Step 1: Role Selection */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">請選擇您的身份</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Volunteer Card */}
                  <button
                    onClick={() => handleRoleSelect("volunteer")}
                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                        <HandHeart className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">我是志工</h3>
                      <p className="text-sm text-gray-600">
                        願意提供協助與支援
                      </p>
                      <ul className="mt-4 space-y-1 text-xs text-gray-500">
                        <li>• 參與救援活動</li>
                        <li>• 提供專業技能</li>
                        <li>• 協助災後復原</li>
                      </ul>
                    </div>
                  </button>

                  {/* Victim Card */}
                  <button
                    onClick={() => handleRoleSelect("victim")}
                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 text-left group"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                        <Heart className="w-8 h-8 text-orange-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">我需要幫助</h3>
                      <p className="text-sm text-gray-600">
                        受災需要志工協助
                      </p>
                      <ul className="mt-4 space-y-1 text-xs text-gray-500">
                        <li>• 申請人力支援</li>
                        <li>• 描述損壞情況</li>
                        <li>• 獲得救援資源</li>
                      </ul>
                    </div>
                  </button>
                </div>

                <div className="pt-4 text-center">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="text-gray-600"
                  >
                    返回登入
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Registration Form */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <UserPlus className="w-6 h-6" />
                  {role === "volunteer" ? "志工註冊" : "受災戶註冊"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Common Fields */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="fullName">
                        姓名 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="請輸入您的全名"
                        className={errors.fullName ? "border-red-500" : ""}
                      />
                      {errors.fullName && (
                        <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.fullName}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phoneNumber">
                        手機號碼 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phoneNumber"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="09XX-XXX-XXX"
                        className={errors.phoneNumber ? "border-red-500" : ""}
                      />
                      {errors.phoneNumber && (
                        <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.phoneNumber}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        將用於接收驗證碼和通知
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="emergencyContact">緊急聯絡人</Label>
                      <Input
                        id="emergencyContact"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        placeholder="姓名與電話 (選填)"
                      />
                    </div>
                  </div>

                  {/* Volunteer-specific fields */}
                  {role === "volunteer" && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold text-lg">志工專長</h3>

                      <div>
                        <Label>
                          技能專長 <span className="text-red-500">*</span>
                        </Label>
                        <div className="mt-2 space-y-3">
                          {VOLUNTEER_SKILLS.map((skill) => (
                            <div key={skill.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={skill.id}
                                checked={skills.includes(skill.id)}
                                onCheckedChange={() => handleSkillToggle(skill.id)}
                              />
                              <Label
                                htmlFor={skill.id}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {skill.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {errors.skills && (
                          <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.skills}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="organization">所屬組織或單位</Label>
                        <Input
                          id="organization"
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          placeholder="例：XX救援協會 (選填)"
                        />
                      </div>

                      <div>
                        <Label htmlFor="preferredAreas">希望服務的地區</Label>
                        <Input
                          id="preferredAreas"
                          value={preferredAreas}
                          onChange={(e) => setPreferredAreas(e.target.value)}
                          placeholder="例：光復鄉、瑞穗鄉 (選填)"
                        />
                      </div>
                    </div>
                  )}

                  {/* Victim-specific fields */}
                  {role === "victim" && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold text-lg">受災資訊</h3>

                      <div>
                        <Label htmlFor="address">
                          受災地址 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="請輸入詳細地址"
                          className={errors.address ? "border-red-500" : ""}
                        />
                        {errors.address && (
                          <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.address}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          此資訊將加密保存，僅用於救援對接
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="damageLevel">
                          損壞程度 <span className="text-red-500">*</span>
                        </Label>
                        <Select value={damageLevel} onValueChange={setDamageLevel}>
                          <SelectTrigger className={errors.damageLevel ? "border-red-500" : ""}>
                            <SelectValue placeholder="請選擇損壞程度" />
                          </SelectTrigger>
                          <SelectContent>
                            {DAMAGE_LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.damageLevel && (
                          <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.damageLevel}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="damageDescription">
                          損壞描述 <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="damageDescription"
                          value={damageDescription}
                          onChange={(e) => setDamageDescription(e.target.value)}
                          placeholder="請詳細描述損壞情況、需要的協助類型等..."
                          rows={4}
                          className={errors.damageDescription ? "border-red-500" : ""}
                        />
                        {errors.damageDescription && (
                          <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.damageDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit Error */}
                  {errors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-600 text-sm flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {errors.submit}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={loading}
                      className="flex-1"
                    >
                      返回
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          註冊中...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          完成註冊
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center mt-8 text-sm text-gray-500">
            <p>已有帳號？ <a href="/login" className="text-blue-600 hover:underline">立即登入</a></p>
            <p className="mt-2">鏟子英雄 © 2024 - 緊急連絡：119 消防局 | 1999 市民熱線</p>
          </div>
        </div>
      </div>
    </div>
  );
}
