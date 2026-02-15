-- Ensure UUID extension exists
create extension if not exists "uuid-ossp";

-- Create Conversations Table
-- Changed user_id to BIGINT to match the users table type
create table if not exists conversations (
  id uuid default uuid_generate_v4() primary key,
  user_id bigint references users(id) not null, 
  title text,
  created_at timestamp with time zone default now()
);

-- Messages Table
create table if not exists messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default now()
);

-- Note: Since the application manages its own users (Integer IDs) independently 
-- of Supabase Auth (UUIDs), we cannot use standard RLS with auth.uid() easily.
-- Privacy is enforced by the Backend Application Logic which strictly scopes
-- queries to the authenticated user's ID.

-- Optional: Index for performance
create index if not exists idx_conversations_user_id on conversations(user_id);
create index if not exists idx_messages_conversation_id on messages(conversation_id);
