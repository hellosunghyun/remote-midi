-- 실시간 MIDI 세션 링크 앱 초기 스키마
-- 세션 테이블 (sessions)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    participant_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- 인덱스 생성
CREATE INDEX idx_sessions_session_key ON sessions(session_key);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- RLS 정책 설정
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 기본 접근 권한
GRANT SELECT ON sessions TO anon;
GRANT ALL PRIVILEGES ON sessions TO authenticated;

-- 정책 생성
CREATE POLICY "Anyone can read sessions" ON sessions
    FOR SELECT USING (true);

CREATE POLICY "Anyone can create sessions" ON sessions
    FOR INSERT WITH CHECK (true);

-- MIDI 메시지 로그 테이블 (midi_messages) - 선택적
CREATE TABLE midi_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    midi_data BYTEA NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_midi_messages_session_id ON midi_messages(session_id);
CREATE INDEX idx_midi_messages_sent_at ON midi_messages(sent_at DESC);

-- RLS 정책 설정
ALTER TABLE midi_messages ENABLE ROW LEVEL SECURITY;

-- 기본 접근 권한
GRANT SELECT ON midi_messages TO anon;
GRANT ALL PRIVILEGES ON midi_messages TO authenticated;

-- 정책 생성
CREATE POLICY "Anyone can read midi messages" ON midi_messages
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert midi messages" ON midi_messages
    FOR INSERT WITH CHECK (true);

-- 참여자 테이블 (participants)
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 인덱스 생성
CREATE INDEX idx_participants_session_id ON participants(session_id);
CREATE INDEX idx_participants_user_id ON participants(user_id);

-- RLS 정책 설정
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- 기본 접근 권한
GRANT SELECT ON participants TO anon;
GRANT ALL PRIVILEGES ON participants TO authenticated;

-- 정책 생성
CREATE POLICY "Anyone can read participants" ON participants
    FOR SELECT USING (true);

CREATE POLICY "Anyone can manage participants" ON participants
    FOR ALL USING (true);