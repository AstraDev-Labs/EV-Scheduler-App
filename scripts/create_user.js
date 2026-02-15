const { createClient } = require('@supabase/supabase-js');

// Check arguments
if (process.argv.length < 4) {
    console.log('Usage: node create_user.js <SUPABASE_URL> <SERVICE_ROLE_KEY> <EMAIL> [PASSWORD]');
    process.exit(1);
}

const supabaseUrl = process.argv[2];
const serviceRoleKey = process.argv[3];
const email = process.argv[4];
const password = process.argv[5] || 'password123';

console.log(`Creating user: ${email} ...`);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createUser() {
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (error) {
        console.error('Error creating user:', error.message);
        process.exit(1);
    }

    console.log('User created successfully!');
    console.log('ID:', data.user.id);
    console.log('Email:', data.user.email);
    console.log('Confirmed:', data.user.email_confirmed_at);
}

createUser();
