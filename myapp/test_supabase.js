require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const email = `tajweed.test${Math.floor(Math.random() * 10000)}@gmail.com`;
  console.log("Testing signup with", email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'Password123!',
    options: {
      data: { 
        first_name: 'Test', 
        last_name: 'User',
        full_name: 'Test User',
        name: 'Test User',
        display_name: 'Test User'
      }
    }
  });
  console.log("Error:", error);
  console.log("Session:", !!data?.session);
}
test();
