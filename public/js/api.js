const API_BASE = '/api';

const Api = {
  token() {
    return localStorage.getItem('bf_token');
  },
  setToken(t) {
    localStorage.setItem('bf_token', t);
  },
  clearToken() {
    localStorage.removeItem('bf_token');
    localStorage.removeItem('bf_user');
  },
  setUser(u) {
    localStorage.setItem('bf_user', JSON.stringify(u));
  },
  getUser() {
    const raw = localStorage.getItem('bf_user');
    return raw ? JSON.parse(raw) : null;
  },
  async request(method, path, body, isForm) {
    const headers = {};
    const token = this.token();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    let options = { method, headers };
    if (body) {
      if (isForm) {
        options.body = body; // FormData: browser sets content-type
      } else {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
    }

    const res = await fetch(API_BASE + path, options);

    if (res.status === 401) {
      Api.clearToken();
      window.location.reload();
      throw new Error('Sesi berakhir, silakan login kembali.');
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/pdf') || contentType.includes('octet-stream')) {
      if (!res.ok) throw new Error('Gagal mengunduh file.');
      return res.blob();
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.');
    return data;
  },
  get(path) { return this.request('GET', path); },
  post(path, body, isForm) { return this.request('POST', path, body, isForm); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); }
};
