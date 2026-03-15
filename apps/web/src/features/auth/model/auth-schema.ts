import * as z from "zod";

/**
 * @description 인증(로그인/회원가입)에 공통으로 사용되는 검증 스키마
 */
export const authSchema = z.object({
  email: z.string().email("유효한 이메일 형식을 입력해주세요."),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
});

export type AuthFormData = z.infer<typeof authSchema>;
