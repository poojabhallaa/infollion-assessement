function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem("token")
  };
}

async function deposit() {
  const amount = parseFloat(document.getElementById('amount').value);
  const res = await fetch('/wallet/deposit', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ amount })
  });
  alert(JSON.stringify(await res.json()));
}

async function withdraw() {
  const amount = parseFloat(document.getElementById('amount').value);
  const res = await fetch('/wallet/withdraw', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ amount })
  });
  alert(JSON.stringify(await res.json()));
}

async function transfer() {
  const to = document.getElementById('to').value;
  const amount = parseFloat(document.getElementById('transfer-amount').value);
  const res = await fetch('/wallet/transfer', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ to, amount })
  });
  alert(JSON.stringify(await res.json()));
}

async function getHistory() {
  const res = await fetch('/wallet/history', {
    headers: authHeaders()
  });
  const data = await res.json();
  document.getElementById('history').innerText = JSON.stringify(data.transactions, null, 2);
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// Store token on login success
async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (data.token) {
    localStorage.setItem("token", data.token);
    window.location.href = 'wallet.html';
  } else {
    alert(data.message || 'Login failed');
  }
}

async function register() {
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;

  const res = await fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (res.ok) {
    alert(data.message || 'Registered!');

    // Auto-login after registration
    const loginRes = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const loginData = await loginRes.json();
    if (loginData.token) {
      localStorage.setItem("token", loginData.token);
      window.location.href = 'wallet.html';
    } else {
      alert('Auto-login failed. Please login manually.');
      window.location.href = 'login.html';
    }

  } else {
    alert(data.error || 'Registration failed');
  }
}


async function getFlagged() {
  const res = await fetch('/admin/flagged', { headers: authHeaders() });
  const data = await res.json();
  document.getElementById('results').innerText = JSON.stringify(data, null, 2);
}

async function getBalances() {
  const res = await fetch('/admin/balances', { headers: authHeaders() });
  const data = await res.json();
  document.getElementById('results').innerText = JSON.stringify(data, null, 2);
}

async function getTopUsers() {
  const res = await fetch('/admin/top-users', { headers: authHeaders() });
  const data = await res.json();
  document.getElementById('results').innerText = JSON.stringify(data, null, 2);
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

