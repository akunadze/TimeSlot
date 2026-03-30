import { auth } from './auth';

const BASE = '/api';

async function request(method, path, body) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login:          (data) => request('POST', '/auth/login', data),
  register:       (data) => request('POST', '/auth/register', data),
  me:             ()     => request('GET',  '/auth/me'),
  updateProfile:  (data) => request('PUT',  '/auth/profile', data),
  changePassword: (data) => request('PUT',  '/auth/password', data),

  // Tools
  getTools:   ()       => request('GET',    '/tools'),
  getTool:    (id)     => request('GET',    `/tools/${id}`),
  createTool: (data)   => request('POST',   '/tools', data),
  updateTool: (id, d)  => request('PUT',    `/tools/${id}`, d),
  deleteTool: (id)     => request('DELETE', `/tools/${id}`),

  // Reservations
  getReservations: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/reservations${qs ? '?' + qs : ''}`);
  },
  createReservation: (data) => request('POST',   '/reservations', data),
  deleteReservation: (id)   => request('DELETE', `/reservations/${id}`)
};
