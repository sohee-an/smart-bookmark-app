-- feature_usage: 유저별 기능 사용 횟수 추적
CREATE TABLE feature_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature text NOT NULL,
  used_at timestamptz DEFAULT now() NOT NULL
);

-- 유저 + 기능 기준 조회 최적화
CREATE INDEX idx_feature_usage_user_feature ON feature_usage (user_id, feature, used_at);

-- RLS: 본인 기록만 조회/삽입 가능
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "유저 본인 기록만 조회" ON feature_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "유저 본인 기록만 삽입" ON feature_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);
