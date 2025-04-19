import api from '../api';

export async function login(email: string, password: string) {
  try {
    const response = await api.post('/users/login', { email, password });
    return response.data;
  } catch (error: any) {
    // Forward the error so the frontend can handle it
    throw error;
  }
}

export async function googleLogin(token: string) {
    const response = await api.post('/users/googlelogin', { token });
    return response.data;
}

export async function refreshToken(refreshToken: string) {
    const response = await api.post('/auth/refresh-token', { refreshToken });
    return response.data;
}

export async function register(email: string, password: string, username: string, profilePicture: any) {
    console.log("Register payload (plain password):", { email, password, username, profilePicture });
    const response = await api.post('/users/register', {
        email, password, username,
        profilePicture: profilePicture ? profilePicture : ""
    });
    return response.data;
}

export async function me() {
    const response = await api.get('/users/me');
    return response.data;
}

export async function forgotPassword(email: string) {
    const res = await fetch("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });
    if (!res.ok) throw await res.json();
    return res.json();
}