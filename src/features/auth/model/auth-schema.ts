import * as z from 'zod';

/**
 * @description 인증(로그인/회원가입)에 공통으로 사용되는 검증 스키마
 */
export const authSchema = z.object({
  email: z.string().email('유효한 이메일 형식을 입력해주세요.'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // confirmPassword가 존재할 때만(회원가입 모드) 비밀번호 일치 여부 확인
  if (data.confirmPassword !== undefined && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
});

export type AuthFormData = z.infer<typeof authSchema>;
