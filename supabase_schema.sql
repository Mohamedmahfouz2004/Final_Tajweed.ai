-- 1. Profiles Table (Extends Supabase Auth Users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    avatar_url TEXT,
    daily_goal INTEGER DEFAULT 15,
    practice_reminders BOOLEAN DEFAULT true,
    sound_feedback BOOLEAN DEFAULT true,
    compact_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Lessons Table
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url TEXT,
    content_type VARCHAR(50) DEFAULT 'video',
    sequence_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Quizzes Table (Embedded in MongoDB, but relational in SQL)
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of strings/objects
    correct_answer TEXT NOT NULL,
    points INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Progress Table
CREATE TABLE progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'not-started', -- not-started, in-progress, completed
    score INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, lesson_id)
);

-- 5. Mistakes Tracking (The core of Tajweed logic)
CREATE TABLE mistakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL, -- Optional linking to a lesson
    error_type VARCHAR(100) NOT NULL,
    rule_category VARCHAR(150),
    rule_name_ar VARCHAR(150),
    surah_number INTEGER,
    ayah_number INTEGER,
    ayah_text TEXT,
    char_index INTEGER,
    is_corrected BOOLEAN DEFAULT false,
    corrected_at TIMESTAMP WITH TIME ZONE,
    feedback TEXT,
    audio_url TEXT,
    occurrence_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Recitation Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    surah_number INTEGER,
    from_ayah INTEGER,
    to_ayah INTEGER,
    duration_seconds INTEGER DEFAULT 0,
    total_mistakes INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add indexes for performance
CREATE INDEX idx_mistakes_user_id ON mistakes(user_id);
CREATE INDEX idx_progress_user_id ON progress(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_lessons_order ON lessons(sequence_order);

-- Automatically update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mistakes_updated_at BEFORE UPDATE ON mistakes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
